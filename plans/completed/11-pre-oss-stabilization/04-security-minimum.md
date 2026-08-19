# Hito 04 — Hardening de seguridad mínima para OSS / self-host

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P0 — riesgo de account takeover, path traversal y CSRF en deploys por defecto  
**Estimación relativa:** M  
**Depende de:** ninguna de 01–03 para compilar; puede implementarse en paralelo tras 01  
**No bloquea:** 05 runtime/tools (salvo tocar `tool-factory` bash env)  
**Alcance filosófico:** **mitigar lo explotable con esfuerzo S–M** y documentar el modelo de amenaza real. **No** es aislamiento multi-tenant SaaS completo (containers por workspace / gVisor) — eso se declara explícitamente fuera y en SECURITY.md.

---

## 1. Problema (evidencia)

### 1.1 Bash no es sandbox; además recibe sesión completa de 7 días

```60:78:apps/server/src/core/session/tool-factory.ts
const token = createProgrammaticSessionSync(username);
env: { ...userEnv, TOKEN: token, JWT_TOKEN: token }
outputFilter: filterSecretsFromOutput(output, Object.values(userEnv))
// TOKEN / JWT_TOKEN NO están en la lista de secrets a filtrar
```

- `createProgrammaticSessionSync` inserta sesión con **TTL 7 días** (`onboarding.ts` L38, L76).
- Mismo patrón en `manage-delegations-tool.ts` (~L213).
- Cada invocación bash puede crear **otra** sesión en DB sin cleanup obvio → acumulación + superficie de robo.
- `verifyCommandSafety` / `restricted-paths` = denylist por substring — defensa en profundidad débil, no isolation.

### 1.2 Zip Slip en import de backup

```141:144:apps/server/src/routes/backup.ts
zip.extractAllTo(userDir, true);
```

Sin validar que cada entry quede bajo `userDir`. Clásico path traversal vía `../`.

### 1.3 CORS reflect-any con credentials

```65:68:apps/server/src/index.ts
if (ALLOWED_ORIGINS.length === 0) return origin; // "development mode default"
```

Self-host sin env = cualquier origen malicioso puede usar cookies de sesión del usuario.

### 1.4 Session token en JSON de auth

```51:51:apps/server/src/routes/auth.ts
token: session ? session.session.token : null,
```

Login/register también devuelven token parseado de cookie. Client lo guarda en React state (`AuthContext`). Anula parte del beneficio HttpOnly frente a XSS.

### 1.5 Preview de builds sin autenticación

`routes/preview.ts` documenta serve estático **without authentication** (path username+project). `preview-server.ts` usa `Access-Control-Allow-Origin: *`.

### 1.6 Secret de auth: docs ≠ código

| Fuente                                 | Variable             |
| -------------------------------------- | -------------------- |
| `.env.example`, `docs/self-hosting.md` | `SPACES_AUTH_SECRET` |
| `auth/config.ts` (uso real)            | `BETTER_AUTH_SECRET` |
| `env-crypto.ts` mensaje de error       | menciona ambas       |

Operador sigue la doc → secret “configurado” que la app **ignora**.

### 1.7 Otros (prioridad secundaria dentro del hito)

- Health expone `dataPath` (`index.ts` L83).
- Logs de middleware con **prefix de token** (`auth/middleware.ts`).
- Upload files sin max size explícito (DoS) — si cabe en tiempo, límites; si no, documentar follow-up.
- Docker root / `chmod 777` — hito 08 packaging salvo fix trivial.

---

## 2. Objetivo del hito

Entregar un **piso de seguridad honesto** para open source self-host **single-trust-admin** (un operador controla el host):

| #   | Meta            | Barra de éxito                                                                                                   |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| A   | Tokens en bash  | No sesión de 7 días en env; TTL corto **o** eliminación del token de sesión completa; siempre redacted en output |
| B   | Zip import      | Imposible escribir fuera de `userDir`                                                                            |
| C   | CORS            | Production/fail-closed sin allowlist; dev explícito                                                              |
| D   | Auth JSON token | Browser confía en cookie; no exponer session token en `/status` (y preferible login) sin justificación           |
| E   | Secrets env     | `BETTER_AUTH_SECRET \|\| SPACES_AUTH_SECRET` + docs alineados                                                    |
| F   | Preview         | Default más seguro **o** documentado + opt-in + IDs menos adivinables si esfuerzo bajo                           |
| G   | Threat model    | `SECURITY.md` / self-host: bash = host privileges del proceso del proceso                                        |
| H   | Tests           | zip-slip, CORS boot, token filter, secret name, TTL                                                              |

