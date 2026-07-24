# Spaces — Hardening de seguridad (Plan 08)

> Este documento es un plan de acción concreto basado en un análisis competitivo contra Google ADK.
> Cada área identifica el estado actual, cómo lo resuelve ADK, y qué hay que implementar en Spaces.
> Las rutas y fragmentos de código citados existen en el repositorio al momento de escribir este plan.

---

## Área 1: Clave de cifrado hardcodeada (CRÍTICA)

### Diagnóstico

`apps/server/src/lib/env-crypto.ts:8` contiene:

```ts
const hashKey = secret || "dev-fallback-secret-key-spaces-default-1234567890";
```

Esto significa que **cualquier instalación sin `BETTER_AUTH_SECRET` configurado usa exactamente la misma clave de cifrado**. La clave está commiteada en texto plano en el repositorio. Un atacante que obtenga la base de datos de una instancia Spaces puede descifrar todas las credenciales de proveedores cifradas porque conoce la clave por defecto.

### Evidencia adicional — logging de secretos parciales

`apps/server/src/routes/settings.ts:232` imprime prefijos y sufijos de API keys a consola:

```ts
console.log(`[DIAGNOSTIC TEST-IMAGE-GEN] Resolved key length: ${apiKey.length}. Start: '${apiKey.substring(0, 15)}' End: '${apiKey.substring(apiKey.length - 15)}'`);
```

Esto es un vector de fuga de credenciales: cualquier log aggregator, sistema de monitoreo, o incluso el stdout del contenedor expone fragmentos de keys. Además, el patrón `[DIAGNOSTIC ...]` sugiere que es código de debugging que nunca debió llegar a producción.

### Cómo lo resuelve ADK

ADK usa `secretlint` en pre-commit y en CI para detectar API keys de Google Cloud y patrones estándar de secretos (API keys, tokens, contraseñas). El linter bloquea el commit antes de que el código llegue al repositorio.

### Lo que falta:

- **Eliminar el fallback hardcodeado.** `env-crypto.ts` debe crashear al inicio si `BETTER_AUTH_SECRET` no está definido, con un mensaje de error claro:
  ```
  FATAL: BETTER_AUTH_SECRET environment variable is required.
  Generate one with: openssl rand -hex 32
  ```
  Alternativa: auto-generar una clave criptográficamente aleatoria si no se provee, persistirla internamente (no hardcodeada), y advertir en el log que se generó una clave efímera.

- **Eliminar todo logging de API keys.** Borrar los `console.log`/`console.error` con `[DIAGNOSTIC TEST-IMAGE-GEN]` en `settings.ts:232,240`. Cualquier logging de diagnóstico que use prefijos/sufijos de secretos debe eliminarse completamente.

- **Ejecutar auditoría completa del codebase** en busca de:
  - Strings que parezcan API keys, tokens o credenciales.
  - `console.log` o `console.error` con `substring` sobre variables llamadas `key`, `token`, `secret`, `password`.
  - Cualquier hardcodeo de valores que deban ser secretos.

- **Agregar una regla de ESLint** que detecte `console.log` y obligue a usar un logger estructurado (o al menos marque warning en CI).

---

## Área 2: Detección y prevención de secretos

### Diagnóstico

Hoy Spaces no tiene **ningún mecanismo de detección de secretos**. No hay:

- `secretlint` ni `gitleaks` ni `trufflehog` en el repositorio.
- `.gitattributes` para archivos grandes (binarios, modelos, bases de datos) — aunque `.gitignore` sí excluye `.env`.
- Escaneo automatizado en pre-commit o CI.

El Área 1 demuestra que el riesgo es real: se commiteó una clave de cifrado hardcodeada y nadie la detectó.

### Cómo lo resuelve ADK

ADK usa `secretlint` con `@secretlint/secretlint-rule-preset-recommend` más una regla custom para el formato de API keys de Google Cloud. Corre en dos puntos:

| Punto | Propósito |
|---|---|
| Pre-commit (husky/lint-staged) | Bloquear el commit antes de que llegue al repo |
| CI (GitHub Actions) | Segunda barrera: si alguien esquiva el pre-commit, CI lo detecta |

### Lo que falta:

- Instalar `secretlint` como devDependency en la raíz del monorepo:
  ```
  pnpm add -D secretlint @secretlint/secretlint-rule-preset-recommend
  ```

