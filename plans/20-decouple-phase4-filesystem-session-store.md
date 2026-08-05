# Hito 4: Persistencia Limpia `FilesystemSessionStore` (`ISessionStore`)

> **Estado:** ✅ Completado
> **Objetivo:** Separar la persistencia de mensajes JSONL en disco de las clases de IA, implementando la interfaz `ISessionStore` desacoplada propuesta en `PLAN.md`.

---

## 1. Visión y Meta (A dónde se quiere llegar)

Alinear la capa de almacenamiento con la arquitectura del **Paquete `storage`** descrita en `out/auto-browser/PLAN.md` (sección 3). La persistencia de mensajes y metadatos de sesión debe ser una implementación pura `ISessionStore` intercambiable (memoria o disco JSONL), independiente del runtime del agente.

---

## 2. Motivación y Por Qué (Por qué se hace este ajuste)

- **Desacoplar almacenamiento de lógica IA**: `session-persistence.ts` actualmente mezcla lectura/escritura JSONL con utilidades de mensajería del proveedor.
- **Intercambiabilidad para Tests**: Permite usar un `MemorySessionStore` en pruebas automatizadas y `FilesystemSessionStore` en producción sin tocar la lógica del agente.
- **Simplicidad**: Operaciones claras de CRUD de sesiones y append de mensajes con escrituras atómicas.

---

## 3. Plan de Trabajo Paso a Paso

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
   - Escribir registros `messages.jsonl` de forma append-only garantizando concurrencia segura.

2. **Inyección en `AgentRuntime`**:
   - Inyectar `ISessionStore` por constructor en `AgentRuntime`.
   - Eliminar el acoplamiento directo a `JsonlSessionStore` en las clases de soporte.

---

## 4. Consideraciones Anti-Regresión (Para evitar romper nada)

> [!WARNING]
> **Compatibilidad de Formato JSONL**: Las sesiones existentes grabadas en disco bajo `userDir/sessions/` deben leerse correctamente. El esquema de serialización de mensajes debe ser 100% compatible con el historial guardado.

> [!IMPORTANT]
> **Bloqueo y Concurrencia de Archivos**: Múltiples escrituras simultáneas (ej: streaming de mensajes y ejecución de subagentes) no deben corromper el archivo `.jsonl`. Mantener el patrón append-only o escrituras sincrónicas/bloqueantes por línea.

---

## 5. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores de compilación**.
- Pruebas de guardado, recuperación y lectura de sesiones JSONL históricas verificadas.
