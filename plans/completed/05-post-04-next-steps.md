# Spaces — Lo que queda después del 04

> Este documento asume que los 8 territorios del `04-post-next-steps.md` están implementados.
> Es decir: SDK público, SpacesHost, Workflows, Observabilidad real, Multi-tenancy, AgentTestHarness, Pipelines como producto y Plugin API.
> La pregunta que responde: ¿qué problemas no habremos resuelto todavía?

---

## Qué tendremos cuando el 04 esté completo

| Capacidad | Estado post-04 |
|---|---|
| SDK `packages/runtime` | Publicado, versionado, con un solo punto de entrada |
| `SpacesHost` | Contrato formal, puertos obligatorios vs. opcionales documentados |
| Workflows | Motor ejecutable con triggers, persistencia de estado y UI |
| Dashboard de observabilidad | Métricas por agente, sesiones activas, árbol global de delegaciones |
| Tenancy avanzada | Organizaciones con config merge y aislamiento de procesos MCP |
| `AgentTestHarness` | Tests deterministas sobre agentes con tools mockeadas |
| Pipeline engine | Branching, loops, recovery, UI builder drag-and-drop |
| Plugin API | Registro de tools/providers/hooks desde fuera del server |

Con esto resuelto, Spaces es un producto maduro. **El nuevo territorio que se abre es de otra naturaleza: distribución, confianza y colaboración.**

---

## Análisis: lo que el 04 no resuelve

### A. Deuda de calidad que acumulamos intencionalmente

El `04` es un plan de *capacidades nuevas*. No es un plan de calidad del código existente.
Después del 03 y del 04, el monorepo habrá crecido significativamente y varios aspectos de calidad de base quedarán sin atender:

#### A1. Testing — cobertura estructuralmente ausente

El `steps.md` lista como pendiente:
- Pruebas de integración en rutas críticas (auth, sesiones, archivos, WebSocket)
- Tests de orquestación de agentes, equipos y aprobaciones

Lo que el 04 añade hace que esto sea más urgente, no menos:
- El `AgentTestHarness` (04-6) permite testear agentes en aislamiento, pero no reemplaza las pruebas de integración del server.
- Los workflows y pipelines añaden flujos de ejecución asíncrona que son notoriamente difíciles de testear ad-hoc.
- El SDK expuesto (04-1) necesita una test suite propia para garantizar semver estable — cualquier breaking change no testeado en el SDK destruye a los consumidores externos.

**Lo que falta:**
- Suite de integración del server: `auth → session → tool call → delegation → completion`
- Contract tests del SDK: verifican que el `SpacesHost` implementado por Spaces cumple el contrato declarado
- Tests de regresión de workflows: fixture input → expected output → assert estado final
- Pipeline test runner integrado en CI

---

#### A2. Typecheck y lint — sin estándar unificado

`steps.md` tiene pendiente: *"Definir comandos estándar para typecheck, lint y pruebas en todos los workspaces"*.

Después del 04, el monorepo tiene más packages (`packages/runtime`, `packages/tools`, `packages/providers`, `packages/core`). Sin un estándar unificado y ejecutable desde la raíz:
- El typecheck pasa en `client` pero falla silenciosamente en `packages/runtime`
- Las reglas de lint varían entre packages
- CI no puede verificar el monorepo completo en un solo paso

**Lo que falta:**
- `pnpm typecheck` desde la raíz que recorra todos los workspaces
- Configuración de ESLint/Biome compartida en `packages/shared` o una raíz `eslint.config.js`
- Regla estricta: `no any` enforceada en CI (hoy está en guidelines pero no en el linter)
- `pnpm lint:fix` y `pnpm test` en la raíz como comandos de primer nivel

---

#### A3. Variables de entorno — documentación ausente

`steps.md` tiene pendiente: *"Documentar variables de entorno, persistencia local y procedimiento de despliegue"*.

Actualmente, las credenciales de proveedores se cifran antes de persistir (SQLite), pero:
- No existe un `.env.example` canónico
- El procedimiento de primer arranque no está documentado (qué variables son obligatorias vs. opcionales)
- El `Dockerfile` y `docker-compose.yml` existen pero no hay guía de self-hosting

**Lo que falta:**
- `.env.example` con anotaciones por variable (obligatoria, opcional, donde se obtiene)
- `docs/self-hosting.md` con procedimiento completo (clone → configure → deploy)
- Health check endpoint que valide la configuración en arranque (qué providers están activos, qué variables faltan)
- Secrets rotation: cómo cambiar una clave de proveedor sin perder sesiones activas

---

### B. Distribución y acceso

Una vez que el SDK existe y el plugin API funciona, la pregunta cambia de *"¿cómo lo construimos?"* a *"¿cómo llega a otros?"*.

#### B1. Publicación del SDK

El 04 decide qué contiene el SDK y lo estructura. Pero no incluye el proceso de publicación:
- **npm registry**: ¿npm público, GitHub Packages, o registro privado de la organización?
- **Versioning automation**: ¿Changesets, Release-it, o manual? Con múltiples packages en el monorepo, un release manual es un error esperando ocurrir.
- **Documentación pública**: el SDK necesita docs de referencia generados (TypeDoc), ejemplos de uso, guía de `SpacesHost` mínimo, y changelog.
- **Breaking change policy**: qué cuenta como major, minor o patch para el SDK. Definir esto antes del primer release evita pain posterior.

