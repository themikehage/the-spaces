# Hito 2: Descomposición de Componentes

> **Estado:** 📋 Planificado
> **Objetivo:** Reducir todos los componentes a 500 líneas máximo mediante extracción de hooks, sub-componentes y utilidades puras. Páginas toleradas hasta 600 líneas si es solo composición.

---

## 1. Visión y Meta

Cada archivo `.tsx` en `components/` debe tener una responsabilidad clara y ≤ 500 líneas. La descomposición sigue tres estrategias en orden de prioridad:

1. **Lógica → hooks**: Estado, efectos, handlers y derivaciones se extraen a `hooks/useX.ts` o hooks locales en el directorio del componente.
2. **Secciones visuales → sub-componentes**: Partes del JSX con identidad propia se promueven a archivos en el mismo directorio.
3. **Utilidades puras → `lib/`**: Funciones de transformación, formateo, o helpers sin dependencia de React.

### Regla innegociable

**Ningún componente en `components/` supera las 500 líneas.** Excepciones:

- `pages/` → 600 líneas, solo si es pura composición de sub-componentes
- Archivos generados automáticamente (se documenta la excepción en el plan)

---

## 2. Motivación

- **Legibilidad**: Componentes de 1000+ líneas son imposibles de revisar y mantener.
- **Testeabilidad**: Hooks extraídos se pueden testear con `@testing-library/react-hooks`.
- **Reusabilidad**: Sub-componentes extraídos quedan disponibles para otros contextos.
- **Code Review**: PRs con cambios en archivos de 100-300 líneas se revisan en minutos, no horas.

---

## 3. Plan de Trabajo — por archivo, ordenado por severidad

### Fase 1: Los peores infractores (> 800 líneas)

**3.1. `settings/GeneralTab.tsx` (1193 líneas → ≤500)**

Estrategia de descomposición:

- Extraer `useGeneralSettingsForm()` hook con toda la lógica de estado, fetch, save, validación
- Extraer sub-secciones visuales:
  - `GeneralIdentitySection.tsx` — nombre, avatar, bio del agente global
  - `GeneralModelSection.tsx` — selector de modelo, parámetros
  - `GeneralPermissionsSection.tsx` — permisos, tools, skills
  - `GeneralDangerZone.tsx` — acciones destructivas
- Extraer `lib/settings-utils.ts` para transformaciones de datos

**3.2. `chat/tools/ToolCallRow.tsx` (1117 líneas → ≤500)**

Estrategia: Este archivo es un dispatcher de tool results. Cada tipo de tool tiene su renderer.

- Extraer el switch/router de tool types a un `ToolResultRouter.tsx`
- Extraer handlers y lógica de estado a `useToolCallState.ts`
- Los renderers individuales ya existen en `chat/tools/` (BashResult, ReadResult, etc.) — verificar que ToolCallRow solo los componga

**3.3. `chat/ChatArea.tsx` (927 líneas → ≤500)**

Estrategia:

- Extraer `useChatAreaState()` — toda la lógica de sesión activa, streaming, mensajes
- Extraer `ChatHeader.tsx` — la barra de herramientas superior del chat
- Extraer `ChatBody.tsx` — wrapper de MessageList + ChatInput
- `ChatArea.tsx` → componente orquestador de ≤200 líneas

**3.4. `chat/MessageList.tsx` (852 líneas → ≤500)**

Estrategia:

- Extraer `useMessageListScroll()` hook con lógica de auto-scroll y anclaje
- Extraer `MessageGroup.tsx` — agrupación de mensajes consecutivos del mismo rol
- Extraer `SystemMessage.tsx` — renderizado de mensajes de sistema
- Extraer `lib/message-grouping.ts` — lógica pura de agrupación

**3.5. `layout/MainLayout.tsx` (802 líneas → ≤500)**

Estrategia:

- Extraer `useLayoutResponsive.ts` — lógica de breakpoints, sidebar colapsado, móvil
- Extraer `SidebarColumn.tsx` — columna completa del sidebar (DesktopSidebar + SessionSidebar)
- MainLayout → grid layout orquestador + providers

