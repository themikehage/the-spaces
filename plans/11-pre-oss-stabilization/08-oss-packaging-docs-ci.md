# Hito 08 — Verdad de packaging, docs, CI, SDK y self-host

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P1 OSS — el repo **parece** listo (MIT, SECURITY, CI) pero release/self-host/SDK/docs **mienten**; CI no falla en tests  
**Estimación relativa:** M  
**Depende de:** idealmente 01–07 implementados (docs describen el sistema real); puede empezar docs/CI en paralelo  
**Cierra** el plan 11 como checklist de “podemos abrir el repo sin sonrojo”

---

## 1. Problema (evidencia)

### 1.1 README y árbol desactualizados

- Árbol `openai-hack/` (README L23, L127) — nombre viejo del monorepo.  
- Omite `packages/spaces-sdk`, planes 07–11, contratos WS reales.  
- Sobreclaim hackathon OK como historia; **no** como arquitectura actual incompleta.

### 1.2 `spaces-sdk` no es publicable

```json
// packages/spaces-sdk/package.json
"private": true,
"main": "./src/index.ts",  // source, no dist
// sin license, build, files, publishConfig
// depende de "shared": "workspace:*"
```

Re-exports de shared; **sin** SpacesHost pese a `about.md`.  
Plan 09 vendió npm-ready; realidad = stub.

### 1.3 Changesets / release rotos

- `.changeset/config.json` existe.  
- `release.yml` corre `pnpm release`.  
- Root **no** tiene script `release`; `@changesets/cli` **no** está en deps.  
- Packages `private: true` → nada que publicar.

### 1.4 CI blando

```51:53:.github/workflows/ci.yml
- run: pnpm run test
  continue-on-error: true
```

- Sin `format:check`.  
- Client `test` script puede existir sin vitest/tests.  
- Sprint criterion “tests pasan de forma reproducible” **no** se cumple.

### 1.5 Self-host docs ≠ código

| Doc / example | Código |
|---------------|--------|
| `SPACES_AUTH_SECRET` | `BETTER_AUTH_SECRET` (hito 04 alias) |
| `pnpm start` root | apps **sin** script `start` fiable |
| `your-org/spaces` | repo real TBD |
| data path `~/.spaces-data` | default a menudo `/app/spaces` |
| `pnpm run stop` | no existe |

### 1.6 Artefactos y ruido contributor

- Bundles committed en `apps/server/public` (audit).  
- `docs/REPORTE.md` ruido irrelevante.  
- Channel/lab leftovers en naming (`channelId`, paths).  
- SECURITY.md sin email/GHSA concreto.  
- about.md overstates SDK/DI (actualizar post 05–06).

### 1.7 Turbo no cableado

`turbo.json` existe; root scripts no usan turbo — confusión o dead config.

---

## 2. Objetivo del hito

1. **Docs = código** (README, self-hosting, ARCHITECTURE, CONTRIBUTING, SECURITY threat model de 04, WS doc ya en 02).  
2. **CI verde de verdad:** tests fallan el job; format check; build.  
3. **Decisión de packaging explícita y ejecutada:**  
   - **Opción A (recomendada pre-v1):** monorepo app OSS, packages **private**, **no** npm publish; borrar o desactivar release workflow mentiroso; documentar “library embed = SpacesHost in-tree”.  
   - **Opción B:** publicar `@<scope>/spaces-contracts` (shared limpio) y opcionalmente sdk con build real.  
4. Scripts `start` / Docker / `.env.example` alineados con 04.  
5. Limpieza: public assets gitignore, REPORTE, channel rename doc or residual grep budget.  
6. about.md + steps.md + plans/index actualizados al cerrar plan 11.

**Fuera de alcance:**

- Marketing site rewrite.  
- Multi-tenant SaaS.  
- Completar bubblewrap (04 declared).  
- Implementar features de hitos 01–07 aquí (solo documentar estado).

---

## 3. Decisiones de diseño (justificadas)

### D1 — Packaging: honestidad antes que npm vanity

**Recomendación por defecto: Opción A (no publicar npm en el day-one OSS).**

**Por qué A:**

- El producto usable es el **monorepo app** (client+server).  
- `shared` mezcla contratos + paths Node + runtime classes — no es un package boundary limpio sin el split de audit P0.  
- Publicar un stub `spaces-sdk` daña más la reputación que no publicar.  
- Changesets sin consumidores es teatro.

**Qué implica A:**