**Lo que falta:**
- Configurar Changesets o Release-it en el monorepo
- Pipeline de CI/CD que publique automáticamente al hacer merge a main
- TypeDoc o equivalente para generar docs de referencia del SDK
- `packages/sdk-example` — una implementación mínima de `SpacesHost` externa que sirva como test de integración y documentación viva

---

#### B2. Self-hosting accesible

Hoy el `Dockerfile` y `docker-compose.yml` existen pero no han sido validados end-to-end desde cero. Para que alguien externo pueda deployar Spaces sin acceso al equipo:
- El build de producción (`pnpm build`) no está verificado como reproducible en entornos limpios
- No hay guía de qué hacer cuando un proveedor falla en arranque
- No hay procedimiento de backup/restore de datos de usuario

**Lo que falta:**
- Validación del build de producción en CI (no solo en dev)
- `docker-compose.yml` con health checks y restart policies correctas
- Guía de backup de SQLite y directorio `workspace/`
- Modo de demo con datos seed para evaluadores

---

### C. Seguridad y confianza en un entorno multi-tenant

El 04-5 planifica multi-tenancy avanzada (organizaciones, config merge, aislamiento de procesos MCP). Lo que el 04 no resuelve es la capa de **seguridad activa** que ese entorno requiere:

#### C1. Auditoría y compliance

El 04-4 da métricas operacionales (tokens, latencia, frecuencia de tools). Eso es observabilidad interna. Pero para un entorno multi-tenant real:
- **Retention policy**: ¿cuánto tiempo se guardan los logs de audit? ¿Se pueden exportar?
- **Regulatorio**: en algunas industrias (salud, finanzas, legal), los logs de audit no solo deben existir sino cumplir formato específico (SIEM-compatible, syslog, etc.)
- **Data residency**: ¿dónde viven los datos del usuario? ¿Pueden moverse entre regiones?
- **Right to erasure**: flujo para eliminar todos los datos de un usuario (GDPR, CCPA)

**Lo que falta:**
- Log retention configurable por organización
- Export de audit log en formato estándar (JSON-L, CSV)
- `DELETE /api/users/:id/data` endpoint que elimina todos los datos asociados
- Documentación de qué datos se almacenan, dónde y por cuánto tiempo

---

#### C2. Seguridad de la sandbox de bash

El motor de permisos dinámico existe y controla qué tools puede usar cada sesión. Pero el sandbox de bash actual (`core/sandbox/`) no está aislado a nivel de proceso/sistema operativo:
- Un agente con acceso a `bash` puede leer archivos fuera de su workspace si el servidor no está correctamente contenido
- No hay límites de recursos por sesión (CPU, memoria, tiempo de ejecución)
- No hay auditoría de los comandos bash ejecutados (solo de las tool calls)

**Lo que falta:**
- Evaluar sandboxing real: `gvisor`, `nsjail`, o al menos `bubblewrap` para aislar procesos bash
- Resource limits por sesión: `ulimit` o cgroups según el entorno de deploy
- Audit log específico para bash: comando, directorio, usuario, duración, exit code
- Política explícita de qué paths están fuera del alcance de bash (configuración en `SpacesHost`)

---

#### C3. Rate limiting real

El 04-5 menciona rate limiting por organización, pero la implementación está pendiente incluso a nivel de usuario. Un agente en loop infinito puede agotar la cuota del proveedor de un usuario en minutos.

**Lo que falta:**
- Rate limiting por usuario/organización a nivel de API (Hono middleware)
- Circuit breaker por proveedor: si un proveedor falla consecutivamente N veces, se deshabilita temporalmente
- Budget caps por sesión/agente: límite de tokens o de llamadas antes de solicitar confirmación humana
- Alertas cuando el uso se acerca a un threshold configurado

---

### D. Experiencia de usuario avanzada

El 04 añade UI para workflows, observabilidad y pipelines. Lo que el 04 no resuelve es la experiencia para usuarios más sofisticados:

#### D1. Colaboración en tiempo real

Hoy un proyecto pertenece a un usuario. Múltiples usuarios no pueden colaborar en el mismo proyecto simultáneamente.

**Lo que falta:**
- Modelo de permisos compartidos: owner, editor, viewer por proyecto
- Presence: indicadores de quién está viendo o editando qué
- Conflict resolution básico: si dos usuarios editan el mismo archivo simultáneamente
- Activity feed por proyecto: qué hicieron los agentes y los usuarios

---

#### D2. Marketplace de agents y plugins

Una vez que el Plugin API (04-8) existe, el paso natural es un marketplace:
- Publicar un agente o plugin que otros puedan instalar con un click
- Ratings, versiones, compatibilidad con versión de Spaces
- Private marketplace para organizaciones (solo visible internamente)