**Fuera de alcance (declarar, no implementar aquí):**

- gVisor / Firecracker / bubblewrap multi-tenant.
- Seccomp network policy completa.
- CSP sin `unsafe-inline` (mejora P2).
- Rate-limit Redis multi-instancia (documentar limitación).
- E2E pentest automatizado completo.
- Non-root Docker exhaustivo (hito 08, salvo one-liner si ya hay USER stage).

---

## 3. Decisiones de diseño (justificadas)

### D1 — Modelo de amenaza explícito: single-node trusted operator

**Decisión:** README/SECURITY dejan claro:

> Spaces agent `bash` runs as the **server OS user** with access to that user's data directory. It is **not** a multi-tenant hardened sandbox. Do not expose a shared instance to untrusted end-users without additional isolation.

**Por qué:** pretender “sandbox” con denylist es peor que honestidad OSS (issue reports + false sense of security).  
**Por qué no** bloquear el release OSS hasta bubblewrap: esfuerzo L y rompe DX Windows/mac dev; es roadmap post-11.

### D2 — Tokens en bash: scoped short-lived + redact + prefer no full session

**Opciones evaluadas:**

| Opción                                                         | Pros             | Contras                                                                |
| -------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| A. Quitar TOKEN/JWT del env por completo                       | Máxima seguridad | Rompe scripts/agent workflows que llaman API local con TOKEN           |
| B. TTL corto (5–15 min) + delete after command + filter output | Mantiene compat  | Sigue siendo session token si el schema de better-auth no tiene scopes |
| C. Token distinto “tool” con ACL solo workspace                | Ideal            | Requiere auth redesign (fuera de M)                                    |

**Decisión (híbrido B + mitigaciones):**

1. **Nueva API** `createEphemeralToolSession(username, opts?: { ttlSeconds?: number })`:
   - Default **TTL 10 minutos** (600s), no 7 días.
   - Inserta sesión igual que ahora **pero** con expiresAt corto.
   - Nombre de función nuevo; deprecar uso de `createProgrammaticSessionSync` desde tool-factory/delegations.

2. **Reusar un solo token por sesión de agente** (no por cada bash call):
   - Cache en memoria: `Map<`${username}:${sessionId}`, { token, expiresAt }>` en módulo pequeño `tool-session-tokens.ts`.
   - Evita saturar tabla `session` con miles de rows.
   - Refresh si queda < 60s.

3. **outputFilter** siempre incluye el token activo (+ JWT_TOKEN same value) además de userEnv secrets.

4. **Opcional env flag** `SPACES_BASH_INJECT_TOKEN=0` para operadores que no necesitan API-from-bash → no inyectar.

5. **No** loguear token prefix en factory WS auth (hito 02/04 overlap): si se toca factory, quitar `token.slice(0,8)` log.

**Por qué no solo quitar tokens (A) sin flag:** puede romper demos/docs internas que usan `curl -H "Authorization: … $TOKEN"`. Flag + TTL es compromiso OSS.

**Por qué no 7 días “pero filtered”:** filter falla con encoding/chunking/`env | base64`; TTL limita ventana.

**Efectos secundarios:**

- Scripts largos >10 min que reutilizan TOKEN sin refresh fallarán → documentar; cache refresh en cada spawnHook si near expiry cubre bash largos **si cada comando re-entra spawnHook** (sí: cada execute llama hook).
- Sesiones efímeras antiguas: job opcional de cleanup `DELETE FROM session WHERE expiresAt < now` en startup (recomendado, barato).

### D3 — Zip Slip: validar entries antes de extraer

**Decisión:** Reemplazar `extractAllTo` por loop:

```ts
for (const entry of zip.getEntries()) {
  const target = path.resolve(userDir, entry.entryName);
  if (!target.startsWith(userDirResolved + path.sep) && target !== userDirResolved) {
    throw new Error(`Illegal zip entry path: ${entry.entryName}`);
  }
  // extract entry to target
}
```

