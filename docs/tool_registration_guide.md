# Guía de Registro de Nuevas Herramientas (Tools)

Esta guía explica el flujo único y centralizado para registrar y habilitar una nueva herramienta (_tool_) en **Spaces**, desde el catálogo unificado compartible hasta la visualización en el cliente.

---

## 1. Registro en el Catálogo Único (SSOT)

### [`packages/shared/src/tools-catalog.ts`](file:///c:/Users/themi/AgentWorkspace/the-spaces/packages/shared/src/tools-catalog.ts)

Añade el nombre de la herramienta a `AVAILABLE_TOOLS` y asignala a un grupo en `TOOL_GROUPS` (o al array `DEFAULT_ALWAYS_ON_TOOLS` si debe estar disponible siempre por defecto):

```typescript
export const AVAILABLE_TOOLS = [
  // ...
  "tu_nueva_tool",
] as const;

export const TOOL_GROUPS = {
  // ...
  factory: ["manage_factory", "manage_custom_tools", "tu_nueva_tool"],
} as const;
```

> **Nota**: `packages/shared/src/schemas.ts` re-exporta automáticamente el catálogo, por lo que las validaciones Zod y tipos TypeScript se actualizan sin duplicar listas.

---

## 2. Implementación en Backend (Server)

### A. Crear la Herramienta

Crea la implementación de la herramienta en [`apps/server/src/core/tools/`](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/tools/). Hereda de `BaseTool` o implementa la interfaz estándar de herramienta.

### B. Registrar en la Factoría de Herramientas

Registra la instancia en [`apps/server/src/core/session/tool-factory.ts`](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/tool-factory.ts) para que sea construida durante el bootstrap de la sesión.

---

## 3. Bootstrap y Activación de Herramientas

No es necesario editar listas hardcodeadas en las rutas HTTP ni en los sockets WebSocket. Todos los entrypoints (`session-manager`, `create-agent-server`, `manage-delegations`) utilizan **`SessionBootstrap`**, el cual resuelve automáticamente las herramientas activas consumiendo el catálogo centralizado.

---

## 4. Visualización en Frontend (Client)

Para que el chat muestre visualmente las ejecuciones de la herramienta:

### [`apps/client/src/components/chat/tools/ToolCallRow.tsx`](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/client/src/components/chat/tools/ToolCallRow.tsx)

1. **Metadatos e Icono (`TOOL_META`):** Asigna un color e icono SVG.
2. **Resumen de Parámetros (`getArgSummary`):** Diseña un resumen corto de los argumentos recibidos.
3. **Resumen de Resultados (`getResultSummary`):** Define el texto descriptivo del resultado.