1. Mantener `private: true` en packages.  
2. `spaces-sdk/package.json`: o bien  
   - **A1:** documentar como *workspace convenience re-export* interno, o  
   - **A2:** fold exports into `shared` y deprecar carpeta sdk.  
   - **Elegido A1** menos movimiento de imports.  
3. **Desactivar** `release.yml` o convertirlo en “github release tag monorepo version” **sin** npm publish.  
4. README: “Embeddable runtime: see ARCHITECTURE.md SpacesHost (in-repo). No separate npm package yet.”

**Opción B (si el usuario insiste en npm):**

1. Split `@scope/spaces-contracts` — solo Zod/types/ws-messages/tools-catalog (no Node fs paths).  
2. Build `tsup` → `dist/`, `files: ["dist"]`, license MIT, `publishConfig.access=public`.  
3. sdk package depends on contracts versioned, exports host **types** only or thin client — **not** full server.  
4. Añadir `@changesets/cli`, scripts `changeset`, `version-packages`, `release`.  
5. Scope npm `@spaces-ai/...` o el org real del repo.

**Pregunta de confirmación §9 elige A vs B.** Default plan text asume **A** con camino B documentado como follow-up `plans/12` si aplica.

### D2 — CI debe ser gate real

**Decisión:**

```yaml
- run: pnpm run format:check
- run: pnpm run typecheck
- run: pnpm run lint
- run: pnpm run test   # NO continue-on-error
- run: pnpm run build
```

- Si client no tiene tests: `test` script debe `exit 0` con mensaje o tener al menos 1 test placeholder de attention/streaming de hitos 03/07 — **preferible tests reales de 03/07**.  
- Server tests deben pasar; arreglar flaky antes de quitar continue-on-error.  
- Opcional: `pnpm audit --prod` continue-on-error al inicio, luego endurecer.

**Por qué no** dejar continue-on-error “hasta tener tests”: invalida la barra OSS y el criterion de steps.md.

### D3 — Scripts de runtime monorepo

**Decisión:**

| Script | Comportamiento |
|--------|----------------|
| `pnpm --filter server start` | `bun run src/index.ts` o dist entry documentado |
| `pnpm --filter client start` | `vite preview` o servir build |
| root `start` | `pnpm --filter server start` **solo server** (API) documentado; o `concurrently` server+preview client — **elegir server-only** para self-host API + static from server public |
| root `build` | ya recursive; asegurar server copia client build a `public/` en Docker/docs |

Documentar flujo self-host:

```bash
pnpm install
pnpm build
# set env
pnpm --filter server start
```

Eliminar referencias a `pnpm stop` o implementar no-op doc fix.

### D4 — README rewrite mínimo viable

**Secciones obligatorias:**

1. Qué es Spaces (1 párrafo).  
2. Threat model one-liner (bash=host; link SECURITY).  
3. Monorepo tree **real** (`the-spaces` / actual name, packages shared + spaces-sdk).  
4. Quick start dev (`pnpm dev`, ports 5100-style si aplica en este env — usar lo del repo).  
5. Self-host link.  
6. Architecture link.  
7. Contributing link.  
8. License MIT.  
9. Hackathon history → footnote o “History”, no el hero confuso con paths falsos.

### D5 — self-hosting.md end-to-end

**Checklist de verdad:**

- [ ] Clone URL placeholder `OWNER/REPO`  
- [ ] Bun+pnpm+Node versions  
- [ ] Env table: `SPACES_AUTH_SECRET` **and** `BETTER_AUTH_SECRET`, `ALLOWED_ORIGINS`, `SPACES_DATA_PATH`, flags de 04 (`SPACES_PUBLIC_PREVIEW`, `SPACES_BASH_INJECT_TOKEN`, `SPACES_STRICT_SECURITY`)  
- [ ] Docker compose: secrets required, ports, volumes, non-root **si 04/08 docker touch**  
- [ ] Bare metal start commands that work  
- [ ] Reverse proxy notes (TLS, WebSocket upgrade)  
- [ ] Backup/restore pointer  
- [ ] “Not multi-tenant hardened”  

### D6 — ARCHITECTURE.md

Actualizar:

- Diagrama packages real.  
- Composition root + ServerContext (post-06).  
- WS protocol link (02).  
- Tool catalog SSOT (05).  
- SpacesHost in-repo embed path.  
- Explicit **non-goals** npm sdk until B.

### D7 — CONTRIBUTING.md

Añadir:

- Package boundaries (no duplicate types; shared contracts).  
- Plan 11 hitos como contexto de deuda.  
- How to run tests; CI must pass.  
- Changeset policy: **N/A under option A**; under B explain.  
- AGENTS.md pointer.

