# Hito 5: Proveedor de Modelo Unificado `OpenAICompatibleProvider` (`IModelProvider`)

> **Estado:** ✅ Completado
> **Objetivo:** Implementar un proveedor de modelos de IA universal (`IModelProvider`) desacoplado de `ModelRegistry` que soporte streaming SSE nativo a cualquier API compatible con OpenAI `/v1/chat/completions`.

---

## 1. Visión y Meta (A dónde se quiere llegar)

Cumplir con la sección **2.1 El Agente es Composición** y **Sección 3 Packages/providers** de `out/auto-browser/PLAN.md`. El runtime no debe estar atado a SDKs propietarios de proveedores ni a registros monolíticos. Debe recibir un `IModelProvider` abstracto capaz de streamear completions e invocar herramientas usando protocolos estándar HTTP/SSE.

---

## 2. Motivación y Por Qué (Por qué se hace este ajuste)

- **Soporte Universal de LLMs**: Un solo proveedor compatible con OpenAI permite conectar Groq, DeepSeek, OpenAI, Ollama, Anthropic (vía proxy OpenAI-compat) o cualquier LLM local/remoto sin cambiar una sola línea de código.
- **Sin Dependencias de Vendedores**: `fetch` nativo de Bun/Node sin SDKs externos pesados ni parches del vendor.
- **Streaming de Deltas Limpio**: Emitir deltas de texto y llamadas a herramientas tipadas directamente al ciclo del agente.

---

## 3. Plan de Trabajo Paso a Paso

1. **Implementar `OpenAICompatibleProvider` (`ai/providers/openai-compatible.ts`)**:
   - Conectar a cualquier endpoint `/v1/chat/completions` mediante `fetch` nativo.
   - Parsear respuestas Server-Sent Events (`data: { choices: [...] }`) y emitir eventos `MessageDelta`.
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

2. **Integración Inyectable con `AgentRuntime`**:
   - Pasar `IModelProvider` como una estrategia intercambiable por constructor en `AgentRuntime`.

---

## 4. Consideraciones Anti-Regresión (Para evitar romper nada)

> [!WARNING]
> **Streaming de Tool Calls Parciales**: Durante la transmisión SSE, las llamadas a herramientas vienen fragmentadas (`delta.tool_calls[0].function.arguments`). Asegurar el ensamblado correcto del JSON final antes de pasarlo a `IToolExecutor`.

> [!IMPORTANT]
> **Autenticación e Historial**: Preservar la resolución de API keys y headers personalizados (`authStorage`) para que los proveedores existentes (OpenAI, Anthropic, Groq, Ollama) sigan funcionando sin re-configurar la UI.

---

## 5. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores de compilación**.
- `pnpm build`: **Build de producción exitoso**.
- Streaming fluido de respuestas y ejecuciones de herramientas verificado a través de WebSocket.
