# Hito 3: Eliminación de Duplicaciones y Componentes Reutilizables

> **Estado:** 📋 Planificado
> **Objetivo:** Auditar y eliminar duplicaciones estructurales en hooks, componentes, patrones de formulario, eventos y almacenamiento local. Crear abstracciones reutilizables donde el retorno de inversión lo justifique.

---

## 1. Visión y Meta

El frontend tiene 4 categorías de duplicación que vamos a eliminar:

1. **Modales**: 9+ modales con patrón idéntico pero sin abstracción compartida
2. **Hooks CRUD**: `useAgents` y `useTeams` son estructuralmente idénticos
3. **Event bus**: 43 `dispatchEvent("entity-updated")` dispersos sin tipado ni centralización
4. **Formularios**: Estado, validación y error handling duplicados en 5+ settings forms

### Regla innegociable

**DRY con criterio**: Solo extraemos si el código se repite 3+ veces con la misma estructura. Abstracciones prematuras generan más deuda que el código duplicado.

---

## 2. Motivación

- **Mantenibilidad**: Un cambio en el patrón de modales (ej: accesibilidad, animación) se propaga a 9+ archivos hoy.
- **Tipado**: `dispatchEvent("entity-updated")` no tiene contrato — cualquier consumer puede romperse silenciosamente.
- **Testing**: Abstracciones compartidas se testean una vez. Hoy cada modal/hook/form repite bugs similares.

---

## 3. Plan de Trabajo

### Fase 1: Sistema de modales unificado

**Problema**: 9+ modales (`RegisterModal`, `GlobalAgentSettingsModal`, `ProjectCreateModal`, `ProjectSettingsModal`, `TeamCreateModal`, `TeamSettingsModal`, `TeamMembersModal`, `TeamContextModal`, `MCPCustomForm`) siguen el mismo patrón:

```tsx
{ open, onClose } → <Modal open={open} onClose={onClose}> → formulario inline → footer con botones
```

**3.1. Crear `components/ui/Dialog.tsx`** (wrapper semántico sobre `Modal.tsx`)

```tsx
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}
```

**3.2. Crear `components/ui/FormDialog.tsx`** (para modales con formulario)

Props:

- `onSubmit: () => Promise<void> | void`
- `submitLabel?: string`
- `isSubmitting?: boolean`
- `isDirty?: boolean` (previene cierre accidental)
- `children` (campos del formulario)

Maneja:

- Prevención de doble submit
- Confirmación de cierre si hay cambios sin guardar
- Estado de loading en el botón submit
- Tecla Escape + click outside

**3.3. Migrar modales existentes** uno por uno a usar `Dialog` o `FormDialog`:

1. `ProjectAssignmentModal.tsx` (23 líneas, el más simple → prueba piloto)
2. `TeamContextModal.tsx`
3. `ProjectCreateModal.tsx`
4. `TeamCreateModal.tsx`
5. `agents/RegisterModal.tsx`
6. `agents/GlobalAgentSettingsModal.tsx`
7. `ProjectSettingsModal.tsx`
8. `TeamSettingsModal.tsx`
9. `TeamMembersModal.tsx`

### Fase 2: Hook genérico de CRUD de entidades

**Problema**: `useAgents` y `useTeams` comparten la misma estructura: fetch + create + update + delete + avatar upload + dispatch event.

**3.4. Crear `lib/api/entity-service.ts`** — interfaz genérica:

```typescript
interface EntityService<T, CreateInput, UpdateInput> {
  fetchAll(): Promise<T[]>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}
```

**3.5. Revisar si crear `hooks/useEntityCrud.ts`**

Evaluar trade-off: un hook genérico reduce duplicación pero puede ser menos legible que dos hooks específicos y delgados. Si tras Hito 1 los hooks `useAgents` y `useTeams` ya son orquestadores finos que solo delegan al servicio, la duplicación residual es trivial (~50 líneas cada uno) y **no justifica** un hook genérico. Decisión final post-Hito 1.

**3.6. Extraer `hooks/useAvatarUpload.ts`**

Hook genérico para upload/delete de avatar:

```typescript
function useAvatarUpload(
  uploadFn: (id: string, file: File) => Promise<string>,
  deleteFn: (id: string) => Promise<void>,
) {
  return { uploadAvatar, deleteAvatar, isUploading, error };
}
```

### Fase 3: Event Bus centralizado

**Problema**: 43 `window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "X" } }))` dispersos. Sin contrato tipado, sin forma de trackear quién emite y quién consume.

**3.7. Crear `lib/event-bus.ts`**

