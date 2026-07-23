# Guía de Registro de Nuevas Herramientas (Tools)

Esta guía explica paso a paso los archivos del monorepo que deben modificarse para registrar y habilitar una nueva herramienta (*tool*) desde el backend hasta el frontend.

---

## 1. Definición Compartida (Contratos)

### [`packages/shared/src/schemas.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/packages/shared/src/schemas.ts)
Añade el nombre de la herramienta al array constante `AVAILABLE_TOOLS`. Esto asegura el tipado estricto a nivel de TypeScript y la validación de esquemas Zod en la API:
```typescript
export const AVAILABLE_TOOLS = [
  // ...
  "tu_nueva_tool"
] as const;
```

---

## 2. Implementación en Backend (Server)

### A. Crear la Herramienta
Crea el archivo de la herramienta en [`apps/server/src/core/tools/`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/core/tools/). Puedes usar `factory-tool.ts` o `image-gen-tool.ts` como base. Debe exportar una función creadora que devuelva una instancia de tipo `AgentTool`.

### B. Instanciar y Registrar en la Factoría
*   [`apps/server/src/core/tools/ui-tools.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/core/tools/ui-tools.ts): Añade tu función creadora al factory de herramientas del sistema (por ejemplo, en `getUiTools` o exportando una nueva instancia).

---

## 3. Configuración y Ciclo de Vida del Agente

Para que la herramienta sea reconocida por el motor de ejecución del agente, debe registrarse en los siguientes motores del backend:

### A. Activación en Sesión
*   [`apps/server/src/core/session/tool-activation-engine.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/core/session/tool-activation-engine.ts): Añade el nombre a `alwaysOnTools` si la herramienta debe estar siempre disponible en los prompts de los agentes, o agrégala condicionalmente en `getAvailableSessionTools`.
*   [`apps/server/src/agents/create-agent-server.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/agents/create-agent-server.ts): Si es una herramienta estándar de los hilos de conversación, agrégala al array `activeToolNames`.

### B. Rutas y WebSocket
*   [`apps/server/src/routes/sessions.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/routes/sessions.ts): Añade la herramienta al array constante `ALWAYS_ON` dentro de la ruta que obtiene los estados de la sesión.
*   [`apps/server/src/ws/factory.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/ws/factory.ts): Añádela al array `ALWAYS_ON` del despachador de WebSockets para asegurar que se transmitan los eventos de actualización en tiempo real correspondientes.

### C. Sandboxing y Permisos de Subagentes
*   [`apps/server/src/core/sandbox/subagent-permissions.ts`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/server/src/core/sandbox/subagent-permissions.ts): Define si los subagentes (`spawn_subagent`) tienen permitido usarla por defecto, si requiere aprobación del usuario (`ask`), o si está prohibida (`deny`) en `DEFAULT_SUBAGENT_PERMISSIONS.rules` y `excludedTools`.

---

## 4. Visualización en Frontend (Client)

Para que el chat muestre de forma interactiva y amigable la llamada de la herramienta, actualiza el cliente:

### [`apps/client/src/components/chat/tools/ToolCallRow.tsx`](file:///c:/Users/themi/AgentWorkspace/openai-hack/apps/client/src/components/chat/tools/ToolCallRow.tsx)
1.  **Metadatos e Icono (`TOOL_META`):** Asigna un color e icono SVG para identificar la herramienta visualmente.
2.  **Resumen de Parámetros (`getArgSummary`):** Diseña un string legible que resuma los argumentos ingresados por el modelo (ej. `case "tu_tool": return args.id;`).
3.  **Resumen de Resultados (`getResultSummary`):** Define el texto resumido cuando la herramienta termina su ejecución (ej. `case "tu_tool": return "Completado";`).
4.  **Cuerpo Detallado (`ToolBody`):** Agrega un `case` para renderizar el componente detallado del resultado (puedes crear un subcomponente o formatear la salida directamente).