### Fase 2: Infractores medios (500-800 líneas)

**3.6. `chat/ChatInput.tsx` (660 líneas → ≤500)**

Estrategia:

- Extraer `useChatInputForm.ts` — estado del textarea, attachments, submit
- Extraer `ChatInputAttachments.tsx` — preview de attachments
- `ChatInput.tsx` → compose InputToolbar + ChatTextarea + SendStopButton + Attachments

**3.7. `sidebar/SessionSidebar.tsx` (541 líneas → ≤500)**

Estrategia:

- Extraer `useSessionList.ts` — fetching, sorting, filtering
- Extraer `SessionListItem.tsx` — ítem individual de sesión
- `SessionSidebar.tsx` → lista + búsqueda + acciones

**3.8. `projects/ProjectFloorPanel.tsx` (520 líneas → ≤500)**

Estrategia:

- Extraer `useProjectFloor.ts` — lógica de fetching y estado de proyectos
- Extraer `ProjectFloorItem.tsx` — tarjeta de proyecto individual
- `ProjectFloorPanel.tsx` → grid + filtros

### Fase 3: Componentes en el borde (400-500 líneas)

Estos no requieren descomposición inmediata pero deben auditarse:

| Archivo                             | Líneas | Acción                                      |
| ----------------------------------- | ------ | ------------------------------------------- |
| `preview/PreviewPanel.tsx`          | 458    | Extraer `usePreviewState.ts`, queda ≤300    |
| `mcp/MCPCustomForm.tsx`             | 438    | Extraer `useMCPForm.ts`, queda ≤250         |
| `workspace/WorkspaceFileEditor.tsx` | 435    | Extraer `useFileEditor.ts`, queda ≤300      |
| `workspace/WorkspacePanel.tsx`      | 426    | Extraer `useWorkspacePanel.ts`, queda ≤250  |
| `chat/ToolResultInspector.tsx`      | 419    | Extraer sub-vistas, queda ≤300              |
| `chat/DelegationsPanel.tsx`         | 414    | Extraer `useDelegations.ts`, queda ≤250     |
| `teams/TeamMembersModal.tsx`        | 412    | Extraer `useTeamMembersForm.ts`, queda ≤250 |

### Fase 4: Páginas (> 500 líneas → ≤600)

**3.9. `pages/AgentsPage.tsx` (1149 líneas → ≤600)**

Estrategia:

- Extraer `useAgentsPageState.ts` — fetch, filtros, ordenamiento
- Extraer `AgentsGrid.tsx` — grid de tarjetas de agentes
- Extraer `AgentsEmptyState.tsx` — estado vacío
- Extraer `AgentsPageToolbar.tsx` — barra de herramientas superior
- `AgentsPage.tsx` → orquestador que compone los sub-componentes

**3.10. `pages/DashboardPage.tsx` (735 líneas → ≤600)**

Estrategia:

- Extraer `useDashboardData.ts` — fetching de métricas y KPIs
- Extraer `DashboardMetricsRow.tsx` — tarjetas de métricas
- Extraer `DashboardRecentSessions.tsx` — sección de sesiones recientes
- `DashboardPage.tsx` → layout + composición

**3.11. `pages/MCPMarketplacePage.tsx` (700 líneas → ≤600)**

Estrategia:

- Extraer `useMCPMarketplace.ts` — fetching, búsqueda, filtros
- Extraer `MCPMarketplaceGrid.tsx` — grid de MCP cards
- `MCPMarketplacePage.tsx` → toolbar + grid

**3.12. `pages/AnalyticsPage.tsx` (519 líneas → ≤500)**

Estrategia:

- Extraer `useAnalyticsData.ts`
- Extraer `AnalyticsCharts.tsx`

---

## 4. Consideraciones Anti-Regresión

> [!WARNING]
> **Un componente por PR**: Cada archivo descompuesto va en un PR independiente con su propia verificación funcional. Descomponer múltiples componentes en un solo PR hace el review imposible.