```typescript
type EntityEventType =
  "agent" | "team" | "project" | "session" | "config" | "skill" | "custom-tool";

interface EntityUpdatedEvent {
  type: EntityEventType;
  id?: string;
  action: "created" | "updated" | "deleted";
}

export const EntityEventBus = {
  emit(event: EntityUpdatedEvent): void {
    window.dispatchEvent(new CustomEvent("entity-updated", { detail: event }));
  },
  subscribe(handler: (event: EntityUpdatedEvent) => void): () => void {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener("entity-updated", listener);
    return () => window.removeEventListener("entity-updated", listener);
  },
};
```

**3.8. Migrar emisores**: Reemplazar todos los `dispatchEvent` inline por `EntityEventBus.emit(...)`.

**3.9. Migrar consumidores**: Reemplazar `addEventListener("entity-updated")` por `EntityEventBus.subscribe(...)`.

### Fase 4: localStorage tipado

**Problema**: 43 `localStorage.getItem`/`setItem`/`removeItem` con keys hardcodeados en 15 archivos.

**3.10. Crear `lib/storage.ts`**

```typescript
const STORAGE_KEYS = {
  token: "token",
  activeProjectId: "active-project-id",
  activeProjectName: "active-project-name",
  activeAgent: "active-agent",
  activeTeam: "active-team",
  hasContext: "has-context",
  settingsActiveTab: "settings-active-tab",
  theme: "theme",
  navStackMobile: "nav-stack-mobile",
  selectedModel: "crewfy-selected-model",
  recentModels: "pi-recent-models",
  exaSearchActive: "exa-search-global-active",
  locale: "locale",
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | `pending-prompt-${string}`;

export const storage = {
  get(key: StorageKey): string | null {
    return localStorage.getItem(key);
  },
  set(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
  },
  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  },
  getJSON<T>(key: StorageKey): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  setJSON<T>(key: StorageKey, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
```

**3.11. Migrar usos**: Reemplazar gradualmente los `localStorage.getItem(...)` por `storage.get(...)`.

**3.12. Crear `hooks/useLocalStorage.ts`** para casos donde se necesita reactividad:

```typescript
function useLocalStorage<T>(key: StorageKey, defaultValue: T): [T, (value: T) => void];
```

### Fase 5: Primitivas de formularios reutilizables

**Problema**: `GeneralTab`, `ProvidersTab`, `EnvVarsTab`, `MCPCustomForm`, `ScheduleJobDialog` — todos implementan su propio manejo de estado de formulario, validación y errores.

**3.13. Crear `components/ui/FormField.tsx`**

Props: `label`, `error`, `hint`, `required`, `children`

Maneja: layout consistente de label + input + mensaje de error + hint, espaciado, estados focus/error.

**3.14. Crear `components/ui/FormSection.tsx`**

Props: `title`, `description`, `children`

Maneja: sección colapsable/expandible con título y descripción, usada en settings.

**3.15. Migrar formularios existentes** a usar `FormField` y `FormSection` progresivamente:

1. `EnvVarsTab.tsx` (371 líneas, relativamente aislado)
2. `ProvidersTab.tsx` (384 líneas)
3. `MCPCustomForm.tsx` (438 líneas)
4. `GeneralTab.tsx` (ya descompuesto en Hito 2, migrar sub-secciones)

### Fase 6: Keyboard shortcuts reutilizables

**3.16. Extraer `hooks/useEscapeKey.ts`**

```typescript
function useEscapeKey(onEscape: () => void, enabled?: boolean): void;
```

Reemplazar `window.addEventListener("keydown", ...)` manual en `SkillsPopover`, `ToolsPopover`, `ImageGrid`.

**3.17. Extraer `hooks/useClickOutside.ts`**

```typescript
function useClickOutside(ref: RefObject<HTMLElement>, onClickOutside: () => void): void;
```

---

## 4. Consideraciones Anti-Regresión

> [!WARNING]
> **Abstracciones con escape hatch**: `Dialog`, `FormDialog`, `FormField` deben permitir overrides vía `className` y `style`. Si un modal necesita comportamiento atípico, debe poder componerse manualmente sobre `Modal.tsx` sin estar forzado a usar `Dialog`.

> [!IMPORTANT]
> **EventBus compatibilidad**: El `EntityEventBus` mantiene el mismo `CustomEvent("entity-updated")` subyacente para no romper consumidores que no se migren en esta fase. Es un wrapper tipado, no un reemplazo de mecanismo.

> [!CAUTION]
> **No abstraer sin necesidad**: Si tras Hito 1 y 2 la duplicación residual es ≤ 20 líneas por archivo, no se justifica extraer. Ej: si `useAgents` y `useTeams` quedan en 50 líneas cada uno delegando a servicios, un `useEntityCrud` genérico aporta más complejidad que valor.