- Reject absolute paths, `..`, symlink escape si adm-zip los expone.
- Límite de tamaño total descomprimido (p.ej. 500MB) y número de entries (p.ej. 50k) anti-zip-bomb básico.
- **Tests** con entry `../../etc/passwd` style bajo tmpdir.

**Por qué no** cambiar de librería en este hito: adm-zip ya está; validación es suficiente si es correcta. Evaluar `yauzl`/`unzipper` en follow-up si hay CVEs.

**Efecto secundario:** backups legítimos con paths raros fallan cerrado — correcto.

### D4 — CORS fail-closed

**Decisión:**

```ts
const isProd = process.env.NODE_ENV === "production" || process.env.SPACES_ENV === "production";

origin: (origin) => {
  if (!origin) return null; // same-origin / non-browser
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  }
  if (isProd) {
    // Fail closed: do not reflect
    return null;
  }
  // Dev only: reflect for DX
  return origin;
};
```

**Además en prod sin ALLOWED_ORIGINS:** log **fatal warning** al startup (o `throw` si `SPACES_STRICT_SECURITY=1`).

**Decisión startup:**

- Default prod: **warn + CORS deny all browser cross-origin** (app same-origin sigue OK sin header Origin).
- `SPACES_STRICT_SECURITY=1`: **exit(1)** si falta allowlist o secret.

**Por qué no** exit(1) siempre en prod: rompe deploys same-origin puros que no setean allowlist (Coolify same host). Warn es suficiente si no se refleja origin.

**Por qué no** mantener reflect en prod “por DX”: es el bug P0.

**Docs:** `.env.example` + self-hosting: `ALLOWED_ORIGINS=https://app.example.com`.

### D5 — Dejar de devolver session token en JSON (browser cookie-first)

**Decisión por endpoint:**