- Crear `.secretlintrc.json` en la raíz con:
  - `@secretlint/secretlint-rule-preset-recommend`
  - Reglas custom para formatos de keys que Spaces usa:
    - `sk-*` (OpenAI)
    - `sk-ant-*` (Anthropic)
    - `xai-*` (Grok/XAI)
    - `gemini-*` (Google)
    - Cualquier otro formato de provider integrado

- Agregar al workflow de CI existente (`.github/workflows/`) un paso:
  ```yaml
  - name: Secret scan
    run: pnpm secretlint "**/*"
  ```

- Agregar a pre-commit hooks (husky o equivalente):
  ```
  npx secretlint --maskSecrets "**/*"
  ```

- Crear `.gitattributes` con reglas para archivos binarios o grandes:
  ```
  *.db binary
  *.sqlite binary
  *.tar.gz binary
  ```

---

## Área 3: Mejoras de seguridad en Auth

### Diagnóstico

El sistema de autenticación actual tiene tres vulnerabilidades estructurales:

#### 3a. Tokens por query parameter

`apps/server/src/lib/auth-helpers.ts:177` y `apps/server/src/auth/middleware.ts:69` aceptan autenticación vía `?token=` en la URL. Esto es un vector de riesgo porque:

- Los query parameters se loguean en proxies, load balancers, y server access logs en texto plano.
- Quedan en el historial del navegador.
- Se comparten si alguien copia y pega una URL.

#### 3b. CORS sin restricción

`apps/server/src/index.ts:50`:

```ts
origin: (origin) => origin || "*",
```

Esto permite que **cualquier origen** haga requests al servidor con credenciales. En producción, cualquier sitio web malicioso puede hacer requests autenticados a la API de Spaces si el usuario tiene una sesión activa.

#### 3c. Sin rate limiting en auth

No existe rate limiting en `/api/auth/login`, `/api/auth/register`, ni ningún otro endpoint de autenticación. Esto los hace vulnerables a brute-force de credenciales.

#### 3d. Sin headers de seguridad

No hay `helmet` ni middleware equivalente que agregue headers como `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`.

### Cómo lo resuelve ADK

ADK soporta OAuth 2.0, Service Account y OpenID Connect a través de `AuthHandler`. La autenticación viaja siempre en headers HTTP estándar, nunca en query params.

### Lo que falta:

- **Eliminar soporte de token por query parameter.** Migrar completamente a:
  - Cookie (`spaces_session` o similar, httpOnly, secure, sameSite=strict).
  - Header `Authorization: Bearer <token>`.

  El middleware de auth debe rechazar explícitamente tokens en query params (con un warning claro en logs para que los usuarios sepan que migren).

- **Restringir CORS a un allowlist configurable.** Opciones:
  - Variable de entorno `ALLOWED_ORIGINS` (lista separada por comas).
  - En producción: rechazar orígenes no autorizados en lugar de aceptar cualquier origen.

  ```ts
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  origin: (origin) => {
    if (!origin) return null;
    if (allowedOrigins.length === 0) return origin; // dev mode
    return allowedOrigins.includes(origin) ? origin : null;
  }
  ```

- **Implementar rate limiting en auth endpoints.** Usar un middleware Hono con store en memoria o con persistencia opcional:
  - `/api/auth/login`: 5 intentos por IP por minuto.
  - `/api/auth/register`: 3 registros por IP por hora.

  Si la store de rate limiting es solo en memoria, documentar que en producción conviene usar Redis/Valkey para persistir los contadores entre reinicios.

