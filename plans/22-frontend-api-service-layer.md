# Hito 1: Capa de Servicios de API del Cliente

> **Estado:** 📋 Planificado
> **Objetivo:** Encapsular toda llamada HTTP del frontend en servicios de dominio tipados bajo `lib/api/`. Eliminar `apiFetch()` inline de hooks, contextos y componentes.

---

## 1. Visión y Meta

Establecer una capa de servicios de API pura — funciones asíncronas tipadas sin dependencia de React — que todo hook, contexto y componente consuma. El modelo es `lib/api/schedules.ts` + `useSchedules.ts`: el servicio expone funciones CRUD tipadas, el hook maneja solo estado React.

### Arquitectura meta

```
lib/api/
  agents.ts         → AgentService
  teams.ts           → TeamService
  sessions.ts        → SessionService
  projects.ts        → ProjectService
  config.ts          → EntityConfigService
  skills.ts          → EntitySkillsService
  custom-tools.ts    → EntityCustomToolsService
  auth.ts            → AuthService
  attention.ts       → AttentionService (ya existe parcialmente)
  schedules.ts       → ✅ ya existe

hooks/
  useAgents.ts       → orquestador delgado → delega a AgentService
  useTeams.ts        → orquestador delgado → delega a TeamService
  useSchedules.ts    → ✅ ya cumple el patrón
  ...

Excepción controlada:
  AuthContext.tsx     → consume AuthService (puede usar apiFetch interno para status/login/register/logout)
  SessionsContext.tsx → consume SessionService (puede usar apiFetch interno para list/statuses)
```

### Regla innegociable

**`apiFetch()` solo se llama dentro de `lib/api/` y de los dos contextos globales (`AuthContext`, `SessionsContext`).** Cualquier otro archivo que llame a `apiFetch()` es una violación.

---

## 2. Motivación

- **Tipado estricto**: Las funciones de servicio retornan tipos de `packages/shared` (no `Response` crudo ni `any`).
- **Testeabilidad**: Servicios puros testeables sin mock de React.
- **Single Source of Truth**: Si una ruta de API cambia, se corrige en un solo lugar.
- **Elimina duplicación**: `useAgents` y `useTeams` son idénticos estructuralmente — con servicios extraídos, convergen a un patrón único.

---

## 3. Plan de Trabajo

### Fase 1: Servicios de entidades principales (Agents, Teams)

**3.1. Crear `lib/api/agents.ts`**

Funciones exportadas:

- `fetchAgents(): Promise<AgentInfo[]>`
- `fetchAgent(id: string): Promise<AgentInfo>`
- `registerAgent(definition: AgentDefinition): Promise<AgentInfo>`
- `updateAgent(id: string, updates: Partial<Omit<AgentDefinition, "id">>): Promise<AgentInfo>`
- `deleteAgent(id: string): Promise<void>`
- `uploadAgentAvatar(id: string, file: File): Promise<string>`
- `deleteAgentAvatar(id: string): Promise<void>`
- `promptAgent(id: string, message: string): Promise<string>`

**3.2. Migrar `useAgents.ts`**

- Eliminar todas las llamadas inline a `apiFetch()`
- Importar y delegar a `lib/api/agents.ts`
- Eliminar `fetchAgents` interno, usar `useCallback` + delegar

**3.3. Crear `lib/api/teams.ts`**

Funciones exportadas:

- `fetchTeams(): Promise<Team[]>`
- `fetchTeamsByProject(projectId: string): Promise<Team[]>`
- `createTeam(data: CreateTeam): Promise<Team>`
- `updateTeam(id: string, updates: UpdateTeam): Promise<Team>`
- `deleteTeam(id: string): Promise<void>`
- `uploadTeamAvatar(id: string, file: File): Promise<string>`
- `deleteTeamAvatar(id: string): Promise<void>`

**3.4. Migrar `useTeams.ts`**

- Ídem patrón `useAgents`

### Fase 2: Servicios de configuración por entidad

**3.5. Crear `lib/api/config.ts`**

Funciones exportadas:

- `fetchEntityConfig(entityType: string, entityId?: string): Promise<EntityConfig>`
- `fetchResolvedConfig(entityType: string, entityId?: string): Promise<ResolvedConfig>`
- `updateEntityConfig(entityType: string, entityId: string, config: Partial<EntityConfig>): Promise<EntityConfig>`
- `fetchSessionConfig(sessionId: string): Promise<ResolvedConfig>`

**3.6. Migrar `useEntityConfig.ts`**

- Eliminar `apiFetch()` inline
- Delegar a `lib/api/config.ts`

**3.7. Crear `lib/api/skills.ts`** y migrar `useEntitySkills.ts`

**3.8. Crear `lib/api/custom-tools.ts`** y migrar `useEntityCustomTools.ts`

### Fase 3: Servicios de sesiones y autenticación

