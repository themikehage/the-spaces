# Unificación Final de Entidades: Agent como Single Source of Truth

**Backend Rules aplicadas**: Regla 1 (Ports First), Regla 2 (DI via ServerContext), Regla 7 (Tipos compartidos en `packages/shared`).

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

### 1.1 Fragmentación de Schemas en `packages/shared`

| Símbolo | Archivo | Línea | Problema |
|---|---|---|---|
| `AgentScopeTargetSchema` | `schemas.ts` | L248–L259 | Discriminated union manual paralela a `AgentTypeSchema`. Solo usada en `AgentDefinition.scope` (campo `@deprecated`) y en `routes/agents.ts` L249. |
| `ToolScopeTargetSchema` | `schemas.ts` | L937–L947 | Segunda discriminated union manual con los mismos 9 literales que `AgentTypeSchema`. Duplicación completa. |
| `EntityTypeSchema` | `schemas.ts` | L898 | Derivado con `.extract().or(z.literal("agent"))`, exponiendo el alias `"agent"` fuera de `AgentTypeSchema`, creando divergencia semántica. |
| `PromptPreviewRequestSchema` | `schemas.ts` | L876–L883 | Acepta `agentId`, `projectId`, `teamId`, `subagentId` como cuatro campos opcionales separados en lugar de un único `AgentRef`. |

### 1.2 Condicionales `entityType === "..."` en Rutas y Servicios

| Archivo | Línea(s) | Condicional |
|---|---|---|
| `routes/config.ts` | L88–L93 | Ternario manual para construir `entityRef` antes de `cascadeConfigLoader.load`. |
| `core/session/spawn-subagent.ts` | L88–L96 | `if (parentMeta.agentId) ... else if (parentMeta.projectId)` para derivar `parentEntityType` como string sin tipo. |
| `core/tools/extensions/manage-delegations.tool.ts` | L174–L182 | Bloque `if/else if` idéntico al de `spawn-subagent.ts`. |

### 1.3 `TeamStore` — Persistencia Legacy Paralela al `AgentRegistry`

**`teamStore` (singleton) importado directamente en 9 lugares**:

| Archivo | Capa | Operaciones |
|---|---|---|
| `routes/teams.ts` | Route | `getTeam`, `listTeams`, `createTeam`, `updateTeam`, `deleteTeam`, `updateMembers`, `appendMessage`, `getMessages` (30+ llamadas) |
| `teams/team-prompt-runner.ts` | Service | `getTeam` |
| `teams/team-orchestrator.ts` | Service | `getTeam` (×2) |
| `teams/orchestration/orchestration-runner.ts` | Service | `getTeam`, `appendMessage` (×2) |
| `__tests__/team-type.test.ts` | Test | `createTeam`, `getTeam`, `updateTeam`, `listTeams` |
| `__tests__/create-user-session.test.ts` | Test | `getTeam` (×4, via spy) |

`TeamStore` mantiene su propia lógica de persistencia (`teams/*.json`) independiente de `AgentRegistry` (`agents/*/definition.json`). Una entidad `team` existe en ambos sistemas simultáneamente tras la migración.

### 1.4 Resolución de Configuración con Tupla Fragmentada

`cascadeConfigLoader.load()` acepta `{ agentId?, projectId?, teamId? }` en lugar de `AgentRef`. Tres callsites con esta firma:

| Archivo | Línea | Forma actual |
|---|---|---|
| `routes/config.ts` | L96 | `entityRef` construido con condicionales manuales |
| `routes/sessions/session-crud.ts` | L104 | `{ agentId, projectId, teamId }` literal |
| `core/session/agent-runtime.ts` | L142 | `{ ... }` fragmentado |

### 1.5 Hooks del Frontend con Soporte Dual

| Archivo | Línea | Problema |
|---|---|---|
| `hooks/useEntityConfig.ts` | L8–L10 | Acepta `AgentRef \| EntityType` con conversión `as any`. |
| `hooks/useEntitySkills.ts` | L9–L11 | Mismo patrón. Pasa `agentRefOrType as any` a `useEntityConfig`. |

### 1.6 Puerto `IAgentRegistry` con Tipo Deprecado

`core/ports/agent-registry.port.ts` L20 declara `register(..., scope?: AgentScopeTarget)` usando el tipo deprecado `AgentScopeTarget`.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

Criterios **binarios y verificables automáticamente**. La implementación está completa cuando todos son `true`.

### 2.A Cleanup de Schemas (`packages/shared`)

