# Hito 4: Persistencia Limpia `FilesystemSessionStore` (`ISessionStore`)

> **Estado:** 📋 Planificado
> **Objetivo:** Separar la persistencia de mensajes JSONL en disco de las clases de IA, implementando la interfaz `ISessionStore` desacoplada propuesta en `PLAN.md`.

---

## 1. Contexto y Diagnóstico

La persistencia actual vive en `ai/session-persistence.ts` (`JsonlSessionStore`), combinando navegación de sesiones con lógica de formateo específica del proveedor de IA.

## 2. Plan de Trabajo

1. **Implementar `FilesystemSessionStore` (`core/filesystem-session-store.ts`)**:
   - Implementar la interfaz `ISessionStore`:
     ```ts
     export interface ISessionStore {
       createSession(id: string, metadata?: Record<string, unknown>): Promise<SessionData>;
       appendMessage(sessionId: string, message: AgentMessage): Promise<void>;
       getMessages(sessionId: string): AgentMessage[];
       listSessions(): SessionSummary[];
       deleteSession(sessionId: string): Promise<void>;
     }
     ```
   - Operaciones puras de archivos JSONL sin importaciones de modelos de IA o vendor.

2. **Inyección en `AgentRuntime`**:
   - Inyectar `ISessionStore` por constructor en `AgentRuntime`.
   - Eliminar acoplamiento directo a `session-persistence.ts`.

---

## 3. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores**.
- Pruebas de guardado, recuperación y eliminación de sesiones JSONL funcionando.