- **Agregar middleware de security headers.** Usar una librería liviana o implementación manual para Hono:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` (política inicial relajada, refinable con el tiempo)

- **Documentar HTTPS como requisito de producción.** Agregar una sección en `docs/self-hosting.md` o el `.env.example` que indique explícitamente que Spaces debe correr detrás de un reverse proxy con TLS (Caddy, Nginx, Traefik) en producción.

---

## Área 4: Hardening del sandbox de Bash

### Diagnóstico

`apps/server/src/ai/bash-tool.ts:26` tiene una lista hardcodeada de puertos protegidos:

```ts
const protectedPorts = [3000, 3001, 4104, 5173];
```

Esto es razonable como primera línea de defensa, pero insuficiente como sandbox real:

- **Sin aislamiento a nivel de proceso.** Los comandos bash corren en el mismo proceso y sistema operativo que el servidor. Un agente puede leer archivos fuera de su workspace, acceder a `/etc/passwd`, leer variables de entorno del servidor, o escribir en directorios del sistema.
- **Sin límites de recursos.** No hay timeout explícito por comando, ni límite de output, ni restricciones de CPU o memoria. Un `fork bomb` o un comando con output infinito puede tumbar el servidor.
- **Sin audit log específico.** Las tool calls se registran, pero los comandos bash individuales no tienen un log de auditoría separado con: comando exacto, duración, exit code, directorio de trabajo.
- **Puertos protegidos hardcodeados.** Si un `SpacesHost` custom corre servicios en otros puertos, esos puertos no están protegidos. Si se cambian los defaults, la protección se rompe.

### Cómo lo resuelve ADK

ADK define tres niveles de ejecución con límites de seguridad explícitos:

| Nivel | Clase ADK | Nivel de aislamiento |
|---|---|---|
| Built-in | `BuiltInCodeExecutor` | Sin sandbox, para entornos confiables |
| Local con riesgos | `UnsafeLocalCodeExecutor` | Documenta explícitamente que es inseguro y solo para dev |
| Sandbox real | `AgentEngineSandboxCodeExecutor` | Ejecución aislada con sandbox del Agent Engine |

El modelo es claro: el developer elige explícitamente qué nivel de riesgo acepta.

### Lo que falta:

- **Límites de recursos por ejecución bash:**
  - Timeout configurable por sesión (ej. 30s por defecto, configurable en `SpacesHost`).
  - Tamaño máximo de output: truncar a N bytes (ej. 50KB) con indicador `[...truncated]`.
  - Evaluar `ulimit` en Linux o alternativas en otros OS para limitar memoria y CPU.

- **Audit log de comandos bash.** Separado del log general de tool calls, con estructura:
  ```ts
  {
    sessionId: string;
    userId: string;
    command: string;
    cwd: string;
    startTime: number;
    endTime: number;
    exitCode: number | null;
    signal: string | null;       // SIGTERM, SIGKILL, etc.
    outputTruncated: boolean;
    error: string | null;
  }
  ```

- **Evaluar aislamiento real de procesos.** Opciones ordenadas por nivel de esfuerzo:
  | Solución | Aislamiento | Complejidad |
  |---|---|---|
  | `child_process` con `timeout` + `maxBuffer` | Mínimo | ✅ Ya existe parcialmente |
  | `bubblewrap` (bwrap) | Medio — namespaces Linux, filesystem aislado | Medio |
  | `nsjail` | Alto — seccomp, cgroups, network isolation | Medio-alto |
  | Docker/Podman ephemeral containers | Alto — container completo, más lento | Alto |
  | `gvisor` (runsc) | Muy alto — syscall interception en userspace | Alto |

  Recomendación: implementar `bubblewrap` para Linux como default cuando esté disponible, con fallback a `child_process` + límites para otros OS. Documentar las limitaciones de cada modo.

- **Puertos protegidos configurables.** Exponer vía `SpacesHost` o variable de entorno `PROTECTED_PORTS` (coma-separated). Mantener defaults razonables (`3000,3001,4104,5173`) pero permitir que el host agregue los suyos.

- **Política de paths restringidos.** Agregar a `SpacesHost` una propiedad `restrictedPaths: string[]` (default: `["/etc", "/proc", "/sys", "/dev", "~/.ssh"]`). El bash tool debe rechazar comandos que referencien estos paths, incluso si el agente intenta ofuscarlos.

---

## Área 5: Rate Limiting y circuit breakers

### Diagnóstico

Spaces no tiene rate limiting en la API. Las consecuencias son:

- Un agente en un loop infinito puede consumir toda la cuota del proveedor de un usuario sin que nada lo detenga.
- Un actor malicioso puede hacer brute-force de endpoints de auth sin restricción.
- No hay protección contra un usuario que, accidental o intencionalmente, sobrecargue el servidor con requests concurrentes.

Tampoco existe un circuit breaker para proveedores: si OpenAI o Anthropic empiezan a fallar, Spaces reintentará indefinidamente sin backoff ni desactivación temporal.

### Cómo lo resuelve ADK

ADK expone `Runner.maxLlmCalls` — un límite explícito de cuántas llamadas al LLM puede hacer una invocación. Es una protección contra loops infinitos y runaway costs.

### Lo que falta:

- **Rate limiting middleware para Hono.** Implementar usando store en memoria (con opción de Redis):
  - **Por IP:** límite general de requests por minuto (ej. 100 req/min por IP).
  - **Por usuario:** límite de tool calls por minuto (ej. 30 tool calls/min por sesión).
  - **Por sesión/agente:** budget de tokens totales antes de requerir confirmación humana (ej. 100K tokens o 25 llamadas al LLM).
  - **Auth endpoints:** límites más estrictos (ver Área 3c).

  Estructura del middleware:
  ```ts
  rateLimiter({
    windowMs: 60000,              // ventana de 1 minuto
    max: 100,                     // máximo de requests
    keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
    store: memoryStore(),         // o redisStore()
  })
  ```

- **Circuit breaker por proveedor.** Patrón state machine (closed → open → half-open):
  - Closed: operación normal, contar fallos consecutivos.
  - Open: N fallos consecutivos → rechazar requests inmediatamente por M segundos.
  - Half-open: permitir 1 request de prueba después de M segundos. Si falla, volver a Open. Si funciona, volver a Closed.

  Configuración:
  | Parámetro | Default | Descripción |
  |---|---|---|
  | `failureThreshold` | 5 | Fallos consecutivos antes de abrir el circuito |
  | `resetTimeout` | 30000 (30s) | Tiempo antes de probar half-open |
  | `halfOpenMaxRequests` | 1 | Requests permitidos en estado half-open |

  Implementar como wrapper de provider calls en `apps/server/src/ai/providers/`.

- **Alerts y thresholds.** Agregar eventos cuando:
  - Una sesión excede el 80% de su token budget.
  - Un circuit breaker se abre (proveedor entra en fallo).
  - Un usuario excede su rate limit (posible abuso o bug).

  Estos eventos deben ser emitidos vía el sistema de eventos/WebSocket existente para que el dashboard de observabilidad (04-4) los muestre.

- **Documentar políticas de rate limiting.** Agregar al `.env.example` y a la documentación de self-hosting las variables de configuración de rate limiting con sus defaults y recomendaciones.

---

## Resumen: Áreas de seguridad

```
CRÍTICO — atacar inmediatamente:
├── Área 1: Clave hardcodeada + logging de secretos
│   ├── Eliminar fallback en env-crypto.ts
│   ├── Borrar logs de diagnóstico de API keys
│   └── Auditoría completa de secretos en el codebase
└── Área 2: Infraestructura de detección de secretos
    ├── secretlint en pre-commit + CI
    └── .gitattributes para archivos binarios