- [ ] **A1** — `ToolScopeTargetSchema` es una derivación de `AgentTypeSchema`, no una discriminated union manual.
- [ ] **A2** — `AgentScopeTargetSchema` y `AgentScopeTarget` son eliminados. Cero referencias en toda la codebase.
- [ ] **A3** — `PromptPreviewRequestSchema` acepta `agentRef: AgentRefSchema` en lugar de la tupla de 4 IDs.
- [ ] **A4** — `pnpm --filter shared run typecheck` → exit code 0.

### 2.B Desacoplamiento de `CascadeConfigLoader`

- [ ] **B1** — `cascadeConfigLoader.load()` acepta `(username: string, ref: AgentRef)` como única firma.
- [ ] **B2** — `routes/config.ts` construye `AgentRef` directamente, sin condicionales `entityType === "..."`.
- [ ] **B3** — `routes/sessions/session-crud.ts` y `core/session/agent-runtime.ts` pasan `AgentRef`.
- [ ] **B4** — `pnpm --filter server run typecheck` → exit code 0.

### 2.C Eliminación de Condicionales de Tipo en Servicios y Herramientas

- [ ] **C1** — `core/session/spawn-subagent.ts` no contiene `if (parentMeta.agentId) ... else if (parentMeta.projectId)`.
- [ ] **C2** — `core/tools/extensions/manage-delegations.tool.ts` no contiene el mismo patrón.
- [ ] **C3** — Cero strings literales `parentEntityType = "agent"` o `parentEntityType = "project"` construidos ad-hoc.

### 2.D Eliminación de `TeamStore` como Fuente de Definición

- [ ] **D1** — `AgentRegistry` expone `getTeamDefinition(username, teamId)` y `listTeamDefinitions(username)`.
- [ ] **D2** — `routes/teams.ts` usa `agentRegistry` para CRUD de equipos. Cero imports de `teamStore` para operaciones de definición.
- [ ] **D3** — `team-prompt-runner.ts`, `team-orchestrator.ts` y `orchestration-runner.ts` obtienen `AgentDefinition` desde `agentRegistry.getTeamDefinition`.
- [ ] **D4** — `TeamStore.appendMessage` y `TeamStore.getMessages` se mantienen para histórico de mensajes (no son definición de entidad).
- [ ] **D5** — `pnpm --filter server run typecheck` y `pnpm --filter server test` → exit code 0.

### 2.E Puerto Limpio (`IAgentRegistry`)

- [ ] **E1** — `IAgentRegistry.register` declara `scope?: AgentRef` en lugar de `scope?: AgentScopeTarget`.
- [ ] **E2** — Ningún puerto en `core/ports/` importa `AgentScopeTarget`.

### 2.F Frontend Consolidado

- [ ] **F1** — `useEntityConfig` acepta únicamente `agentRef: AgentRef`. Sin overload `AgentRef | EntityType`.
- [ ] **F2** — `useEntitySkills` acepta únicamente `agentRef: AgentRef`. Sin `as any`.
- [ ] **F3** — Cero ocurrencias de `as any` relacionadas con `entityType` en ambos hooks.
- [ ] **F4** — `pnpm --filter client run typecheck` → exit code 0.

### 2.G Verificación Integral de Sistema

- [ ] **G1** — `pnpm --filter shared run typecheck` → exit code 0.
- [ ] **G2** — `pnpm --filter server run typecheck` → exit code 0.
- [ ] **G3** — `pnpm --filter server test` → exit code 0, sin tests rotos.
- [ ] **G4** — `pnpm --filter client run typecheck` → exit code 0.
- [ ] **G5** — `pnpm build` → exit code 0 en todos los workspaces.

---

## 3. Hitos Innegociables

Los hitos se ejecutan en orden estricto. **Cada hito termina con su verificación automatizable antes de comenzar el siguiente.**

---

### Hito 1: Cleanup de Schemas en `packages/shared`

**Responsabilidad**: Establecer `AgentTypeSchema` como única fuente de literales de tipo. Eliminar duplicaciones.

**Artefactos**:

1. **MODIFICAR** `packages/shared/src/schemas.ts`
   - Eliminar `AgentScopeTargetSchema` (L248–L258) y `AgentScopeTarget` (L259).
   - Eliminar el campo `scope: AgentScopeTargetSchema.optional()` de `AgentDefinitionSchema` (L272).
   - Reemplazar `ToolScopeTargetSchema` (L937–L947) por una construcción derivada de `AgentTypeSchema.options`.
   - Reemplazar `PromptPreviewRequestSchema` para incluir `agentRef: AgentRefSchema` en lugar de la tupla de 4 IDs.
   - Exportar `AgentRefSchema = z.object({ type: AgentTypeSchema, id: z.string() })` desde `schemas.ts`.

