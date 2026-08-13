# Plan 40 — Arquitectura de Sandboxing Productivo y Robusto

**Estado:** 🔜 Pendiente de implementar — plan detallado listo

## 1. Contexto y Diagnóstico de Seguridad

En el informe de auditoría ejecutado sobre el entorno de ejecución (`592251ef40be`), se evidenciaron inconsistencias y vulnerabilidades estructurales severas:

1. **Filtro textual evasible (`isRestrictedPath`):** El mecanismo de seguridad bloquea rutas como `/etc`, `/proc`, `/sys`, `/dev` buscando coincidencias literales de subcadenas en el comando enviando a la shell (`lowerCmd.includes("/etc")`). Esto se evade de forma trivial con evaluación dinámica en cualquier runtime (Node.js, Python, Perl, Bash), p.ej. `node -e "const a='/et'; const b='c/hostname'; require('fs').readFileSync(a+b,'utf8')"`.
2. **Ejecución sin aislamiento como Root:** `LocalSandbox` invoca `Bun.spawn` directamente en el proceso host/contenedor como `root` (`uid=0`), dando lectura/escritura ilimitada sobre el filesystem real (`/etc`, `/proc`, `/sys`, `/app/data/spaces.db`, tokens y variables de entorno).
3. **Efectos colaterales en comandos válidos:** Comandos legítimos como `2>/dev/null` fallan al ser bloqueados falsamente por el filtro de cadenas al contener `/dev`.
4. **Shell mal reportado:** La plataforma reporta `bash`, pero `/bin/sh` apunta a `dash`, provocando fallos de sintaxis en construcciones como arrays `arr=(...)` o *process substitution* `<()`.
5. **Ausencia de cuotas de recursos:** No existen límites de memoria (RAM), CPU quota, o máximo de PIDs, permitiendo posibles denegaciones de servicio o procesos zombies en background (`nohup`, `&`).

---

## 2. Objetivos Arquitectónicos (según `backend.rules.md`)

- **Seguridad Basada en SO/Kernel (Sin Regexes):** Delegar la seguridad al aislamiento de contenedores (Docker/gVisor/Bubblewrap), usuarios sin privilegios (`uid: 1000`), montaje de filesystem root en solo lectura (`read-only rootfs`) y namespaces.
- **Ports First (Regla 1):** Extender la interfaz `ISandbox` en `apps/server/src/core/ports/sandbox.port.ts` definiendo contratos limpios para opciones de aislamiento y límites de recursos.
- **Inyección de Dependencias vía `ServerContext` (Regla 2):** Resolver el Sandbox a través de `ServerContext` (`createServerContext()`), inyectando el adaptador adecuado (`DockerSandbox` o `LocalSandbox`) según la configuración.
- **Tipos Compartidos y Validación Zod (Reglas 4 y 7):** Definir schemas de configuración de sandbox en `packages/shared/src/schemas.ts`.
- **Manejador Centralizado `AppError` (Regla 5):** Reemplazar errores genéricos por `AppError` estructurados (403 Forbidden, 500 Execution Error).
- **Módulos Especializados ≤ 300 Líneas (Regla 10):** Separar la gestión del sandbox en módulos con responsabilidad única: adaptador Docker, sanitizador de volúmenes, preparador de entorno y filtro de output.

---

## 3. Diagrama de la Arquitectura Propuesta

```mermaid
graph TD
    A[AgentRuntime / SessionToolFactory] -->|1. Revisa dependencias| B[ServerContext]
    B -->|2. Inyecta| C[ISandbox Adapter]
    C -->|Driver: docker| D[DockerSandbox Adapter]
    C -->|Driver: local| E[LocalSandbox Adapter]
    
    D -->|3. Prepara volúmenes y env| F[Docker Engine API / CLI Container]
    F -->|Mount ro| G[/ - Rootfs Read-Only]
    F -->|Mount rw| H[/workspace - Directos de Usuario]
    F -->|Mount tmpfs| I[/tmp - In Memory]
    F -->|Contención| J[Non-Root uid 1000 + cgroups + Seccomp]
```

---

## 4. Plan de Implementación Fase a Fase

### Fase 1: Rediseño del Puerto `ISandbox` y Schemas Tipados (`packages/shared`)

**Objetivos:**
- Actualizar la interfaz `ISandbox` en `apps/server/src/core/ports/sandbox.port.ts` para que soporte límites de recursos, montajes de volúmenes y entornos aislados.
- Crear los esquemas Zod reutilizables en `packages/shared/src/schemas.ts`.

**Cambios en Archivos:**
1. `packages/shared/src/schemas.ts`: Añadir `SandboxConfigSchema` y `SandboxLimitsSchema`.
2. `apps/server/src/core/ports/sandbox.port.ts`: Extender `SandboxExecutionOptions` con `limits`, `cwd`, `env`, `readOnlyRootFs`, `bindMounts`, `user`.

---

### Fase 2: Canonización y Sanitización de Rutas en `path-safety.ts`

**Objetivos:**
- Corregir `resolveSafePath` en `apps/server/src/core/tools/base/path-safety.ts` para resolver *symlinks* reales usando `node:fs` (`realpathSync`).
- Evitar bypasses de travesía de directorios mediante enlaces simbólicos o rutas relativas no resueltas en disco.

**Cambios en Archivos:**
1. `apps/server/src/core/tools/base/path-safety.ts`: Usar `realpathSync` en `workspaceDir` y `targetPath` existentes antes del chequeo de `relative()`. Lanzar `AppError("Access Denied", 403)`.
2. `apps/server/src/__tests__/path-safety.test.ts`: Agregar unit tests validando bloqueo de symlinks que apunten fuera del workspace.

---

