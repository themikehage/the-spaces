# Spaces — Foundations for Open-Source Launch

> Este documento detalla lo que Spaces necesita para ser un proyecto open-source creíble y mantenible.
> Hoy Spaces es un producto funcional pero cerrado: sin licencia, sin CI, sin documentación para contribuyentes externos.
> La pregunta que responde: ¿qué infraestructura mínima necesitamos para abrir el código y recibir contribuciones con confianza?

---

## Análisis: los 4 pilares que faltan para abrir el código

Un proyecto open-source no es solo código público. Es licencia, verificación automática, documentación para quien llega de afuera y canales claros para contribuir. Spaces tiene 0 de 4.

---

## 1. Licencia

### Estado actual

No existe archivo `LICENSE` en el repositorio. El `README.md` declara _"Proprietary — internal use"_. Ningún `package.json` tiene campo `license`. Ningún archivo fuente tiene encabezado SPDX.

| Qué falta                           | Estado                                          |
| ----------------------------------- | ----------------------------------------------- |
| Archivo `LICENSE`                   | ❌ No existe                                    |
| Campo `license` en `package.json`   | ❌ Ausente en los 7 `package.json` del monorepo |
| Encabezados SPDX en archivos fuente | ❌ No hay ninguno                               |
| Verificación de licencia en CI      | ❌ No existe CI                                 |

### Estado objetivo

- Archivo `LICENSE` en la raíz con MIT o Apache 2.0
- Campo `"license"` en el `package.json` raíz y en cada sub-paquete
- Encabezado SPDX (`// SPDX-License-Identifier: MIT`) en cada archivo `.ts` y `.tsx` del repositorio
- Regla de lint o script que verifique el encabezado en CI y falle el build si falta

### Lo que falta:

- **Elegir licencia**: MIT (máxima adopción, mínima fricción) vs. Apache 2.0 (protección de patentes, preferida por Google/ADK). Recomendación: MIT para maximizar adopción inicial, con opción de relicenciar si el modelo de negocio lo requiere.
- **Crear `LICENSE`** con el texto completo de la licencia elegida.
- **Agregar `"license": "MIT"`** en los 7 `package.json`: raíz, `apps/server`, `apps/client`, `apps/landing`, `packages/shared`, `apps/server/src/ai/vendor/agent`, `apps/server/src/ai/vendor/ai`.
- **Agregar encabezados SPDX** a todos los archivos `.ts`, `.tsx`, `.js`, `.jsx` del repositorio. Script de una sola pasada que recorra el árbol y agregue `// SPDX-License-Identifier: MIT` como primera línea si no existe.
- **Crear `scripts/check-license.sh`** (o equivalente en Node/Bun) que verifique que cada archivo fuente tiene el encabezado y falle con exit code 1 si encuentra archivos sin él.
- **Agregar verificación de licencia al CI**: paso que ejecuta `check-license.sh` y bloquea el merge si falla.
- **Actualizar `README.md`**: reemplazar _"Proprietary — internal use"_ por la licencia elegida y un badge de license shields.io.

---

## 2. CI/CD Pipeline

### Estado actual

No existe directorio `.github/`. No hay workflows de GitHub Actions. No hay verificación automática de lint, typecheck, build o test en push o PR. El nombre del paquete raíz es `openai-hack-scaffold`. No existe `turbo.json` para orquestación de builds en el monorepo. Los comandos `pnpm typecheck`, `pnpm lint` y `pnpm test` no existen a nivel raíz.

| Qué falta                                          | Estado                              |
| -------------------------------------------------- | ----------------------------------- |
| `.github/workflows/`                               | ❌ No existe                        |
| CI de validación (lint + typecheck + build + test) | ❌ Nada                             |
| Matrix de SO (ubuntu/windows/macos)                | ❌ No aplica sin CI                 |
| Release automation (Changesets / Release Please)   | ❌ No existe                        |
| `turbo.json`                                       | ❌ No existe                        |
| Nombre del paquete raíz                            | `openai-hack-scaffold` (incorrecto) |

### Estado objetivo

- GitHub Actions con un workflow de validación que corra en cada push y PR a `main`
- Matrix de SO: al menos ubuntu-latest (Windows y macOS deseables como stretch goal)
- Pasos del workflow: install → lint → typecheck → build → test
- Comandos unificados desde la raíz: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- `turbo.json` configurado para cacheo de builds y dependencias entre workspaces
- Release automation con Changesets: versionado semántico, changelogs automáticos, publicación a npm
- Root `package.json` renombrado de `openai-hack-scaffold` a `spaces`