---

## 5. Criterios de Verificación

| Criterio               | Verificación                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Modales unificados** | Los 9 modales usan `Dialog` o `FormDialog` (o documentan por qué no)                                     |
| **Event bus**          | `rg "dispatchEvent\(new CustomEvent\(\"entity-updated\""` → 0 resultados (solo dentro de `event-bus.ts`) |
| **localStorage**       | `rg "localStorage\.(getItem                                                                              | setItem | removeItem)" apps/client/src --include '_.ts' --include '_.tsx'`→ solo en`lib/storage.ts`y`hooks/useLocalStorage.ts` |
| **Keyboard**           | `rg "window\.addEventListener\(\"keydown\""` → solo en `useEscapeKey.ts`                                 |
| **Form fields**        | `FormField` usado en ≥ 4 formularios; `FormSection` usado en ≥ 3 settings tabs                           |
| **Compilación**        | `pnpm --filter client run typecheck` → 0 errores                                                         |
| **Build**              | `pnpm --filter client run build` → exitoso                                                               |
| **Sin nuevos >500**    | Ningún nuevo componente creado en este hito supera 500 líneas                                            |

---

## 6. Archivos Afectados

### Creaciones

| Archivo                         | Propósito                                      |
| ------------------------------- | ---------------------------------------------- |
| `components/ui/Dialog.tsx`      | Wrapper de modal con header/footer/descripción |
| `components/ui/FormDialog.tsx`  | Modal con formulario, submit, dirty-check      |
| `components/ui/FormField.tsx`   | Campo de formulario con label + error + hint   |
| `components/ui/FormSection.tsx` | Sección colapsable de formulario               |
| `hooks/useAvatarUpload.ts`      | Hook genérico de upload/delete de avatar       |
| `hooks/useEscapeKey.ts`         | Hook de tecla Escape                           |
| `hooks/useClickOutside.ts`      | Hook de click outside                          |
| `hooks/useLocalStorage.ts`      | Hook reactivo de localStorage                  |
| `lib/event-bus.ts`              | EventBus tipado para entity-updated            |
| `lib/storage.ts`                | Servicio tipado de localStorage                |

### Modificaciones

| Archivo                               | Cambio                                          |
| ------------------------------------- | ----------------------------------------------- |
| `components/ui/Modal.tsx`             | Posible extensión para soportar `size` prop     |
| `agents/RegisterModal.tsx`            | Migrar a FormDialog                             |
| `agents/GlobalAgentSettingsModal.tsx` | Migrar a FormDialog                             |
| `projects/ProjectCreateModal.tsx`     | Migrar a FormDialog                             |
| `projects/ProjectSettingsModal.tsx`   | Migrar a FormDialog                             |
| `projects/ProjectAssignmentModal.tsx` | Migrar a Dialog                                 |
| `teams/TeamCreateModal.tsx`           | Migrar a FormDialog                             |
| `teams/TeamSettingsModal.tsx`         | Migrar a FormDialog                             |
| `teams/TeamMembersModal.tsx`          | Migrar a FormDialog                             |
| `teams/TeamContextModal.tsx`          | Migrar a FormDialog                             |
| `mcp/MCPCustomForm.tsx`               | Usar FormField + FormSection                    |
| `settings/EnvVarsTab.tsx`             | Usar FormField + FormSection                    |
| `settings/ProvidersTab.tsx`           | Usar FormField + FormSection                    |
| `settings/GeneralTab.tsx`             | Usar FormField + FormSection (en sub-secciones) |
| `hooks/useAgents.ts`                  | Usar EntityEventBus.emit + useAvatarUpload      |
| `hooks/useTeams.ts`                   | Usar EntityEventBus.emit + useAvatarUpload      |
| `hooks/useEntityConfig.ts`            | Usar EntityEventBus.emit                        |
| `hooks/useEntitySkills.ts`            | Usar EntityEventBus.emit                        |
| `hooks/useEntityCustomTools.ts`       | Usar EntityEventBus.emit                        |
| `contexts/AuthContext.tsx`            | Usar `storage`                                  |
| `contexts/SessionsContext.tsx`        | Usar EntityEventBus.subscribe                   |
| `chat/SkillsPopover.tsx`              | Usar useEscapeKey + useClickOutside             |
| `chat/ToolsPopover.tsx`               | Usar useEscapeKey + useClickOutside             |
| `chat/ImageGrid.tsx`                  | Usar useEscapeKey                               |
