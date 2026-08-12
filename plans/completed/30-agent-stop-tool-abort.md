# Plan 30 — Fix: Botón "Detener" no aborta tools en vuelo

**Estado:** 🔜 Pendiente de implementar — análisis completado

## Síntoma

Mientras el agente está esperando devolver el resultado de una tool (generación de vídeo/imagen, MCP, delegación, bash largo), pulsar "Detener" (stop) no tiene efecto: el agente sigue "streaming" en la UI.

## Flujo del stop (estado actual)

1. Cliente: `apps/client/src/hooks/useChatAreaState.ts` → `send({ type: "abort", sessionId })`.
2. Servidor: `apps/server/src/ws/factory.ts:581` → `session.abort()` → `AgentSession.abort()` (`apps/server/src/core/session/agent-session.ts:682`).
3. `NavigationController.abort()` (`apps/server/src/core/session/navigation-controller.ts:29`):
   - `agent.abort()` → aborta el `AbortController` interno del run del engine vendor.
   - **`await agent.waitForIdle()`** ← se cuelga aquí (espera a que el run completo se asiente).
   - Recién después: `abortController.abort()` y `delegationRegistry.abortAllForParentSession()`.

## Causa raíz (2 problemas combinados)

### 1. El loop del agente `await` la promesa de la tool sin competencia contra el signal

En `apps/server/src/vendor/agent/src/agent-loop.ts` — `executePreparedToolCall` (línea 681):

```ts
const result = await prepared.tool.execute(prepared.toolCall.id, prepared.args, signal, ...);
```

No hay ningún `Promise.race` con `signal.aborted` ni listener de abort durante la ejecución de una tool. Si la tool no observa el signal, su promesa nunca se asienta → `runAgentLoop` nunca termina → `waitForIdle()` queda bloqueado indefinidamente.

Verificado: no existe `Promise.race`/`signal.addEventListener` en `vendor/agent/src/` para el path de tools (solo en `proxy.ts:153` para streaming LLM y en `before-tool-call-hook.ts:99` para el approval).

### 2. `waitForIdle()` corre ANTES de abortar sesión y subagentes

En `navigation-controller.ts:32`, `await agent.waitForIdle()` está antes de `abortController.abort()` y de `registry.abortAllForParentSession()`. Como `waitForIdle` cuelga, la propagación del abort a delegaciones (que mataría a los subagentes) nunca se ejecuta.

## Tools que ignoran el signal (las "lentas" afectadas)

| Tool | Archivo | Problema |
|---|---|---|
| `generate_video` | `apps/server/src/core/tools/extensions/video-gen.tool.ts` | `execute: async (toolCallId, args)` NO acepta el signal. Polling de hasta 3 min (`while` + `new Promise(setTimeout 5000)` + `fetch` sin signal). |
| `generate_image` | `apps/server/src/core/tools/extensions/image-gen.tool.ts` | Ídem: `execute` sin signal, `fetch` sin abort. |
| MCP | `apps/server/src/core/mcp/mcp-client.ts` (`callTool`, `pendingRequests`) | El request pendiente solo se resuelve cuando responde el server MCP; no hay abort por tool (solo al desconectar el transporte). Puede colgar indefinido. |
| Delegaciones | `spawn-subagent.ts` / `manage-delegations.tool.ts` | Abort-aware vía `AbortToken`, pero dependen del punto 2 (propagación tras `waitForIdle`). |

Las tools base (bash/read/write/grep/find/edit/ls, web-fetch, deep-research) sí propagan el signal y abortan correctamente.

## Efecto secundario que empeora la UX

Aun con tools abortables, tras el abort del lote en `executeToolCalls` se hace `break`, pero `runLoop` (`agent-loop.ts:156-284`) no comprueba `signal.aborted` al inicio del loop interno → el run mete **una ronda extra** de LLM (falla al instante por signal ya abortado) antes de emitir `agent_end` y devolver `{ type: "aborted" }` al cliente (lo que desactiva el spinner).

## Plan de fix

1. **Engine (fix global, cubre todas las tools):** en `executePreparedToolCall` (+ path paralelo) hacer `Promise.race` entre `tool.execute(...)` y una promesa que resuelva al hacer `signal.addEventListener("abort")` → devolver `createErrorToolResult("Operation aborted")`. Añadir `if (signal?.aborted) return/break` al inicio del loop interno de `runLoop` y tras el `Promise.all` en `executeToolCallsParallel`.
2. **Propagación:** en `navigation-controller.ts` mover `abortController.abort()` y `registry.abortAllForParentSession()` ANTES de `await agent.waitForIdle()` (o limitar ese await con un timeout), para que matar subagentes no dependa de que el run padre asiente.
3. **Tools concretas:** `createVideoGenTool`/`createImageGenTool` deben aceptar y observar el `ctx.signal` (romper el polling y abortar el fetch con signal); en `mcp-client` rechazar el `pendingRequest` del tool call al abortar.
4. **Tests:** añadir un test que demuestre que una tool mock que "no resuelve" se corta al emitir el abort (cubre el punto 1 y previene regresión).

## Archivos implicados

- `apps/server/src/vendor/agent/src/agent-loop.ts`
- `apps/server/src/core/session/navigation-controller.ts`
- `apps/server/src/core/tools/extensions/video-gen.tool.ts`
- `apps/server/src/core/tools/extensions/image-gen.tool.ts`
- `apps/server/src/core/mcp/mcp-client.ts`