### Lo que falta:

- **Crear `.github/workflows/ci.yml`** con job único (o matrix si es viable) que ejecute:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint` (todos los workspaces)
  - `pnpm typecheck` (todos los workspaces)
  - `pnpm build` (todos los workspaces)
  - `pnpm test` (todos los workspaces, con coverage thresholds si están definidos)
- **Agregar scripts raíz en `package.json`**: `"lint": "pnpm -r run lint"`, `"typecheck": "pnpm -r run typecheck"`, `"test": "pnpm -r run test"`, `"build": "pnpm -r run build"`.
- **Crear `turbo.json`** con pipeline que defina dependencias: `build` depende de `^build` (dependencias del workspace primero), `lint` y `typecheck` sin dependencias, `test` depende de `build`.
- **Renombrar root `package.json`**: `"name": "spaces"`.
- **Configurar Changesets**: instalar `@changesets/cli`, ejecutar `changesets init`, crear `.changeset/config.json` con `"baseBranch": "main"` y `"commit": false`, definir que los packages publicables son `packages/shared` (y futuros packages públicos).
- **Agregar workflow de release**: `.github/workflows/release.yml` que use `changesets/action` para crear PR de versionado automático al mergear a `main` y publique a npm.
- **Definir thresholds de coverage**: statements 70%, branches 65%, functions 70%, lines 70% como punto de partida (ajustables hacia arriba cuando la suite de tests madure).
- **Agregar `pnpm-lock.yaml`** al repo (verificar que existe; si no, generarlo con `pnpm install --lockfile-only`).

---

## 3. Documentación y Configuración

### Estado actual

No existe `.env.example`. El `README.md` referencia _"Provider API keys are configured through the UI"_ pero no documenta qué variables de entorno existen, cuáles son obligatorias, ni dónde se obtienen. Las variables de entorno están dispersas en más de 10 archivos fuente del servidor sin documentación central. Existen `Dockerfile` y `docker-compose.yml` pero sin guía de self-hosting. No existe `CONTRIBUTING.md` ni `CHANGELOG.md`.

| Qué falta                                       | Estado                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| `.env.example`                                  | ❌ No existe                                          |
| Documentación centralizada de env vars          | ❌ Dispersa en 10+ archivos fuente                    |
| Guía de self-hosting                            | ❌ No existe (hay Dockerfile y compose pero sin docs) |
| `CONTRIBUTING.md`                               | ❌ No existe                                          |
| `CHANGELOG.md`                                  | ❌ No existe                                          |
| Documentación de auto-generación de auth secret | ⚠️ Existe en código, no documentada                   |

### Estado objetivo

- `.env.example` con cada variable documentada: nombre, si es obligatoria u opcional, valor default, dónde obtenerla, notas de seguridad
- `docs/self-hosting.md` con procedimiento end-to-end: clonar → configurar → build → deploy → verificar
- `CONTRIBUTING.md` con setup de desarrollo, convenciones de código, flujo de PRs, firma de CLA si aplica
- `CHANGELOG.md` mantenido automáticamente por Changesets
- Todas las variables de entorno del servidor documentadas en un solo lugar (`.env.example` como fuente canónica)
- `SPACES_AUTH_SECRET` y su comportamiento de auto-generación documentados explícitamente

### Lo que falta:

- **Crear `.env.example`** con estructura anotada:
  ```
  # ── Requerido ──────────────────────────────────
  # SPACES_AUTH_SECRET: Clave para firmar JWTs. Se auto-genera si no se provee.
  #   En producción, establecer un valor fijo para que los tokens sobrevivan reinicios.
  # SPACES_DATA_PATH: Directorio de datos persistentes.
  #   Default: ~/.spaces-data (Linux/macOS) o %APPDATA%/spaces-data (Windows)
  #
  # ── Opcional ───────────────────────────────────
  # PORT: Puerto del servidor HTTP. Default: 3000
  # PREVIEW_HOST: Host header para el servidor de preview. Default: localhost
  # ... (todas las variables encontradas en el código fuente)
  #
  # ── Proveedores (opcionales, se configuran por UI) ──
  # Las API keys de proveedores (OpenAI, Gemini, etc.) se almacenan encriptadas
  # en la base de datos local. No es necesario configurarlas como variables de entorno.
  ```
- **Auditar variables de entorno en el código**: buscar todas las referencias a `process.env.*`, `Bun.env.*`, `import.meta.env.*` en `apps/server/` y `apps/client/` y asegurar que cada una esté documentada en `.env.example`.
- **Crear `docs/self-hosting.md`** con:
  - Requisitos previos: Node.js ≥ 20, pnpm ≥ 9, Bun ≥ 1.1 (solo para server)
  - Clonar el repo: `git clone https://github.com/.../spaces.git && cd spaces`
  - Instalar dependencias: `pnpm install`
  - Configurar: copiar `.env.example` a `.env` y ajustar valores
  - Build: `pnpm build`
  - Ejecutar: `pnpm start` (o `docker compose up -d` para Docker)
  - Verificar: `curl http://localhost:3000/api/health`
  - Backup y restore de datos
  - Troubleshooting común
