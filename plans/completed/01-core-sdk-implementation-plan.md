# Spaces Core SDK — Plan de Implementación

> **Decisión:** Config por workspace vive en `.spaces/config.json` dentro del `workspaceDir` del proyecto/agente (opción A).  
> **Estrategia:** No reescribir, no mover carpetas, no crear paquetes nuevos todavía. Agregar contratos y wrappers sobre el código existente.  
> **Regla dura:** cada paso deja el servidor funcionando.

---

## Contexto y acoplamiento confirmado

| Síntoma | Archivo | Línea |
|---|---|---|
| `SessionToolFactory` lee metadata vía singleton | `tool-factory.ts` | 78 |
| `metadata-store` usa `require("team-store")` lazy | `metadata-store.ts` | 69, 105 |
| `tool-factory` usa `require("team-store")` lazy | `tool-factory.ts` | 95 |
| Resolución de modelo duplicada 3 veces | `session-manager.ts` | 441-470 |
| `afterToolCall` no cableado | `session-manager.ts` | 429 |
| `EnvelopeResult` sin campo `outputs` | `shared/envelope.ts` | — |
| No existe `WorkspaceConfigPort` ni punto de carga post-resolve | — | — |

---

## Fase 0 — Contratos `~2 días`

Objetivo: crear tipos que describen lo que el sistema ya hace. Sin cambiar comportamiento.

### 0.1 `WorkspaceConfigPort`

**[NEW]** `core/ports/workspace-config.port.ts`

```ts
export interface WorkspaceConfig {
  rules?: string[];
  skills?: string[];
  workflows?: string[];
  defaultModel?: string;
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
}

export interface WorkspaceConfigPort {
  load(workspaceDir: string): Promise<WorkspaceConfig | null>;
}
```

**Ubicación del archivo en disco:** `.spaces/config.json` en el `workspaceDir` del proyecto/agente.  
Se busca solo en ese path — sin merge con niveles superiores en esta fase.

---

### 0.2 `ModelResolver`

**[NEW]** `core/ports/model-resolver.ts`

```ts
export interface ModelResolutionContext {
  sessionModel?: string;
  agentModel?: string;
  projectModel?: string;   // NUEVO
  teamModel?: string;      // NUEVO
  userDefaultModel?: string;
}

export interface ModelResolver {
  resolve(ctx: ModelResolutionContext): ResolvedModel | undefined;
}
```

Cascada: `session → agent → project → team → user → first available`.

---

### 0.3 Envelope v2

**[MODIFY]** `packages/shared/src/envelope.ts`

Agregar `outputs` opcional — backwards compatible, parseo existente no rompe:

```ts
export const EnvelopeResultSchema = z.object({
  status: z.enum(["success", "partial", "blocked", "error"]),
  executive_summary: z.string(),
  artifacts: z.string().default("none"),
  risks: z.string().default("None"),
  subagentSessionId: z.string().optional(),
  outputs: z.record(z.unknown()).optional(), // NUEVO
});
```

---

### 0.4 Cablear `afterToolCall`

**[NEW]** `core/session/after-tool-call-hook.ts`

```ts
export function createAfterToolCallHook(params: { sessionId: string; username: string }) {
  return async (_context: any): Promise<void> => {
    // stub — punto de extensión para audit log, metrics, side-effects futuros
  };
}
```

**[MODIFY]** `core/session-manager.ts` — pasar el hook a `createAgentSession`.

---

## Fase 1 — Puertos en los puntos críticos `~3 días`

### 1.1 Inyectar `WorkspaceConfigPort` en `getOrCreateSession`

**[MODIFY]** `core/session-manager.ts`

Después de `resolveSessionWorkspace` (~línea 260), antes de construir el resource loader:

```ts
const wsConfig = await workspaceConfigLoader.load(workspaceDir);
// wsConfig.rules → inyectar en appendPrompts
// wsConfig.skills → agregar a skillPaths
// wsConfig.defaultModel → usar en ModelResolver
```

> Este es el único punto donde aplica a TODOS los contextos (sesiones, delegaciones, teams) porque todos pasan por `getOrCreateSession`.

**[NEW]** `core/session/workspace-config-loader.ts` — `FileWorkspaceConfigLoader` que lee `.spaces/config.json`:

```ts
export class FileWorkspaceConfigLoader implements WorkspaceConfigPort {
  async load(workspaceDir: string): Promise<WorkspaceConfig | null> {
    const configPath = join(workspaceDir, ".spaces", "config.json");
    if (!existsSync(configPath)) return null;
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return null;
    }
  }
}

export const workspaceConfigLoader = new FileWorkspaceConfigLoader();
```

---

### 1.2 Eliminar `require()` lazy de `metadata-store.ts`

**[MODIFY]** `core/session/metadata-store.ts`

Inyectar `TeamConfigReader` vía setter post-construcción:

```ts
export interface TeamConfigReader {
  getTeamType(username: string, teamId: string): string | null;
}

class SessionMetadataStore {
  private teamReader?: TeamConfigReader;
  setTeamReader(reader: TeamConfigReader): void { this.teamReader = reader; }
}
```