ALTO — antes de producción con datos reales:
├── Área 3: Auth security
│   ├── Eliminar tokens por query parameter
│   ├── Restringir CORS
│   ├── Rate limiting en auth endpoints
│   └── Security headers
└── Área 5: Rate limiting y circuit breakers
    ├── Hono rate limiter middleware
    ├── Per-session token budgets
    └── Circuit breaker por proveedor

MEDIO — mejora continua del sandbox:
└── Área 4: Bash sandbox hardening
    ├── Resource limits (timeout, output, memory)
    ├── Audit log específico de bash
    ├── Evaluar bubblewrap/nsjail para aislamiento real
    └── Puertos protegidos y paths restringidos configurables
```

---

## Prioridad: quemar los barcos

El Área 1 no es negociable. La clave de cifrado hardcodeada es una vulnerabilidad que expone todas las credenciales de proveedores de cualquier instalación de Spaces que no haya configurado `BETTER_AUTH_SECRET`. El fix no es complejo — reemplazar un string por un crash con mensaje claro — pero el impacto de no hacerlo es que **cualquier base de datos de Spaces es descifrable con una clave pública que está en GitHub**.

La metáfora es correcta: **hay que quemar los barcos**. Eliminar el fallback hardcodeado y forzar que cada instalación tenga su propia clave de cifrado. Sin excusas. Sin "solo para desarrollo". Si un developer local necesita una clave, que la genere. El costo de generarla es un comando de 2 segundos. El costo de no hacerlo es un incidente de seguridad con datos de usuarios reales expuestos.

Área 2 es la segunda prioridad absoluta porque es la prevención estructural: si existiera `secretlint`, el Área 1 no habría ocurrido. La combinación de Área 1 + Área 2 cierra la puerta a que esto vuelva a pasar.

---

## Pregunta abierta para el equipo

**¿Cuál es el modelo de confianza del bash sandbox?**

Hoy el sandbox protege contra errores accidentales del agente, no contra un agente adversario. Para un producto que ejecuta código generado por LLMs en nombre del usuario, la pregunta es:

- ¿Spaces se posiciona como "confiamos en el usuario y el usuario confía en su agente" (sandbox liviano, advertencias documentadas)?
- ¿O Spaces garantiza que el agente no puede escapar del sandbox bajo ninguna circunstancia (nsjail/gvisor, con el costo de complejidad operativa que eso implica)?

Esta decisión determina si el Área 4 es urgente o incremental.