- **Crear `CONTRIBUTING.md`** con:
  - Código de conducta (link a `CODE_OF_CONDUCT.md`)
  - Setup de desarrollo local (pnpm install, pnpm dev)
  - Convenciones de código (TypeScript strict, Tailwind v4, no `any`, absolute imports `@/`)
  - Flujo de PR: fork → branch → cambios → lint/typecheck/test → PR a `main`
  - Criterios de merge: CI verde, 1 review aprobatoria, sin conflictos
  - Guía de commits convencionales (`feat:`, `fix:`, `chore:`, `docs:`)
- **Crear `CHANGELOG.md`** inicial (vacío, poblado automáticamente por Changesets en el primer release).
- **Agregar health check endpoint** (`GET /api/health`) que reporte estado de la configuración: providers activos, variables faltantes, estado de la DB.

---

## 4. Infraestructura Comunitaria

### Estado actual

No existen archivos comunitarios: sin `CONTRIBUTING.md`, sin PR template, sin issue templates, sin `CODE_OF_CONDUCT.md`, sin `SECURITY.md`. No hay criterios formales de merge ni proceso de triage de issues.

| Qué falta                                               | Estado        |
| ------------------------------------------------------- | ------------- |
| `CODE_OF_CONDUCT.md`                                    | ❌ No existe  |
| `SECURITY.md`                                           | ❌ No existe  |
| PR template (`.github/pull_request_template.md`)        | ❌ No existe  |
| Issue templates (`bug_report.md`, `feature_request.md`) | ❌ No existen |
| Criterios de merge documentados                         | ❌ No existen |
| Proceso de triage de issues                             | ❌ No existe  |

### Estado objetivo

- `CODE_OF_CONDUCT.md` con Contributor Covenant 2.1 (estándar de la industria)
- `SECURITY.md` con proceso de reporte de vulnerabilidades y política de versión soportada
- `.github/pull_request_template.md` con checklist de calidad (tests, lint, docs, breaking changes)
- `.github/ISSUE_TEMPLATE/bug_report.md` con campos estructurados (versión, SO, pasos para reproducir, expected vs actual)
- `.github/ISSUE_TEMPLATE/feature_request.md` con campos estructurados (problema que resuelve, solución propuesta, alternativas consideradas)
- Branch protection en `main`: requerir PR, CI verde, al menos 1 review
- Proceso de triage documentado: labels estándar (`bug`, `enhancement`, `good first issue`, `help wanted`, `documentation`)

### Lo que falta:

- **Crear `CODE_OF_CONDUCT.md`**: adoptar Contributor Covenant 2.1, con contacto de reporte (email del maintainer).
- **Crear `SECURITY.md`** con:
  - Versiones soportadas (tabla con versión actual y estado de soporte)
  - Proceso de reporte: email dedicado (`security@...`) o GitHub Security Advisories
  - Tiempo de respuesta esperado (ej: 48h para acuse de recibo, 7 días para fix)
  - Política de divulgación coordinada
- **Crear `.github/pull_request_template.md`**:
  ```markdown
  ## Descripción

  <!-- Qué cambia y por qué -->

  ## Tipo de cambio

  - [ ] Bug fix
  - [ ] Nueva funcionalidad
  - [ ] Breaking change
  - [ ] Documentación
  - [ ] Refactor / mejora interna

  ## Checklist

  - [ ] El código sigue las convenciones del proyecto (TypeScript strict, no `any`, Tailwind v4)
  - [ ] Pasé `pnpm lint` y `pnpm typecheck` localmente
  - [ ] Agregué o actualicé tests
  - [ ] Actualicé la documentación si es necesario
  - [ ] Verifiqué que el build de producción funciona (`pnpm build`)
  ```