### Fase 3: Adaptador `DockerSandbox` de Calidad Productiva

**Objetivos:**
- Crear el adaptador de infraestructura `DockerSandbox` en `apps/server/src/core/infra/sandbox/docker.sandbox.ts`.
- Ejecutar los comandos del usuario/agente dentro de un contenedor efímero con las siguientes restricciones estrictas:
  - `--user 1000:1000` (Usuario no privilegido).
  - `--read-only` (Rootfs en solo lectura).
  - `--tmpfs /tmp:rw,noexec,nosuid,size=64m` (Directorio temporal aislado en RAM).
  - `-v <workspaceDir>:/workspace:rw` (Workspace aislado como único punto de escritura en disco).
  - `--memory=512m --cpus=1.0 --pids-limit=100` (Límites de recursos cgroups).
  - Default shell forzada: `/bin/bash`.

**Cambios en Archivos:**
1. `apps/server/src/core/infra/sandbox/docker.sandbox.ts` **[NUEVO]**: Implementación de `ISandbox` usando `Docker CLI` o API del daemon.
2. `apps/server/src/core/infra/sandbox/index.ts` **[NUEVO]**: Re-exportador e inicializador de proveedores de sandbox.

---

### Fase 4: Integración en `ServerContext` y Deprecación de Regexes Textuales

**Objetivos:**
- Actualizar `createServerContext()` en `apps/server/src/core/infra/server-context.ts` para instanciar `DockerSandbox` cuando `SPACES_SANDBOX_DRIVER === "docker"` (o fallback a `LocalSandbox` en dev).
- Eliminar el chequeo de cadenas vulnerables `isRestrictedPath` en `apps/server/src/core/sandbox/restricted-paths.ts`.
- Modificar `BashTool` en `apps/server/src/core/tools/base/bash.tool.ts` para usar siempre la instancia de `ISandbox` provista por `ServerContext`.

**Cambios en Archivos:**
1. `apps/server/src/core/infra/server-context.ts`: Resolver `sandbox` por configuración inyectada.
2. `apps/server/src/core/tools/base/bash.tool.ts`: Remover `verifyCommandSafety()` redundante basada en regexes de rutas, manteniendo únicamente la protección básica contra el kill del PID principal del servidor Spaces.
3. `apps/server/src/core/sandbox/local.sandbox.ts`: Mantener solo como desarrollo local con aviso de advertencia si se ejecuta como root.

---

### Fase 5: Dockerfile de la Imagen Sandbox y Suite de Pruebas de Seguridad

**Objetivos:**
- Definir la imagen ligera del runner en `Dockerfile.sandbox` (Ubuntu 22.04 / Alpine con Bash, Node.js, Bun, Git, herramientas de build comunes) corriendo con usuario no-root `agent` (`uid=1000`).
- Crear pruebas automatizadas que verifiquen el bloqueo real a nivel de SO ante los intentos de bypass reportados.

**Cambios en Archivos:**
1. `Dockerfile.sandbox` **[NUEVO]**: Definición de la imagen del agente ejecutor.
2. `apps/server/src/__tests__/sandbox-security.test.ts` **[NUEVO]**: Integration tests que prueben:
   - Intentos de lectura/escritura en `/etc/passwd`, `/etc/shadow`, `/proc/1/environ` vía scripts dinámicos de Node/Python.
   - Uso de redirecciones `2>/dev/null`.
   - Limite de memoria y kill automático de *fork bombs*.

---

## 5. Matriz de Verificación y Criterios de Aceptación

| Prueba / Test | Comportamiento Esperado | Resultado Requerido |
|---|---|---|
| Bypass dinámico Node: `node -e "fs.readFileSync('/etc/passwd')"` | Falla por permiso del SO (`EACCES: permission denied`) al correr como `uid:1000` con `read-only rootfs`. | ✅ Bloqueado por Kernel |
| Escritura en `/etc`: `node -e "fs.writeFileSync('/etc/test', 'x')"` | Falla con `EROFS: read-only file system`. | ✅ Bloqueado por Kernel |
| Redirección legítima: `ls /workspace 2>/dev/null` | Ejecuta correctamente sin errores falsos de filtro textual. | ✅ Funcional |
| Ejecución de arrays en Shell: `arr=(1 2); echo ${arr[0]}` | Funciona sin error sintáctico porque la imagen corre `/bin/bash` por defecto. | ✅ Funcional |
| Intento de *Fork Bomb*: `:(){ :|:& };:` | Proceso abortado al alcanzar `--pids-limit=100`. | ✅ Contenido por cgroups |

---

## 6. Resumen de Archivos a Modificar / Crear

- `[NUEVO]` [Dockerfile.sandbox](file:///c:/Users/themi/AgentWorkspace/the-spaces/Dockerfile.sandbox)
- `[NUEVO]` [apps/server/src/core/infra/sandbox/docker.sandbox.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/infra/sandbox/docker.sandbox.ts)
- `[NUEVO]` [apps/server/src/__tests__/sandbox-security.test.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/__tests__/sandbox-security.test.ts)
- `[MODIFICAR]` [packages/shared/src/schemas.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/packages/shared/src/schemas.ts)
- `[MODIFICAR]` [apps/server/src/core/ports/sandbox.port.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/ports/sandbox.port.ts)
- `[MODIFICAR]` [apps/server/src/core/tools/base/path-safety.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/tools/base/path-safety.ts)
- `[MODIFICAR]` [apps/server/src/core/infra/server-context.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/infra/server-context.ts)
- `[MODIFICAR]` [apps/server/src/core/tools/base/bash.tool.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/tools/base/bash.tool.ts)
- `[DEPRECAR]` [apps/server/src/core/sandbox/restricted-paths.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/sandbox/restricted-paths.ts)