2. **MODIFICAR** `packages/shared/src/agent-capabilities.ts`
   - Verificar que `AgentRef` como tipo TypeScript se exporta consistentemente desde `shared` (actualmente solo existe en `agent-type-registry.port.ts` como interfaz local).

3. **MODIFICAR** `apps/server/src/routes/agents.ts` (L249)
   - Reemplazar `AgentScopeTargetSchema` en el validador por `AgentRefSchema` o eliminar el endpoint si es legacy.

**Verificación del Hito 1**:
```bash
grep -rn "AgentScopeTargetSchema\|AgentScopeTarget" packages/shared/src/ apps/
# Debe producir CERO líneas.

grep -rn "ToolScopeTargetSchema" packages/shared/src/schemas.ts
# Solo debe aparecer la nueva definición derivada.

pnpm --filter shared run typecheck
# Exit code 0.
```

---

### Hito 2: Firma Única en `CascadeConfigLoader` y Rutas de Configuración

**Responsabilidad**: Eliminar la tupla `{ agentId?, projectId?, teamId? }` y unificar en `AgentRef`.

**Artefactos**:

1. **MODIFICAR** `apps/server/src/core/config/cascade-config-loader.ts`
   - Cambiar firma del método `load` a `(username: string, ref: AgentRef): Promise<EntityConfig>`.
   - Internamente, usar `ref.type` y `ref.id` para la resolución de cascada.

2. **MODIFICAR** `apps/server/src/routes/config.ts` (L88–L93)
   - Eliminar el bloque ternario. Construir `AgentRef` directamente:
     ```ts
     const ref: AgentRef = { type: parsedType.data, id: entityId };
     const resolved = await cascadeConfigLoader.load(username, ref);
     ```

3. **MODIFICAR** `apps/server/src/routes/sessions/session-crud.ts` (L104)
   - Pasar `AgentRef` al `cascadeConfigLoader.load`.

4. **MODIFICAR** `apps/server/src/core/session/agent-runtime.ts` (L142)
   - Pasar `AgentRef` al `cascadeConfigLoader.load`.

**Verificación del Hito 2**:
```bash
grep -rn "{ agentId\|{ projectId\|{ teamId" apps/server/src/routes/config.ts apps/server/src/routes/sessions/session-crud.ts apps/server/src/core/session/agent-runtime.ts
# Debe producir CERO líneas.

grep -rn "entityType ===" apps/server/src/routes/config.ts
# Debe producir CERO líneas.

pnpm --filter server run typecheck
# Exit code 0.
```

---

### Hito 3: Eliminar Condicionales de Tipo en Subagentes y Herramientas de Delegación

**Responsabilidad**: Reemplazar la derivación manual de `parentEntityType` por `AgentRef`.

**Artefactos**:

1. **NUEVO** `apps/server/src/core/session/resolve-parent-ref.ts`
   - Función pura `resolveParentRef(parentMeta: SessionMetadata): AgentRef` que encapsula la resolución del tipo de entidad padre.

2. **MODIFICAR** `apps/server/src/core/session/spawn-subagent.ts` (L88–L96)
   - Eliminar bloque `let parentEntityType = "global"; if (parentMeta.agentId) ...`.
   - Usar `resolveParentRef(parentMeta)` para obtener `parentRef: AgentRef`.

3. **MODIFICAR** `apps/server/src/core/tools/extensions/manage-delegations.tool.ts` (L174–L182)
   - Aplicar la misma función `resolveParentRef`.

**Verificación del Hito 3**:
```bash
grep -rn "parentEntityType = \"agent\"\|parentEntityType = \"project\"\|parentEntityType = \"global\"" apps/server/src/
# Debe producir CERO líneas.

grep -rn "if (parentMeta.agentId\|else if (parentMeta.projectId" apps/server/src/
# Debe producir CERO líneas.

pnpm --filter server run typecheck
pnpm --filter server test
# Ambos exit code 0.
```

---

### Hito 4: `AgentRegistry` como Única Fuente de Verdad para Definiciones de Equipo

**Responsabilidad**: Eliminar `TeamStore` como fuente de definición de equipos. Mantenerlo únicamente para mensajes de sesión.

**Artefactos**:

1. **MODIFICAR** `apps/server/src/agents/agent-registry.ts`
   - Agregar método `getTeamDefinition(username: string, teamId: string): AgentDefinition | undefined`.
   - Agregar método `listTeamDefinitions(username: string): AgentDefinition[]`.

2. **MODIFICAR** `apps/server/src/core/ports/agent-registry.port.ts`
   - Agregar `getTeamDefinition` y `listTeamDefinitions` a `IAgentRegistry`.
   - Reemplazar `scope?: AgentScopeTarget` por `scope?: AgentRef` en `register`.