> [!IMPORTANT]
> **Preservar estructura de directorios**: Los sub-componentes extraídos viven en el mismo directorio que el componente padre. Ej: `chat/ChatArea/` → `ChatHeader.tsx`, `ChatBody.tsx`.

> [!CAUTION]
> **Props drilling**: Al extraer sub-componentes, pasar props explícitamente. No usar context para estado local del componente. Si la profundidad de props supera 3 niveles, considerar composición con `children`.

---

## 5. Criterios de Verificación

| Criterio             | Verificación                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Límite de líneas** | `find apps/client/src/components -name "*.tsx" -exec wc -l {} +                                    | awk '$1 > 500 {print}'` → vacío |
| **Páginas**          | `find apps/client/src/pages -name "*.tsx" -exec wc -l {} +                                         | awk '$1 > 600 {print}'` → vacío |
| **Compilación**      | `pnpm --filter client run typecheck` → 0 errores                                                   |
| **Build**            | `pnpm --filter client run build` → exitoso                                                         |
| **Regresión visual** | Recorrer cada vista afectada y verificar que el layout y comportamiento son idénticos              |
| **Nuevos hooks**     | Cada hook extraído tiene nombre descriptivo, retorna tipos explícitos, y es independiente de la UI |

---

## 6. Archivos Afectados

### Creaciones (hooks)

| Archivo                           | Extraído de                      |
| --------------------------------- | -------------------------------- |
| `hooks/useGeneralSettingsForm.ts` | `settings/GeneralTab.tsx`        |
| `hooks/useChatAreaState.ts`       | `chat/ChatArea.tsx`              |
| `hooks/useMessageListScroll.ts`   | `chat/MessageList.tsx`           |
| `hooks/useChatInputForm.ts`       | `chat/ChatInput.tsx`             |
| `hooks/useSessionList.ts`         | `sidebar/SessionSidebar.tsx`     |
| `hooks/useProjectFloor.ts`        | `projects/ProjectFloorPanel.tsx` |
| `hooks/useAgentsPageState.ts`     | `pages/AgentsPage.tsx`           |
| `hooks/useDashboardData.ts`       | `pages/DashboardPage.tsx`        |
| `hooks/useMCPMarketplace.ts`      | `pages/MCPMarketplacePage.tsx`   |
| `hooks/useAnalyticsData.ts`       | `pages/AnalyticsPage.tsx`        |

### Creaciones (sub-componentes)

| Archivo                                  | Extraído de                    |
| ---------------------------------------- | ------------------------------ |
| `settings/GeneralIdentitySection.tsx`    | `settings/GeneralTab.tsx`      |
| `settings/GeneralModelSection.tsx`       | `settings/GeneralTab.tsx`      |
| `settings/GeneralPermissionsSection.tsx` | `settings/GeneralTab.tsx`      |
| `settings/GeneralDangerZone.tsx`         | `settings/GeneralTab.tsx`      |
| `chat/ChatHeader.tsx`                    | `chat/ChatArea.tsx`            |
| `chat/ChatBody.tsx`                      | `chat/ChatArea.tsx`            |
| `chat/MessageGroup.tsx`                  | `chat/MessageList.tsx`         |
| `chat/SystemMessage.tsx`                 | `chat/MessageList.tsx`         |
| `layout/SidebarColumn.tsx`               | `layout/MainLayout.tsx`        |
| `sidebar/SessionListItem.tsx`            | `sidebar/SessionSidebar.tsx`   |
| `pages/AgentsGrid.tsx`                   | `pages/AgentsPage.tsx`         |
| `pages/AgentsPageToolbar.tsx`            | `pages/AgentsPage.tsx`         |
| `pages/DashboardMetricsRow.tsx`          | `pages/DashboardPage.tsx`      |
| `pages/DashboardRecentSessions.tsx`      | `pages/DashboardPage.tsx`      |
| `pages/MCPMarketplaceGrid.tsx`           | `pages/MCPMarketplacePage.tsx` |