**[MODIFY]** `index.ts` del server — registrar: `sessionMetadataStore.setTeamReader(teamStore)`.

---

### 1.3 `DelegationService`

Extraer lógica de orquestación de `manage-delegations-tool.ts` (~636 líneas) a un servicio.

**[NEW]** `core/delegation-service.ts`

```ts
export interface DelegationRequest {
  action: "spawn" | "delegate";
  targetType?: "agent" | "project" | "team" | "session";
  targetId?: string;
  task: string;
  model?: string;
  payload?: Record<string, unknown>;
}

export class DelegationService {
  async execute(req: DelegationRequest, ctx: SessionContext): Promise<EnvelopeResult>
}
```

**[MODIFY]** `core/tools/manage-delegations-tool.ts` — thin adapter que llama al servicio.

---

### 1.4 `DefaultModelResolver`

**[NEW]** `core/session/model-resolver.ts`

```ts
export class DefaultModelResolver implements ModelResolver {
  constructor(private registry: ModelRegistry) {}

  resolve(ctx: ModelResolutionContext): ResolvedModel | undefined {
    const chain = [
      ctx.sessionModel,
      ctx.agentModel,
      ctx.projectModel,
      ctx.teamModel,
      ctx.userDefaultModel,
    ].filter(Boolean);

    for (const modelId of chain) {
      const found = this.registry.find(modelId);
      if (found) return found;
    }
    return this.registry.getFirst();
  }
}
```

**[MODIFY]** `core/session-manager.ts` — reemplazar los 3 bloques de resolución manual.

---

## Fase 2 — Features sobre suelo firme `~3 días`

Solo empieza cuando Fase 0 y 1 estén mergeadas y estables.

### 2.1 Config por workspace funcional

El `FileWorkspaceConfigLoader` ya existe desde Fase 1. En esta fase se usa su resultado:

- `wsConfig.rules` → se append al system prompt como bloque de reglas del workspace
- `wsConfig.skills` → se cargan como skill paths adicionales
- `wsConfig.defaultModel` → entra en `ModelResolutionContext.projectModel`
- `wsConfig.permissionOverrides` → merge en `permissionEngine` para esa sesión

### 2.2 Modelo por entidad

- Agregar `defaultModel` a `project.json` (ya puede estar; solo usarlo en la cascada via `ProjectConfig`)
- Agent definition ya tiene `model`; fluye via `agentModel` en el resolver
- Team config: agregar campo `defaultModel`
- El `session-manager.ts` extrae estos valores y los pasa al `DefaultModelResolver`

### 2.3 Payload dinámico en delegaciones

- Schema de `manage_delegations` acepta `outputs?: Record<string, unknown>`
- `DelegationService` serializa `outputs` en el envelope v2
- El padre parsea `outputs` del tool result

---

## Tabla completa de archivos

### Fase 0

| Archivo | Acción |
|---|---|
| `core/ports/workspace-config.port.ts` | NEW |
| `core/ports/model-resolver.ts` | NEW |
| `packages/shared/src/envelope.ts` | MODIFY — agregar `outputs?` |
| `core/session/after-tool-call-hook.ts` | NEW |
| `core/session-manager.ts` | MODIFY — cablear `afterToolCall` |

### Fase 1

| Archivo | Acción |
|---|---|
| `core/session/workspace-config-loader.ts` | NEW |
| `core/session-manager.ts` | MODIFY — inyectar WorkspaceConfig post-resolve |
| `core/session/metadata-store.ts` | MODIFY — eliminar lazy require, inyectar TeamConfigReader |
| `core/delegation-service.ts` | NEW |
| `core/tools/manage-delegations-tool.ts` | MODIFY — thin adapter |
| `core/session/model-resolver.ts` | NEW |
| `core/session-manager.ts` | MODIFY — usar DefaultModelResolver |

### Fase 2

| Archivo | Acción |
|---|---|
| `core/session/workspace-config-loader.ts` | MODIFY — usar todos los campos |
| `core/session-manager.ts` | MODIFY — cascada de modelos por entidad |
| `core/tools/manage-delegations-tool.ts` | MODIFY — schema con `outputs` |
| `core/tools/factory-tool.ts` | MODIFY — CRUD de proyecto incluye `defaultModel` |

---

## Reglas de implementación

1. **Ningún cambio toca `agent-loop.ts`**
2. **Backward compatible siempre** — campos opcionales, no breaking changes en shared
3. **Un commit por paso** — cada paso deja el server corriendo
4. **No crear `packages/sdk-*` todavía** — eso es post-Fase 2
5. **Los `require()` lazy son deuda** — no agregar nuevos

---

## Verification por fase

| Fase | Check |
|---|---|
| 0 | `pnpm build` pasa; server arranca; tests existentes verdes |
| 1 | Crear sesión para un proyecto con `.spaces/config.json` → model correcto; teams Negotiation sin regresión |
| 2 | Delegación con `outputs` → padre recibe el campo; workspace config aplica en subagentes del mismo proyecto |