3. **MODIFICAR** `apps/server/src/routes/teams.ts`
   - Reemplazar `teamStore.createTeam`, `getTeam`, `updateTeam`, `deleteTeam`, `listTeams`, `updateMembers` por equivalentes en `agentRegistry`.
   - Mantener `teamStore.appendMessage` y `teamStore.getMessages`.

4. **MODIFICAR** `apps/server/src/teams/team-prompt-runner.ts`
   - Obtener `AgentDefinition` desde `agentRegistry.getTeamDefinition` en lugar de `teamStore.getTeam`.

5. **MODIFICAR** `apps/server/src/teams/team-orchestrator.ts`
   - Reemplazar `teamStore.getTeam` por `agentRegistry.getTeamDefinition`.

6. **MODIFICAR** `apps/server/src/teams/orchestration/orchestration-runner.ts`
   - Reemplazar `teamStore.getTeam` por `agentRegistry.getTeamDefinition`.
   - Mantener `teamStore.appendMessage`.

7. **MODIFICAR** `apps/server/src/__tests__/team-type.test.ts` y `create-user-session.test.ts`
   - Adaptar tests para usar `agentRegistry.register(..., { type: "team" })` y `agentRegistry.getTeamDefinition`.

**Verificación del Hito 4**:
```bash
grep -rn "teamStore\.getTeam\|teamStore\.createTeam\|teamStore\.updateTeam\|teamStore\.deleteTeam\|teamStore\.listTeams\|teamStore\.updateMembers" apps/server/src/routes/ apps/server/src/teams/
# Debe producir CERO líneas.

grep -rn "AgentScopeTarget" apps/server/src/core/ports/
# Debe producir CERO líneas.

pnpm --filter server run typecheck
pnpm --filter server test
# Ambos exit code 0.
```

---

### Hito 5: Frontend — Firmas Limpias con `AgentRef` Exclusivo

**Responsabilidad**: Eliminar el overload `AgentRef | EntityType` en los hooks del cliente.

**Artefactos**:

1. **MODIFICAR** `apps/client/src/hooks/useEntityConfig.ts`
   - Cambiar firma a `useEntityConfig(agentRef: AgentRef)`.
   - Eliminar lógica de overload (L9–L10) y todo `as any`.

2. **MODIFICAR** `apps/client/src/hooks/useEntitySkills.ts`
   - Cambiar firma a `useEntitySkills(agentRef: AgentRef)`.
   - Eliminar lógica de overload (L10–L11) y `agentRefOrType as any` (L21).

3. **MODIFICAR** todos los callsites en `apps/client/src/`
   - Componentes que pasen `(entityType, entityId)` deben construir `{ type: entityType, id: entityId }`.

**Verificación del Hito 5 (= Completion del plan)**:
```bash
grep -rn "as any" apps/client/src/hooks/useEntityConfig.ts apps/client/src/hooks/useEntitySkills.ts
# Debe producir CERO líneas.

grep -rn "AgentRef | EntityType\|AgentRef | string" apps/client/src/hooks/
# Debe producir CERO líneas.

# Verificación integral:
pnpm --filter shared run typecheck
pnpm --filter server run typecheck
pnpm --filter server test
pnpm --filter client run typecheck
pnpm build
# TODOS deben finalizar con exit code 0.
```

---

## 4. Restricciones No Negociables de Ejecución

1. **Orden estricto de hitos**: 1 → 2 → 3 → 4 → 5. Sin solapamiento.
2. **Typecheck y tests en verde al finalizar cada hito** antes de comenzar el siguiente.
3. **Sin cambios de comportamiento observable**: API REST y contratos WebSocket mantienen su forma. Solo cambia la fuente interna de la entidad.
4. **Un commit por hito**: `refactor(entities): hito-1-schema-cleanup`, `refactor(entities): hito-2-cascade-config-ref`, `refactor(entities): hito-3-parent-ref-resolution`, `refactor(entities): hito-4-teamstore-migration`, `refactor(entities): hito-5-frontend-agentref`.
5. **Tests se adaptan, nunca se eliminan**: Tests que usaban `teamStore.createTeam` directamente se adaptan para usar `agentRegistry.register` con `type: "team"`.
6. **`TeamStore.appendMessage` y `TeamStore.getMessages` son intocables**: Son histórico de mensajes de sesión, no definición de entidad. El Hito 4 no los elimina.
7. **No introducir `any` nuevo**: Todo tipo debe ser explícito. Si una firma externa fuerza `any`, se aísla con `// TODO:` documentado.