| Endpoint               | Hoy                                  | Después                                                                                                                                                            |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/auth/status` | `{ token: session.token }`           | **Sin** `token` (o `token: null` always). Client usa `credentials: "include"` + cookie.                                                                            |
| `POST login/register`  | devuelve token copiado de Set-Cookie | **Sin** token en body si Set-Cookie ya se envió. Si algún client no-browser necesita token, header `X-Spaces-Return-Token: 1` opt-in **o** documentar cookie-only. |

**Client `AuthContext`:**

- Dejar de persistir token en state para API calls si `apiFetch` ya manda cookies.
- WS auth: hoy puede mandar `{ type: "auth", token }`. Opciones:
  1. WS confía en cookie del upgrade handshake (si ya lo hace en onOpen).
  2. Si hace falta token en primer mensaje, obtener de cookie no es posible en JS si HttpOnly — **debe** autenticarse en `onOpen` via cookie header (server ya tiene path cookie).

**Verificar al implementar:** `factory.ts` onOpen cookie auth. Si suficiente, client **deja de enviar token** en mensaje auth (solo `{ type: "auth" }` o nada post-cookie).

**Por qué:** reduce robo vía XSS/extensiones del bearer en memoria/JSON.  
**Efecto secundario:** cualquier integración que leía `data.token` del status se rompe — monorepo client se actualiza; documentar breaking en CHANGELOG hito 08.

**Decisión:** breaking **aceptado** pre-OSS (aún no hay API pública estable).

### D6 — Unificar secret env names

**Decisión:**

```ts
function getAuthSecret(): string | undefined {
  return process.env.BETTER_AUTH_SECRET || process.env.SPACES_AUTH_SECRET;
}
```

Usar en `auth/config.ts` y `env-crypto.ts`.  
`.env.example`: documentar **ambos** con preferencia `SPACES_AUTH_SECRET` como nombre producto y `BETTER_AUTH_SECRET` como alias better-auth.  
`docker-compose.yml`: alinear.

**Por qué alias y no solo renombrar:** no romper deploys que ya usan BETTER_AUTH_*.

### D7 — Preview: default documentado + endurecimiento mínimo

**Opciones:**

| Opción                                                    | Esfuerzo | Efecto                    |
| --------------------------------------------------------- | -------- | ------------------------- |
| A. Firmar URLs HMAC TTL                                   | M        | Mejor                     |
| B. Requerir cookie auth en `/api/preview/files/...`       | S–M      | Rompe iframe cross-origin |
| C. Opt-in `SPACES_PUBLIC_PREVIEW=1` + default off en prod | S        | Seguro por defecto        |
| D. Solo documentar riesgo                                 | S        | Débil                     |

**Decisión:** **C + docs** en este hito; diseñar A como follow-up en SECURITY.md roadmap.

- Si prod y no `SPACES_PUBLIC_PREVIEW=1` → preview assets requieren misma auth que API (cookie).
- Dev: public OK para DX.
- CORS `*` en preview-server: en prod sin public preview, no aplica; si public, mantener * solo para assets estáticos read-only **consciente**.

**Efecto secundario:** iframes de preview en otro origen dejan de funcionar sin flag — correcto para OSS default.

### D8 — Health no filtra paths internos en prod (menor)

**Decisión:** `dataPath` solo si `NODE_ENV !== "production"` o si `SPACES_HEALTH_VERBOSE=1`.

**Por qué:** info leak menor pero gratis de quitar.

### D9 — Reducir logs de secretos

**Decisión:** Eliminar o gate detrás de `SPACES_DEBUG_AUTH=1`:

- token prefix logs en middleware y WS factory.
- cookie header dumps.

### D10 — Upload size limit (si tiempo; si no, ticket explícito)

**Decisión:** Límite global body Hono/Bun si existe API sencilla (p.ej. 25MB default `SPACES_MAX_UPLOAD_MB`).  
Si la API de Bun no lo permite limpio en este hito: check `file.size` en `files.ts` upload handlers + backup import.

**Backup import:** además del zip-slip, max compressed size (e.g. 200MB).

### D11 — Tests obligatorios de este hito

| Test                                     | Qué demuestra                                |
| ---------------------------------------- | -------------------------------------------- |
| `zip-slip.test.ts`                       | entry `../outside` rejected                  |
| `bash-output-filter` o tool-factory unit | token aparece como `***hidden***`            |
| `cors-config` pure function              | prod + empty allowlist → null; dev → reflect |
| `getAuthSecret`                          | lee SPACES_ o BETTER_                        |
| `ephemeral-session`                      | expiresAt - now ≈ ttl                        |

### D12 — Qué NO hacer en bash “sandbox” este hito

No reescribir `verifyCommandSafety` como “real sandbox”.  
Sí: mantener denylist; **añadir** nota en código + SECURITY.  
Opcional menor: bloquear `curl file://` / lectura de `SPACES_DATA_PATH` parents — fácil de bypassear; no vender como fix.

---

## 4. Ajustes concretos (checklist)

### 4.1 Ephemeral tool tokens + filter

- [ ] **Crear** `apps/server/src/auth/ephemeral-tool-session.ts` (o bajo `core/session/`)
  - `getOrCreateToolSessionToken(username, sessionId, ttlSeconds = 600): string`
  - `revokeToolSessionToken(...)` opcional
  - cleanup expired rows helper `purgeExpiredSessions()` called on server boot (best-effort)
- [ ] **Editar** `apps/server/src/auth/onboarding.ts`
  - Parametrizar TTL en create programmatic; no hardcode 7d para tool path
  - Dejar 7d solo si hay caller legítimo no-tool (grep); si solo tools usan sync, acortar default del sync o split functions
- [ ] **Editar** `apps/server/src/core/session/tool-factory.ts`
  - Usar ephemeral + cache por sessionId
  - outputFilter: `[token, ...userEnv values]`
  - Respetar `SPACES_BASH_INJECT_TOKEN=0`
- [ ] **Editar** `apps/server/src/core/tools/manage-delegations-tool.ts`
  - Misma política (no divergir subagent bash)
- [ ] **Editar** `apps/server/src/core/bash-output-filter.ts` si hace falta API `filterSecretsFromOutput(output, secrets)` ya OK
- [ ] **Tests** TTL + redact

**Efectos secundarios:** ver D2. Subagents heredan mismo mecanismo.

### 4.2 Zip-slip backup