- **Crear `.github/ISSUE_TEMPLATE/bug_report.yml`** (formato YAML de GitHub) con campos: descripción, pasos para reproducir, comportamiento esperado, comportamiento actual, screenshots, environment (SO, versión de Spaces, browser).
- **Crear `.github/ISSUE_TEMPLATE/feature_request.yml`** con campos: problema que resuelve, solución propuesta, alternativas consideradas, contexto adicional.
- **Crear `config.yml`** en `.github/ISSUE_TEMPLATE/` para deshabilitar issues en blanco y linkear a discussions si aplica.
- **Configurar labels en GitHub**: `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `question`, `duplicate`, `wontfix`.
- **Configurar branch protection** en `main` desde la UI de GitHub (no automatizable vía archivos): requerir PR, requerir CI verde, requerir al menos 1 review, prohibir push directo.
- **Agregar badges al `README.md`**: license, CI status, version de npm (cuando se publique).

---

## Resumen: foundations para open-source

```
Licencia (pre-condición legal):
├── Elegir MIT o Apache 2.0
├── Crear archivo LICENSE
├── Agregar campo "license" en los 7 package.json
├── Encabezados SPDX en todos los archivos fuente
└── Script de verificación + CI

CI/CD (pre-condición de calidad):
├── .github/workflows/ci.yml: lint → typecheck → build → test
├── Scripts raíz unificados: pnpm lint / typecheck / test / build
├── turbo.json con pipeline de dependencias entre workspaces
├── Changesets para versionado automático y changelogs
└── Renombrar root package.json de "openai-hack-scaffold" a "spaces"

Documentación (pre-condición de accesibilidad):
├── .env.example con todas las variables anotadas (obligatorias vs. opcionales)
├── docs/self-hosting.md: procedimiento end-to-end
├── CONTRIBUTING.md: setup de dev, convenciones, flujo de PR
├── CHANGELOG.md (poblado por Changesets)
├── Auditoría de env vars en código fuente → documentar todas
└── Health check endpoint

Comunidad (pre-condición de colaboración):
├── CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
├── SECURITY.md (reporte de vulnerabilidades)
├── PR template con checklist de calidad
├── Issue templates: bug_report.yml + feature_request.yml
├── Labels estándar en GitHub
└── Branch protection en main
```

---

## Prioridad

El orden de las áreas **es** la prioridad:

1. **Licencia** — sin licencia, el código no es open-source. Es un bloqueante legal. Semana 1.
2. **CI/CD** — sin CI, cada contribución externa es una apuesta. El CI da confianza para mergear PRs de terceros. Semana 1-2.
3. **Documentación** — `.env.example` y `CONTRIBUTING.md` son lo primero que busca alguien que quiere probar o contribuir. Semana 2.
4. **Infraestructura comunitaria** — templates, CoC y SECURITY.md son necesarios antes de anunciar el proyecto públicamente. Semana 2-3.

Las 4 áreas son independientes entre sí y pueden trabajarse en paralelo si hay múltiples colaboradores. La licencia es el único bloqueante real — todo lo demás es acumulativo. Sin licencia, ningún otro archivo tiene sentido porque el proyecto sigue siendo propietario.

---

## Pregunta que hay que responder antes de ejecutar

**¿Cuál es el modelo de distribución?** Esta decisión determina no solo la licencia sino también la estrategia de release y el scope del CI:

- **Open-source comunitario puro**: MIT, GitHub Actions público, Changesets a npm público, sin restricciones → priorizar adopción y contribuciones externas.
- **Open-core con capa enterprise**: MIT para el core, licencia comercial para features avanzadas (multi-tenancy, SSO, audit logs) → el CI debe soportar dos pipelines de release distintos.
- **Source-available con licencia restrictiva** (BSL, Elastic License v2): el código es visible pero con limitaciones de uso comercial → afecta el tono de `CONTRIBUTING.md` y la relación con la comunidad.

La respuesta a esta pregunta define el texto de la licencia, el alcance de los workflows de CI/CD y el tipo de contribuciones que se esperan. Sin esta decisión, el plan se ejecuta sobre supuestos que pueden cambiar.