**Lo que falta:**
- Modelo de datos de marketplace: publisher, versión, manifest, reviews
- UI de discovery e instalación
- Proceso de verificación/trust para plugins externos (no podemos instalar código arbitrario sin revisión)
- Sandboxing de plugins externos (un plugin instalado no debe poder leer datos de otros usuarios)

---

#### D3. Mobile y acceso reducido

El cliente es una SPA optimizada para desktop. Acceder desde mobile es posible pero la UX no está pensada para pantallas pequeñas.

**Lo que falta:**
- UI responsiva o una PWA optimizada para mobile
- Modo de solo visualización para mobile: ver el estado de agentes y delegaciones sin editar
- Notificaciones push cuando una delegación completa o un agente pide aprobación

---

### E. Escalabilidad y operaciones a escala

El 04 resuelve multi-tenancy conceptualmente. Lo que no resuelve es qué pasa cuando la plataforma crece más allá de un servidor.

#### E1. Stateful session → distributed

Actualmente las sesiones están en memoria en el proceso del servidor. Si el servidor se reinicia, las sesiones activas pierden estado. Para escalar horizontalmente:
- Las sesiones necesitan externalizarse (Redis/Valkey o persistencia en SQLite con sincronización)
- WebSocket con sticky sessions: si hay múltiples instancias, el WS de una sesión debe siempre ir al mismo proceso
- Los procesos MCP son por usuario y están en memoria local — no se replican trivialmente

**Lo que falta:**
- Evaluar qué parte del estado de sesión es realmente stateful vs. reconstruible desde disco
- Estrategia de sticky sessions si se escala horizontalmente (nginx, HAProxy, Caddy)
- Health check del server que expire sesiones huérfanas al reiniciar

---

#### E2. Background job queue

Los workflows (04-3) y los pipelines (04-7) tienen ejecución asíncrona. Con un servidor único y muchos usuarios ejecutando workflows concurrentemente, se necesita:
- Cola de jobs con prioridades
- Workers separados del proceso HTTP (para que una pipeline larga no bloquee requests)
- Dead letter queue: qué pasa con un job que falla repetidamente

**Lo que falta:**
- Evaluar una queue: BullMQ (Redis), pg-boss (Postgres), o un in-process scheduler con Bun
- Separación de concerns: HTTP server vs. job runners
- UI de estado de jobs pendientes, en ejecución y fallidos

---

#### E3. Backup y disaster recovery

El estado del sistema vive en SQLite + filesystem local. Para producción real:
- Backup automatizado de SQLite (no solo el procedimiento manual del B2)
- Replicación: ¿el workspace directory puede estar en S3 o similar?
- RTO/RPO definidos: ¿cuánto tiempo de inactividad y pérdida de datos es aceptable?

**Lo que falta:**
- Backup automatizado (cron + compress + upload a S3/Backblaze/similar)
- Restore procedure documentado y testeable desde cero
- Opción de almacenamiento de workspace en object storage (S3-compatible API)

---

## Resumen: horizonte post-04

```
Deuda de calidad (pre-condición para todo lo demás):
├── Testing: integración del server + contract tests del SDK + CI completo
├── Typecheck/lint unificado desde la raíz (pnpm typecheck / pnpm lint desde root)
└── Variables de entorno documentadas + self-hosting validado end-to-end

Distribución y confianza:
├── SDK: publicación automatizada (Changesets) + TypeDoc + ejemplo externo
├── Auditoría completa: retention configurable, export, GDPR/right-to-erasure
├── Sandbox de bash real (aislamiento de procesos a nivel OS)
└── Rate limiting + circuit breakers por proveedor

Experiencia avanzada:
├── Colaboración en tiempo real (permisos compartidos, presence, activity feed)
├── Marketplace de agents/plugins (con sandboxing de plugins externos)
└── Mobile / PWA + notificaciones push

Escalabilidad:
├── Sesiones distribuidas (externalizar estado de memoria)
├── Background job queue separada del proceso HTTP
└── Backup automatizado + object storage (S3-compatible)
```

---

## Prioridad si tuviéramos que elegir solo una cosa

**Testing de integración.** Todo lo demás — SDK publicado, marketplace, multi-tenancy — se construye sobre un sistema que actualmente no tiene ningún assertion automatizado sobre sus flujos críticos. El primer incidente en producción con un cliente externo va a encontrar un bug que una prueba de integración habría detectado.

Sin testing de integración, el crecimiento post-04 es frágil por definición.

---

## Pregunta que hay que responder antes de escalar

**¿Cuál es el modelo de negocio que determina la arquitectura de distribución?**

- **SaaS managed**: el equipo opera Spaces para los usuarios → priorizar multi-tenancy fuerte, auditoría, rate limiting, backup automatizado
- **Self-hosted open-source**: los usuarios instalan Spaces ellos mismos → priorizar self-hosting documentado, SDK externo, plugin marketplace
- **Hybrid**: SaaS + opción de self-hosted → el SDK y SpacesHost son el mecanismo de extensión, pero la infraestructura debe soportar ambos modelos

Esta decisión determina cuáles de los puntos de este documento son urgentes vs. postergables.
