# SHAPES Orquestador de Proyectos Agénticos
### Reporte de funcionalidades y arquitectura — OpenAI Build Week (Codex + GPT-5.6)

---

## 1. Visión del producto

Un gestor de proyectos donde cada **proyecto es un entorno de trabajo real** (repo, infraestructura, documentos, conocimiento), no una lista de tareas. A cada proyecto se le asignan **agentes autónomos** con:

- **Skills propias** (capacidades reutilizables, definidas como artefactos portables — tu convención SKILL.md).
- **Tools propias** (acceso real a sistemas vía MCP: Git, Coolify, APIs, filesystem, bases de datos).
- **Contexto y memoria persistente** del proyecto (no arrancan de cero en cada sesión).

El diferenciador frente a ClickUp/Asana/Wrike/Monday: sus agentes ejecutan *dentro de su propia app* (mover tarjetas, resumir, notificar). Los tuyos **ejecutan de verdad** — corren código, hacen commits, despliegan, consultan APIs externas — y lo hacen de forma visible y coordinada entre sí.

---

## 2. Funcionalidades

### 2.1 Gestión de proyectos como contexto

- **Ficha de proyecto**: objetivo, alcance, deadline, estado, artefactos vinculados (repo, docs, infra).
- **Fuente de verdad única**: el proyecto no es una tabla de tareas, es un contenedor de contexto que los agentes leen antes de actuar (goal + histórico + recursos disponibles).
- **Estados de proyecto**: planificación → en ejecución → en revisión → completado, con transición disparada tanto por humanos como por agentes.

### 2.2 Asignación de agentes autónomos

- **Catálogo de agentes**: cada agente tiene un rol (ej. "Backend Dev", "QA", "Investigador", "Documentador").
- **Asignación por proyecto**: un agente puede trabajar en varios proyectos; un proyecto puede tener varios agentes en paralelo.
- **Scope de permisos por asignación**: qué puede tocar ese agente en ese proyecto específico (repo X sí, repo Y no; puede desplegar en staging, no en producción).
- **Ciclo de vida del agente**: activar → trabajar (loop autónomo) → reportar → pausar/detener.

### 2.3 Skills portables (capacidades)

- **Formato abierto** (Markdown + YAML frontmatter, tu convención SKILL.md): cada skill describe qué sabe hacer el agente, cuándo aplica, y cómo se ejecuta.
- **Librería compartida**: skills no están atadas a un agente — se asignan y reasignan. Un mismo "Code Reviewer" skill lo puede usar cualquier agente.
- **Versionado**: las skills viven en un repo (Git), con historial — se pueden auditar y hacer rollback.
- **Composición**: un agente puede tener múltiples skills activas a la vez; el propio agente decide cuál aplicar según la tarea.

### 2.4 Tools reales vía MCP

- **Conexión a sistemas externos** como servidores MCP: filesystem, Git/GitHub, Coolify (deploy/restart de contenedores), bases de datos, APIs propias.
- **Tools por agente, no globales**: cada agente solo ve las tools que le asignaste (principio de menor privilegio).
- **Ejecución auditable**: cada llamada a una tool queda registrada (qué agente, qué tool, qué parámetros, qué resultado).

### 2.5 Orquestación multiagente (patrón controlador → especialistas)

- **Agente controlador por proyecto**: descompone el objetivo en subtareas y decide qué agente especialista la resuelve.
- **Delegación visible (estilo A2A)**: cuando un agente le pasa trabajo a otro, se ve en la interfaz como un "handoff" explícito, no como una caja negra.
- **Paralelismo**: varios agentes especialistas trabajando a la vez en subtareas independientes del mismo proyecto.
- **Resolución de conflictos**: si dos agentes producen resultados contradictorios (ej. dos definiciones distintas de un mismo dato), el controlador señala el conflicto en vez de fusionar a ciegas.

### 2.6 Memoria del proyecto

- **Memoria de corto plazo (sesión)**: contexto de la tarea actual.
- **Memoria de largo plazo (proyecto)**: decisiones tomadas, convenciones del equipo, errores pasados — persistente entre sesiones (vector store tipo Qdrant + metadata estructurada).
- **Memoria compartida entre agentes del mismo proyecto**: evita que dos agentes redescubran o contradigan lo que otro ya resolvió.

### 2.7 Human-in-the-loop

- **Niveles de autonomía configurables por tarea/agente**: autoejecuta / propone y espera aprobación / solo sugiere.
- **Puntos de aprobación obligatorios**: acciones irreversibles (deploy a producción, borrar datos, merge a main) siempre piden confirmación humana, sin importar el nivel de autonomía configurado.
- **Intervención en caliente**: el humano puede pausar un agente a mitad de ejecución y redirigirlo.

### 2.8 Dashboard / experiencia de usuario

- **Vista "piso de trabajo" en vivo**: ves a cada agente trabajando en tiempo real (qué está haciendo ahora mismo), no solo notificaciones de "tarea completada".
- **Estilo conversacional (WhatsApp-like)**: cada agente es un "chat" con el que podés hablar directamente, dar instrucciones, o simplemente observar.
- **Timeline de decisiones**: log legible en lenguaje natural de qué decidió cada agente y por qué (no solo logs técnicos).
- **Resumen ejecutivo automático**: al final del día/sprint, el controlador genera un resumen de progreso por proyecto.

