1. **#9 — Eliminar plugins** (limpieza, bajo riesgo, prepara el terreno)
2. **#4 — Historial de mensajes con flechas** (quick win, alto impacto UX)
3. **#7 — Unificar task tools** (refactor interno, elimina deuda)
4. **#8 — Unificar memory tool** (refactor interno, consistencia)
5. **#3 — Default model/provider** (feature nuevo, valor inmediato)
6. **#1 — Abstracción custom tools** (refactor grande, base para #6)
7. **#6 — Custom tools con aprobación** (depende de #1)
8. **#5 — Galería de equipos** (feature nuevo, contenido + backend)
9. **#2 — Team-scoped agents** (cambio arquitectónico, máxima complejidad)

------

Problemas:
- Al hacer click en ell boton de cancel en el chat mientras se esta corriendo una tool, es verdad que la ejecucion se cancela, pero en la ui la tool se queda como running para siempre. Si la tool era una pregunta o aprobacion, el attention hub no se reestablece. DONE
- En la modal de configuracion de agente, al clickar en la tab de ver el prompt, que por cierto se muestra abajo cuando deberia estar arriba, la modal se cierra. DONE

-----

## Mobile

- El selector de modelos sale duplicado en la topbar y en el input de escribir.
- No se estan mostrando los selectores de  tools y skills
- El chat muestra el bottombar, no deberia
- Falta añadir ui en tools
- mensajes a width completo
- Mostrar las setting en tabs y añadir las tabs que faltan
- Skeleton al cargar los mensajes

1.- Cuando entras a la ventana de una entidad quiero que veas directamente el chat, el ultimo chat que hayas tenido, y en la topbar el boton de sesiones y el de config, que seran los 3 puntos. Si haces swipe a la derecha navegas al workspace/files de esa entidad.

---
## Pending features:

2. Gaps totales — features web SIN ningún plan (0-10)
A. Paneles de contexto (la arquitectura de contexto multi-entidad completa)
- Workspace por contexto — WorkspaceRoute/WorkspacePanel (apps/client/src/router/routes/ContextLeaves.tsx:85). Espacio de trabajo por project/agent/team. Nada en mobile.
- Timeline — TimelineRoute/TimelineTabPanel (ContextLeaves.tsx:51). Vista timeline de sesión/contexto.
- Delegations — DelegationsRoute/DelegationsPanel (ContextLeaves.tsx:68), respaldado por IDelegationRegistry en el server. Nada en mobile.
- Preview / Renderer de UI custom — PreviewRoute/PreviewPanel (usa CustomUiRenderer, cards, metrics, tables). Nada en mobile.
- Project Floor — ProjectFloorRoute/ProjectFloorPanel (ContextLeaves.tsx:116).
- Chat en contexto de equipo — TeamChatArea (ContextLeaves.tsx:27). El H5 de mobile es solo chat por sesión.
B. Páginas administrativas que SOLO son placeholders de drawer en mobile (H3-A3 las nombra pero ningún hito las implementa)
- Schedules — SchedulesPage completo (CRUD de jobs + run history + trigger, useSchedules, ScheduleJobDialog). Solo placeholder.
- Skills — SkillsPage (librería de skills, ver/copiar/reset. skillsService.resetSkills()). Solo placeholder. H6 solo togglea skills por entidad.
- Logs Console — LogsConsolePage = SessionConsoleView (stream WS global en tiempo real, filtros session/channel, toggles message/thinking/tools). Solo placeholder.
- MCP Marketplace — MCPMarketplacePage + useMCPMarketplaceState (rutas /mcps→/settings tab mcp, McpRedirectRoute). Solo placeholder.
C. Tabs de Sessions no contemplados (SessionsPage.tsx:14)
- Sessions Kanban — SessionsKanbanPage + KanbanColumn idle|working|done (SessionsContext.tsx:17). El tab principal del web es el kanban; H4 solo arma una lista.
- Analytics — AnalyticsPage (AnalyticsRoute hace redirect a /sessions?tab=analytics).
- Session Console — el SessionConsoleView (también es el cuerpo de Logs, ver B).
D. Settings — tabs que H8 no planifica (SettingsPage.tsx:49)
- Env Vars — EnvVarsTab + envService.fetchEnvVars() (editar variables de entorno del backend desde UI). H8 solo cubre General/Providers/Security.
E. Features transversales sin equivalente
- Onboarding / primer setup — OnboardingPage (se muestra cuando needsSetup en AuthContext/AppRouter.tsx:65). H1 solo hace login/no-registro.
- Registro de agentes (network) — RegisterModal (components/agents/RegisterModal.tsx), usado en AgentsPage y LayoutModals. Mobile no tiene registro de agentes a servicios externos.
- Credenciales HTTP de tools — useCredentials/CredentialsSection/CredentialPicker. Son credenciales bearer/basic/api-key PARA TOOLS y workflows (backend CredentialStore, credential-store.ts), un feature distinto de las API keys de providers de H8.
- Custom tools — useCustomToolsList + ToolsPopover en el chat. Gestión de tools custom por sesión.
- Workflow Builder visual — WorkflowBuilderPage + useWorkflowBuilderState (editor de nodos). Exclusión explícita documentada en H9 (read-only en mobile) — no es omisión, es decisión, pero el editor queda solo-web.


----

# Investigaciones Serias: Deben ser ignoradas en sesiones que involucren otras funcionalidade y abordarse de forma individual