### D8 — SECURITY.md

- Threat model paragraph (04 D1).  
- Known limitations: bash host, preview flag, single-admin registration.  
- Reporting: enable GitHub Private Vulnerability Reporting + placeholder email `security@…` or “use GHSA only” if no email.  
- **No** fingir SLA si no hay equipo — honest timelines.

### D9 — about.md / steps.md / plans/index

Al **cerrar implementación del plan 11** (no al aprobar texto):

- about.md: estado real DI/SDK/WS/security.  
- steps.md: sprint pre-OSS + checkboxes hitos 01–08.  
- `plans/index.md`: plan 11 activo/completado; planes 03–10 moved to completed if not already.  
- Marcar `11-pre-oss-stabilization/index.md` hitos done.

### D10 — Limpieza repo

| Item | Acción |
|------|--------|
| `apps/server/public` build assets | gitignore `assets/`, leave README or .gitkeep; build in CI/Docker |
| `docs/REPORTE.md` | delete o `docs/archive/` |
| channel leftovers | grep budget: rename comments/vars **or** document “channel legacy = ignore”; finish only safe renames |
| `turbo.json` | wire root `"build": "turbo run build"` **or** delete turbo if unused — **elegir wire if turbo already configured correctly**, else remove to reduce lie |
| Docker root user | non-root USER si no rompe volúmenes (best-effort; document if deferred) |

### D11 — Client test runner

**Decisión:**

- Si hitos 03/07 añadieron pure tests: asegurar `apps/client/package.json` test runner (vitest) **en devDependencies** y script funciona.  
- Si cero tests client: mínimo `src/lib/attention/normalize.test.ts` o streaming reducer del 07 — no dejar script roto.

### D12 — License headers / secretlint

Ya existen; verificar CI sigue corriendo. No reabrir.

### D13 — Versioning monorepo app

**Opción A:** tag git `v1.0.0` en GitHub Releases manual/changelog; root `private: true`.  
CHANGELOG.md entrada “Open source readiness” alineada a plan 11.

---

## 4. Ajustes concretos (checklist)

### 4.1 Decisión packaging (gate)

- [ ] Confirmar A vs B con maintainer  
- [ ] Si A: disable npm release; document sdk stub; optional deprecate publishConfig  
- [ ] Si B: split contracts, build, changesets, un-private, scope names — **scope creep controlado en sub-checklist B**

### 4.2 CI

- [ ] Remove `continue-on-error` on tests  
- [ ] Add `format:check`  
- [ ] Fix any failing tests blocking green  
- [ ] Ensure client test script valid  
- [ ] Optional audit step  

### 4.3 Scripts & Docker & env

- [ ] `start` scripts that work on server (and document client static)  
- [ ] `.env.example` complete post-04  
- [ ] `docker-compose.yml` secrets/ports/data path  
- [ ] Dockerfile non-root best-effort  
- [ ] self-hosting.md rewrite truth  

### 4.4 Docs surface

- [ ] README.md rewrite (D4)  
- [ ] ARCHITECTURE.md update (D6)  
- [ ] CONTRIBUTING.md (D7)  
- [ ] SECURITY.md (D8)  
- [ ] docs/websocket-protocol.md already 02 — link from README  
- [ ] docs/tool_registration_guide.md already 05 — link  
- [ ] Delete/archive REPORTE.md  
- [ ] about.md + steps.md al cierre  

### 4.5 spaces-sdk honesty

- [ ] package README: “internal workspace package; not published”  
- [ ] about.md no claim SpacesHost npm  
- [ ] index.ts comment SPDX + purpose  

### 4.6 Repo hygiene

- [ ] gitignore server public assets; stop tracking built bundles  
- [ ] turbo wire or remove  
- [ ] channel leftover note or safe cleanup  
- [ ] plans/index.md reflect plan 11  

### 4.7 Release workflow

- [ ] Option A: release.yml → GitHub Release on tag only **or** delete  
- [ ] Option B: real changesets publish  

### 4.8 Verificación cierre plan 11

- [ ] CI green on PR without continue-on-error  
- [ ] Fresh clone path: install → build → start with .env.example values (dev)  
- [ ] Docs reviewed against grep of old names `openai-hack`, `subscribe_session`, hardcode secrets  
- [ ] steps.md criterion: build, typecheck, lint, tests reproducible  
- [ ] Mark all 01–08 plan checkboxes + index  

---

## 5. Archivos a tocar (matriz)