### 2.9 Reporting y observabilidad

- **Métricas por agente**: tareas completadas, tasa de aprobación humana, tiempo promedio por tarea.
- **Auditoría completa**: quién (agente/humano) hizo qué, cuándo, con qué herramienta.

---

## 3. Arquitectura técnica

### 3.1 Capas del sistema

```
┌─────────────────────────────────────────────────┐
│  FRONTEND — Dashboard (chat-style + live feed)   │
│  React/Next.js · vista por proyecto · timeline   │
└───────────────────────┬───────────────────────────┘
                         │ WebSocket / SSE (streaming)
┌───────────────────────▼───────────────────────────┐
│  API / DISPATCHER (Hono + Bun)                     │
│  - Gestión de proyectos, agentes, asignaciones     │
│  - Cola de tareas y eventos                        │
│  - Autenticación (Cloudflare Zero Trust)           │
└───────┬─────────────────────────┬──────────────────┘
        │                         │
┌───────▼─────────┐     ┌─────────▼──────────────┐
│  AGENT RUNTIME    │     │  SKILLS LIBRARY         │
│  Claude Agent SDK  │◄───┤  SKILL.md + gray-matter │
│  / Codex agents    │     │  Git-backed, versionado │
│  - loop autónomo   │     └─────────────────────────┘
│  - sub-agentes      │
│  - streaming        │     ┌─────────────────────────┐
└───────┬─────────────┘◄────┤  TOOLS LAYER (MCP)      │
        │                    │  Git/GitHub, Coolify,   │
        │                    │  filesystem, DB, APIs   │
        │                    └─────────────────────────┘
┌───────▼─────────────────────────────────────────────┐
│  MEMORIA / CONOCIMIENTO                              │
│  Qdrant (vectorial) + Postgres/Neon (estructurado)   │
│  - memoria de proyecto, memoria de agente, historial │
└───────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────┐
│  EJECUCIÓN / SANDBOX                                    │
│  Contenedores Docker aislados por agente (Coolify)      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Modelo de datos (entidades núcleo)

- **Project**: id, nombre, objetivo, estado, recursos vinculados (repo, docs), deadline.
- **Agent**: id, rol, skills asignadas, tools asignadas, nivel de autonomía por defecto.
- **Assignment**: relación Project ↔ Agent, con scope de permisos específico.
- **Skill**: id, definición (SKILL.md), versión, tags de aplicabilidad.
- **Tool**: id, tipo de conexión MCP, credenciales/scope, agentes con acceso.
- **Task**: id, proyecto, agente asignado, estado, dependencias, resultado.
- **Session**: id, agente, proyecto, historial de mensajes/acciones (aislada por proyecto, como ya hiciste en tu admin-panel).
- **MemoryEntry**: id, proyecto, tipo (decisión/error/convención), embedding, texto.
- **AuditLog**: quién, qué acción, qué tool, timestamp, resultado.

### 3.3 Flujo de ejecución típico

1. Humano crea un proyecto y le asigna un agente controlador + N agentes especialistas.
2. El controlador lee el contexto del proyecto (objetivo + memoria) y descompone el trabajo en subtareas.
3. Delega cada subtarea al especialista correspondiente (evento de "handoff" visible en el dashboard).
4. Cada especialista ejecuta usando sus skills + tools (vía MCP), dentro de su sandbox.
5. Acciones de riesgo (deploy, merge, borrado) se detienen y piden aprobación humana antes de continuar.
6. Resultados vuelven al controlador, que los sintetiza, actualiza la memoria del proyecto, y genera el resumen ejecutivo.
7. Todo el proceso queda en el timeline y el audit log.

### 3.4 Aislamiento y seguridad

- Cada sesión de agente corre en su propio contenedor (evita fugas de contexto entre proyectos).
- Tools con scope explícito por asignación (un agente de "Marketing" nunca ve las credenciales de infra de producción).
- Autenticación de acceso al dashboard vía Cloudflare Zero Trust (ya lo tenés resuelto).

---

## 4. Alcance recomendado para la semana de hackathon

**MVP demostrable (prioridad alta):**
1. Crear proyecto con contexto básico (objetivo + repo vinculado).
2. Asignar 2–3 agentes con roles distintos y skills predefinidas (reusar tu librería de skills).
3. Un agente controlador que delega a un especialista visible en el dashboard (handoff en vivo).
4. Al menos **una tool real vía MCP** que ejecute algo tangible (ej. hacer un commit, correr un test, hacer un deploy en Coolify) — esto es lo que va a "sorprender" en la demo.
5. Punto de aprobación humana antes de una acción irreversible.
6. Timeline legible de lo que hizo cada agente.

**Fuera de alcance para esta semana (roadmap):**
- Memoria vectorial completa (podés simularla con contexto estructurado en Postgres para el demo).
- Métricas y reporting avanzado.
- Multi-tenant / permisos granulares complejos.