**3.9. Crear `lib/api/sessions.ts`**

Funciones exportadas:

- `fetchSessions(): Promise<SessionItem[]>`
- `fetchSessionStatuses(): Promise<Record<string, SessionStatus>>`
- `createSession(data: CreateSessionInput): Promise<Session>`
- `fetchSession(id: string): Promise<Session>`

**3.10. Migrar `SessionsContext.tsx`**

- Delegar `fetchSessions()` y `fetchStatuses()` a `lib/api/sessions.ts`
- El contexto mantiene el estado React y la lógica derivada

**3.11. Crear `lib/api/auth.ts`**

Funciones exportadas:

- `fetchAuthStatus(): Promise<AuthStatus>`
- `login(username: string, password: string): Promise<AuthResult>`
- `register(username: string, password: string, email?: string): Promise<AuthResult>`
- `logout(): Promise<void>`
- `changePassword(currentPassword: string, newPassword: string): Promise<void>`

**3.12. Migrar `AuthContext.tsx`**

- Consumir `lib/api/auth.ts`
- El contexto mantiene solo estado y efectos

### Fase 4: Servicios de proyectos y misceláneos

**3.13. Crear `lib/api/projects.ts`** con CRUD de proyectos

**3.14. Migrar hooks y páginas que hagan `apiFetch()` inline para proyectos**

**3.15. Auditoría final**: `rg "apiFetch" apps/client/src --include '*.ts' --include '*.tsx'`

El único `apiFetch()` importado fuera de `lib/api/` debe ser en `AuthContext.tsx` y `SessionsContext.tsx`.

---

## 4. Consideraciones Anti-Regresión

> [!WARNING]
> **Orden estricto**: Crear el servicio → verificar que compila → migrar el hook/contexto consumidor → verificar que compila → test manual del flujo. No migrar múltiples consumidores en un solo commit.

> [!IMPORTANT]
> **Formato de respuesta de API**: Algunos endpoints retornan `{ agents: [...] }`, otros `{ teams: [...] }`. El servicio debe desanidar y retornar el array/objeto directo. Si la API cambia, solo se ajusta el servicio.

> [!CAUTION]
> **Avatar upload**: `FormData` con `apiFetch` no debe setear `Content-Type` (el navegador lo asigna automáticamente con el boundary). Verificar que `apiFetch()` no sobrescriba el header.

---

## 5. Criterios de Verificación

| Criterio                   | Verificación                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compilación**            | `pnpm --filter client run typecheck` → 0 errores                                                                                                                              |
| **Build**                  | `pnpm --filter client run build` → exitoso                                                                                                                                    |
| **Auditoría apiFetch**     | `rg "from \"@/lib/api\"" apps/client/src --include '*.ts' --include '*.tsx'` solo en hooks/contextos; `rg "apiFetch("` solo en `lib/api/` + `AuthContext` + `SessionsContext` |
| **Regresión funcional**    | Flujo completo: login → crear agente → crear equipo → crear sesión → chatear → settings                                                                                       |
| **Cobertura de servicios** | Todo endpoint REST del servidor con consumo en el cliente tiene su función en `lib/api/`                                                                                      |

---

## 6. Archivos Afectados

| Archivo                                        | Cambio                                      |
| ---------------------------------------------- | ------------------------------------------- |
| `lib/api/agents.ts`                            | **Nuevo** — servicio tipado de agentes      |
| `lib/api/teams.ts`                             | **Nuevo** — servicio tipado de equipos      |
| `lib/api/sessions.ts`                          | **Nuevo** — servicio tipado de sesiones     |
| `lib/api/auth.ts`                              | **Nuevo** — servicio tipado de auth         |
| `lib/api/config.ts`                            | **Nuevo** — servicio tipado de config       |
| `lib/api/skills.ts`                            | **Nuevo** — servicio tipado de skills       |
| `lib/api/custom-tools.ts`                      | **Nuevo** — servicio tipado de custom tools |
| `lib/api/projects.ts`                          | **Nuevo** — servicio tipado de proyectos    |
| `hooks/useAgents.ts`                           | Migrar a delegar en servicio                |
| `hooks/useTeams.ts`                            | Migrar a delegar en servicio                |
| `hooks/useTeam.ts`                             | Migrar a delegar en servicio                |
| `hooks/useEntityConfig.ts`                     | Migrar a delegar en servicio                |
| `hooks/useEntitySkills.ts`                     | Migrar a delegar en servicio                |
| `hooks/useEntityCustomTools.ts`                | Migrar a delegar en servicio                |
| `hooks/useSessionResolver.ts`                  | Migrar a delegar en servicio                |
| `contexts/AuthContext.tsx`                     | Migrar a delegar en servicio                |
| `contexts/SessionsContext.tsx`                 | Migrar a delegar en servicio                |
| `components/layout/hooks/useSessionActions.ts` | Migrar a delegar en servicio                |
