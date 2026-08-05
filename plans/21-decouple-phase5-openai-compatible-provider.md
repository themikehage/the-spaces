# Hito 5: Proveedor de Modelo Unificado `OpenAICompatibleProvider` (`IModelProvider`)

> **Estado:** 📋 Planificado
> **Objetivo:** Implementar un proveedor de modelos de IA universal (`IModelProvider`) desacoplado de `ModelRegistry` que soporte streaming SSE nativo a cualquier API compatible con OpenAI `/v1/chat/completions`.

---

## 1. Contexto y Diagnóstico

Actualmente la invocación de modelos depende de `ModelRegistry` y adaptadores vendor complejos. `PLAN.md` especifica una interfaz `IModelProvider` pura con un método `streamComplete`.

## 2. Plan de Trabajo

1. **Implementar `OpenAICompatibleProvider` (`ai/providers/openai-compatible.ts`)**:
   - Conectar a cualquier endpoint `/v1/chat/completions` (OpenAI, Groq, DeepSeek, Ollama, etc.) mediante `fetch` nativo de Bun/Node.
   - Parsing manual SSE para transmitir `MessageDelta` de texto y tool calls en tiempo real.
   - Implementar la interfaz `IModelProvider`:
     ```ts
     export interface IModelProvider {
       streamComplete(opts: {
         messages: LLMMessage[];
         tools: LLMToolDefinition[];
         system: string;
         signal?: AbortSignal;
         onDelta?: (delta: MessageDelta) => void;
       }): Promise<{ content: string; toolCalls?: unknown[] }>;
     }
     ```

2. **Integrar con `AgentRuntime`**:
   - Pasar `IModelProvider` como una estrategia intercambiable en `AgentRuntime`.

---

## 3. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores**.
- `pnpm build`: **Build de producción exitoso**.
- Streaming fluido de respuestas y ejecuciones de herramientas a través de WebSocket.
