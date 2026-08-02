# create-verificable-plans

Crea o audita planes de implementación con criterios de aceptación verificables mediante comandos bash/grep exactos. Se activa cuando el usuario pide crear un plan, escribir tareas, definir acceptance criteria, auditar un plan existente, o asegurar que un plan no se puede marcar como completado sin evidencia.

---

## Workflow

### Cuando el usuario pide CREAR un plan

```
1. Para cada tarea, definir de 3 a 7 criterios de aceptación
2. Cada criterio DEBE ser un comando bash/grep/pnpm con resultado esperado exacto
3. El plan DEBE incluir una sección de "Verificación Global" con criterios cross-tarea
4. El plan DEBE terminar con una "Regla de Cierre" explícita
5. Validar el plan contra los Anti-Patrones antes de entregarlo
```

### Cuando el usuario pide AUDITAR un plan existente

```
1. Contar tareas totales vs tareas con criterios verificables
2. Para cada tarea sin criterios, marcar como "Negro" (inaceptable)
3. Para cada tarea con criterios, verificar que no sean narrativos/anti-patrones
4. Entregar tabla de puntaje con fallas específicas por tarea
5. Si se solicita, crear versión corregida del plan
```

---

## Formato de Tarea con Criterios

````markdown
### Tarea X.N — [descripción breve]

**Acción**: [qué se hace concretamente — verbos: eliminar, crear, migrar, reemplazar]

**Archivos**: [paths exactos afectados]

**Criterios de aceptación**:

```bash
# AC1: [qué verifica — legible para humanos]
[comando exacto]
# Resultado esperado: [valor concreto. Ej: 0 matches, exit code 0, "No such file or directory"]

# AC2: [qué verifica]
[comando exacto]
# Resultado esperado: [valor concreto]
```
````

---

## Catálogo de Comandos de Verificación

### Eliminación de archivos

```bash
# AC: El archivo X NO debe existir
ls ruta/al/archivo.ts 2>&1
# Resultado esperado: "No such file or directory"
```

### Eliminación de imports

```bash
# AC: Nadie importa de X (excluyendo tests)
rg "from ['\"].*ruta/eliminada" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches
```

### Eliminación de patrones en un archivo

```bash
# AC: El patrón X NO debe aparecer en el archivo Y
rg "patrón" ruta/al/archivo.ts
# Resultado esperado: 0 matches
```

### Verificación de reemplazo correcto

```bash
# AC: El archivo Y ahora importa de la nueva fuente Z
rg "import.*Z" ruta/al/archivo.ts
# Resultado esperado: al menos 1 match
```

### Conteo exacto

```bash
# AC: Debe existir exactamente N implementaciones de la interfaz I
rg -l "implements I" packages/ --type ts
# Resultado esperado: N archivos
```

### Verificación de ausencia global

```bash
# AC: El patrón X NO debe existir en ningún archivo del directorio Y
rg "patrón" apps/ --type ts --glob '!**/__tests__/**' --glob '!**/__mocks__/**'
# Resultado esperado: 0 matches
```

### Compilación

```bash
# AC: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

### Build

```bash
# AC: Build exitoso
pnpm build
# Resultado esperado: exit code 0
```

### Tamaño de archivo

```bash
# AC: El archivo X tiene menos de N líneas
wc -l ruta/al/archivo.ts
# Resultado esperado: < N
```

### Verificación de export

```bash
# AC: X exporta Y
rg "export.*Y" ruta/al/archivo.ts
# Resultado esperado: al menos 1 match
```

---

## Estructura de Verificación Global

Todo plan debe terminar con:

````markdown
## Verificación Global

```bash
# VG1: [qué verifica]
[comando]
# Resultado esperado: [valor]

# VG2: ...
[comando]
# Resultado esperado: [valor]
```
````

## Regla de Cierre

Una tarea **no está completa** hasta que **todos** sus criterios de aceptación devuelven el resultado esperado. Si un criterio falla, la tarea se reabre. Los comandos son la única verdad.

````

---

## Anti-Patrones — Lo que NUNCA debe aparecer en un plan

| Anti-patrón | Por qué falla | Ejemplo |
|---|---|---|
| Criterio narrativo sin comando | No es verificable | "El código debe estar limpio" |
| "Verificar manualmente" | No es automatizable | "Probar que el chat funciona" |
| Resultado esperado ambiguo | No es booleano | "Debe estar vacío o no existir" (elegir uno) |
| Criterio demasiado genérico | Falsos positivos | `rg "@deprecated" directorio/` sin especificar qué interfaz |
| "Debe funcionar correctamente" | Circular | "El sistema debe responder bien" |
| Comentario en vez de comando | No ejecuta nada | "# Solo constantes de configuración" |
| `ls` sin `2>&1` | Falla silenciosa | `ls archivo.ts # Debe fallar` → no captura stderr |

---

## Reglas de Calidad por Plan

| Métrica | Umbral mínimo |
|---|---|
| Tareas con criterios verificables | 100% (todas) |
| Criterios por tarea | 3-7 |
| Criterios globales (cross-tarea) | 4-8 |
| Criterios narrativos o anti-patrones | 0 |
| Criterios con resultado esperado explícito | 100% |

---

## Ejemplo Completo

### ❌ Versión narrativa (inaceptable)

```markdown
### Tarea 17.1 — Eliminar AgentSession

Reemplazar AgentSession por IAgentRuntime en session-manager.ts.
````

**Resultado real**: el archivo se borró, pero `session-manager.ts` redefinió `type AgentSession = any` localmente. Tarea marcada "completada".

### ✅ Versión con criterios verificables

````markdown
### Tarea 17.1 — Eliminar AgentSession de session-manager.ts

**Acción**: Eliminar `type AgentSession = any` local. Importar `IAgentRuntime` de `@spaces/core`.
Reemplazar todas las ocurrencias del tipo `AgentSession` por `IAgentRuntime`.

**Archivos**: `apps/server/src/core/session-manager.ts`

**Criterios de aceptación**:

```bash
# AC1: No existe "type AgentSession = any" como workaround local
rg "type AgentSession\s*=\s*any" apps/server/src/core/session-manager.ts
# Resultado esperado: 0 matches

# AC2: Importa IAgentRuntime de @spaces/core
rg "import.*IAgentRuntime.*@spaces/core" apps/server/src/core/session-manager.ts
# Resultado esperado: al menos 1 match

# AC3: Cero ": any" types en el archivo
rg ": any\b" apps/server/src/core/session-manager.ts
# Resultado esperado: 0 matches

# AC4: Cero referencias al tipo AgentSession en el archivo
rg "\bAgentSession\b" apps/server/src/core/session-manager.ts
# Resultado esperado: 0 matches (salvo strings o comentarios)

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```
````

---

_Origen: auditoría post-implementación de Planes 16-18 donde 25/26 singletons sobrevivieron y un crash en runtime pasó desapercibido porque los criterios eran narrativos._