- [ ] **Editar** `apps/server/src/routes/backup.ts`
  - safeExtract(zip, userDir)
  - size limits
  - auth ya debe existir en route — **verificar** que import exige auth (si no, P0 fix)
- [ ] **Crear** `apps/server/src/core/backup/safe-zip-extract.ts` (preferible extraer lógica pura)
- [ ] **Tests** con zip malicioso en tmp

### 4.3 CORS + boot warnings

- [ ] **Editar** `apps/server/src/index.ts` (o `core/security/cors.ts` pure)
  - Lógica D4
  - Startup warn
- [ ] **Editar** `.env.example` — ALLOWED_ORIGINS, SPACES_STRICT_SECURITY, SPACES_PUBLIC_PREVIEW, SPACES_BASH_INJECT_TOKEN, secrets
- [ ] **Editar** `docs/self-hosting.md` sección seguridad mínima (párrafo + env table) — **no** reescribir todo el doc (hito 08)

### 4.4 Auth token JSON + client

- [ ] **Editar** `apps/server/src/routes/auth.ts` — quitar token de status/login/register body (D5)
- [ ] **Editar** `apps/client/src/contexts/AuthContext.tsx` — no depender de body token; cookie session
- [ ] **Editar** WS client auth message si aplica
- [ ] **Verificar** `apiFetch` credentials include (ya)
- [ ] Smoke: login → API → WS → logout

**Efectos:** breaking para externos; OK pre-OSS.

### 4.5 Secret name unify

- [ ] **Editar** `apps/server/src/auth/config.ts`
- [ ] **Editar** `apps/server/src/lib/env-crypto.ts` si resuelve secret aparte
- [ ] **Editar** `docker-compose.yml` / `.env.example` / self-hosting snippet
- [ ] Test pure getAuthSecret

### 4.6 Preview gate

- [ ] **Editar** `apps/server/src/routes/preview.ts` — auth middleware cuando prod && !PUBLIC_PREVIEW
- [ ] **Editar** `preview-server.ts` solo si sirve el mismo threat; documentar
- [ ] Nota en SECURITY.md

### 4.7 Hygiene

- [ ] Health dataPath conditional (D8)
- [ ] Strip token prefix logs (D9)
- [ ] Upload/backup max size (D10) best-effort
- [ ] **Editar** `SECURITY.md` — threat model paragraph + reporting still valid + “known limitations: bash host access, preview flag”

### 4.8 Verificación cierre

- [ ] typecheck server + client
- [ ] tests nuevos en verde
- [ ] Grep candados:
  ```bash
  rg 'extractAllTo' apps/server/src  # no hits o solo dentro safe wrapper test
  rg 'createProgrammaticSessionSync' apps/server/src/core  # no en tool-factory/delegations
  rg 'JWT_TOKEN' apps/server/src/core
  ```
- [ ] Manual: prod-like `NODE_ENV=production` without ALLOWED_ORIGINS → browser cross-origin fails; app same host works
- [ ] Manual: bash `echo $JWT_TOKEN` → output redacted or empty if inject off

---

## 5. Archivos a tocar (matriz)

| Archivo                                               | Acción                         | Por qué                  | Efectos secundarios        |
| ----------------------------------------------------- | ------------------------------ | ------------------------ | -------------------------- |
| `auth/ephemeral-tool-session.ts` (nuevo)              | Crear                          | TTL corto + cache        | —                          |
| `auth/onboarding.ts`                                  | Editar                         | TTL parametrizado        | Callers deben pasar TTL    |
| `core/session/tool-factory.ts`                        | Editar                         | inject + filter          | Scripts >TTL               |
| `core/tools/manage-delegations-tool.ts`               | Editar                         | paridad subagent         | —                          |
| `core/bash-output-filter.ts`                          | Menor                          | —                        | —                          |
| `core/backup/safe-zip-extract.ts` (nuevo)             | Crear                          | zip-slip                 | —                          |
| `routes/backup.ts`                                    | Editar                         | usar safe extract        | imports fallan si zip malo |
| `index.ts` / `core/security/cors.ts`                  | Editar                         | CORS                     | dev vs prod DX             |
| `routes/auth.ts`                                      | Editar                         | no token JSON            | breaking client            |
| `client/.../AuthContext.tsx`                          | Editar                         | cookie-first             | —                          |
| `client/.../ws-client.ts`                             | Menor                          | auth sin token si cookie | coordinar factory onOpen   |
| `auth/config.ts`, `lib/env-crypto.ts`                 | Editar                         | secret alias             | —                          |
| `routes/preview.ts`, `preview-server.ts`              | Editar                         | gate                     | preview DX                 |
| `auth/middleware.ts`, `ws/factory.ts`                 | Editar                         | menos logs secretos      | debug más difícil sin flag |
| `.env.example`, `docs/self-hosting.md`, `SECURITY.md` | Editar                         | verdad                   | —                          |
| `docker-compose.yml`                                  | Editar                         | secret names             | —                          |
| `__tests__/*` seguridad                               | Crear                          | candados                 | —                          |
| `ai/bash-tool.ts` denylist                            | **No** reescribir como sandbox | D12                      | —                          |
| Dockerfile non-root                                   | **No** (hito 08) salvo trivial | —                        | —                          |