| Archivo | Acción | Por qué | Efectos secundarios |
|---------|--------|---------|---------------------|
| `README.md` | Rewrite | first impression OSS | — |
| `docs/self-hosting.md` | Rewrite | operators | — |
| `ARCHITECTURE.md` | Update | core truth | — |
| `CONTRIBUTING.md` | Update | contributors | — |
| `SECURITY.md` | Update | threat model + reporting | — |
| `about.md` / `steps.md` | Update al cierre | project truth | — |
| `.env.example` | Sync 04 | — | — |
| `docker-compose.yml` / `Dockerfile` | Align | self-host | volume perms |
| `package.json` (root + apps) | start scripts; maybe turbo | — | — |
| `.github/workflows/ci.yml` | hard fail tests + format | quality gate | red CI until fixed |
| `.github/workflows/release.yml` | fix or neutralize | stop fake publish | — |
| `packages/spaces-sdk/**` | honesty README / optional leave private | — | — |
| `packages/shared` | only if B | publish split | large |
| `.gitignore` | public assets | — | need rebuild in docker |
| `docs/REPORTE.md` | remove | noise | — |
| `plans/index.md` + 11 index | status | — | — |
| `CHANGELOG.md` | entry | — | — |
| apps code | **minimal** — only start scripts, test runner deps | — | — |

---

## 6. Efectos secundarios y riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| CI red bloquea merges | Media deseada | fix tests before merge hito |
| Untrack public/ breaks docker expecting committed assets | Media | Docker multi-stage build client→server public |
| Option B half-done publish | Alta | prefer A; B all-or-nothing |
| Docs thrash vs still-moving 01–07 | Media | write 08 **after** or mark “as of plan 11” |
| Removing openai-hack branding upsets hackathon narrative | Baja | History section |
| security@ email without inbox | Baja | GHSA only |

---

## 7. Criterios de hecho (DoD)

1. README/self-host/ARCHITECTURE no contienen paths o claims falsos (`openai-hack`, sdk npm, DI unused).  
2. CI falla si tests fallan; format check corre.  
3. `pnpm build` + start documentados funcionan en smoke.  
4. Packaging decision A o B **completa** (no hybrid mentiroso).  
5. SECURITY threat model presente.  
6. about/steps/plan 11 index actualizados.  
7. No bundled stale UI forced in git (or documented exception).  
8. Criterio de cierre steps.md del sprint cumplible.

---

## 8. Secuencia de implementación sugerida

1. Fix CI test gate + make test suite green (depends on 01–07 tests existing).  
2. start scripts + docker/env truth.  
3. Packaging decision execution (A neutralize release / B publish prep).  
4. README + self-hosting + ARCHITECTURE + CONTRIBUTING + SECURITY.  
5. Hygiene gitignore public, REPORTE, turbo.  
6. about/steps/plans/CHANGELOG cierre.  
7. Fresh clone smoke.  
8. Mark plan 11 complete.

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿Packaging day-one = Opción A (no npm; monorepo app OSS; sdk private documentado)?** → **Sí (A)**  
2. **¿CI tests sin `continue-on-error`?** → **Sí**  
3. **¿format:check en CI?** → **Sí**  
4. **¿Reescribir README eliminando árbol `openai-hack/`?** → **Sí**  
5. **¿self-hosting end-to-end alineado a env de hito 04?** → **Sí**  
6. **¿Untrack build assets en `server/public`?** → **Sí**  
7. **¿Implementar publish npm contracts+sdk ahora (B)?** → **No** (follow-up)  
8. **¿Email security concreto obligatorio?** → **GHSA enough** si no hay inbox  

---

## 10. Cierre del plan 11

Tras aprobar e implementar 01→08:

| Entregable | Estado esperado |
|-------------|-----------------|
| Regresión sessions/teams | 01 |
| Contrato WS + multi-session client | 02 |
| Attention store único | 03 |
| Seguridad mínima self-host | 04 |
| Runtime + TOOL_GROUPS SSOT | 05 |
| DI real + AgentSession boundary + no core→ws | 06 |
| God files / factory services / chat modular | 07 |
| Docs/CI/packaging honestos | 08 |

**Core robusto, extensible y mantenible** queda como dirección cumplida en lo **crítico**; deuda residual se lista en `plans/12-post-oss-backlog.md` (opcional, no este hito) si queda bubblewrap, npm B, dual chat 100%, etc.

---

Al confirmar el hito 08, **queda completa la redacción de los 8 hitos** del plan. El siguiente paso operativo es implementar empezando por **01** (o el orden que indiques).