---

## 6. Efectos secundarios y riesgos (resumen)

| Riesgo                                                    | Severidad           | Mitigación                                |
| --------------------------------------------------------- | ------------------- | ----------------------------------------- |
| Romper scripts que dependen de TOKEN 7d                   | Media               | TTL 10m + refresh por comando; docs; flag |
| Acumulación sesiones DB histórica                         | Baja                | purge on boot                             |
| CORS prod niega front en dominio distinto mal documentado | Alta percibida      | .env.example + self-host warning claro    |
| Login client roto sin token body                          | Alta si mal migrado | smoke AuthContext; cookies SameSite       |
| Preview roto en demos                                     | Media               | PUBLIC_PREVIEW=1 en dev compose           |
| False confidence “ahora es multi-tenant safe”             | Alta reputacional   | SECURITY.md honest D1                     |
| Zip bombeo no cubierto del todo                           | Media               | size/entry limits básicos                 |
| Quitar token JSON rompe mobile wrappers externos          | Baja pre-OSS        | CHANGELOG                                 |

---

## 7. Criterios de hecho (DoD)

1. tool-factory/delegations no crean sesión 7d por bash; output redacts token.
2. Zip con `../` no escribe fuera de userDir (test).
3. `NODE_ENV=production` + empty ALLOWED_ORIGINS **no** refleja Origin (test pure).
4. `/api/auth/status` no devuelve session token usable.
5. `SPACES_AUTH_SECRET` o `BETTER_AUTH_SECRET` funcionan.
6. Preview no es público en prod por defecto (o flag explícito).
7. SECURITY.md describe bash=host y limitations.
8. typecheck + tests seguridad verdes.
9. No se implementó de paso aislamiento container ni hitos 05–08.

---

## 8. Secuencia de implementación sugerida

1. Pure helpers: cors decision, getAuthSecret, safe-zip-extract + tests.
2. Ephemeral tokens + tool-factory + delegations + redact tests.
3. CORS + health + log hygiene en index/middleware.
4. Auth JSON + client cookie-first + WS smoke.
5. Preview gate.
6. Docs fragments (.env.example, self-hosting security section, SECURITY.md).
7. Grep candados + typecheck.
8. Marcar checkboxes.

**PR separado** de 01–03 preferible (seguridad revisable sola).

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿TTL tool token 10 minutos + cache por sessionId?** → **Sí**
2. **¿Flag `SPACES_BASH_INJECT_TOKEN=0` para desactivar inject?** → **Sí**
3. **¿CORS prod sin allowlist = deny reflect (no crash) + warn?** → **Sí**
4. **¿Quitar token del JSON de auth (breaking monorepo)?** → **Sí**
5. **¿Preview público off en prod salvo `SPACES_PUBLIC_PREVIEW=1`?** → **Sí**
6. **¿Alias `SPACES_AUTH_SECRET` \|\| `BETTER_AUTH_SECRET`?** → **Sí**
7. **¿Implementar bubblewrap/gVisor ahora?** → **No**
8. **¿Firmar URLs de preview (HMAC) ahora?** → **No** (roadmap en SECURITY.md)

Al confirmar, el siguiente texto será el **hito 05** (un path de runtime + `TOOL_GROUPS` único), salvo que indiques implementar antes.
