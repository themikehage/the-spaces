# Arquitectura Primero — Metodología de Diseño Pre-Código

> **Cuándo usar**: al iniciar un proyecto nuevo, al hacer una migración arquitectónica, o al refactorizar un subsistema completo.
> **Origen**: una arquitectura hexagonal diseñada íntegramente en `AGENTS.md` + `PLAN.md` antes de escribir una sola línea de código.

---

## El Principio

> No se escribe código hasta que la arquitectura está definida, los patrones son innegociables, y los criterios de integridad son verificables.

El problema que resuelve: los proyectos crecen por acumulación. Cada feature nuevo parchea lo anterior. En 6 meses tenés god objects de 800 líneas, 26 singletons, y dependencias circulares que nadie vio venir. La arquitectura se degrada porque **nunca se definió**. Se improvisó.

---

## Los Dos Documentos Obligatorios

Antes de escribir la primera línea de código, deben existir dos archivos en la raíz del proyecto:

### 1. `AGENTS.md` — La Constitución

Define **lo que NO se puede hacer**. Es el equivalente a una constitución: no dice qué construir, dice qué **nunca** se puede violar.

Estructura obligatoria:

| Sección                                    | Contenido                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Mandatory Context Files**                | Lista de archivos que son fuente de verdad. Todo agente debe leerlos antes de trabajar                                                 |
| **Workflow**                               | Los pasos exactos para implementar cualquier tarea (leer docs → identificar fase → implementar → verificar → commit → actualizar plan) |
| **Patrones de Arquitectura Innegociables** | Cada patrón con: nombre, código correcto de ejemplo, código incorrecto de ejemplo. Mínimo 4-7 patrones                                 |
| **Reglas de Integridad del Código**        | Tabla con: regla, umbral, acción al violar. Verificables con comandos                                                                  |
| **Estructura de Paquetes/Directorios**     | Árbol de carpetas con responsabilidad de cada una y regla de dependencia                                                               |
| **Code Conventions**                       | TypeScript strict, Zod, prefijos I para interfaces, orden de imports                                                                   |
| **Stack**                                  | Runtime, framework, herramientas. Versiones exactas                                                                                    |
| **Commands**                               | Todos los comandos del workspace (`dev`, `build`, `typecheck`, `lint`, por paquete)                                                    |

### 2. `PLAN.md` — El Plano

Define **lo que SÍ se va a construir** y en qué orden. Es el equivalente a los planos de un edificio: dimensiones, materiales, fases de construcción.

Estructura obligatoria:

| Sección                              | Contenido                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Visión y Alcance**                 | Qué es el proyecto. Qué está en el MVP. Qué NO está en el MVP (pero la arquitectura lo soporta) |
| **Principios de Arquitectura**       | Los mismos de AGENTS.md, expandidos con diagramas y razonamiento                                |
| **Estructura de Paquetes**           | Árbol completo con cada archivo planeado y su propósito                                         |
| **Diseño Detallado del Core**        | Interfaces, clases principales, flujos de datos. Con snippets de código de las APIs públicas    |
| **Plan de Implementación por Fases** | Tabla con: fase, tarea, archivo(s), esfuerzo estimado. Cada fase es autónoma y buildeable       |
| **Contratos de Paquete**             | Qué exporta cada paquete, reglas de dependencia entre paquetes                                  |
| **Estrategia de Extensión Futura**   | Cómo agregar features nuevos sin tocar el core (con ejemplos de código)                         |
| **Riesgos y Decisiones**             | Tabla con: riesgo, decisión tomada, justificación                                               |

---

## Cómo Escribir Patrones de Arquitectura Innegociables

Cada patrón debe seguir esta estructura:

````markdown
### N. [Nombre del patrón] — [subtitle de una línea]

[Explicacion de UNA frase de por qué]

```ts
// CORRECTO: [por qué es correcto]
// INCORRECTO: [por qué es incorrecto]
[código][código];
```
````

[Reglas adicionales en bullet points]

````

### Ejemplo real (extraído de `auto-browser/AGENTS.md`):

```markdown
### 4. Hooks como middleware chain — no callbacks sueltos

Los hooks forman una cadena de middleware con capacidad de short-circuit (`null` bloquea).

```ts
// CORRECTO: cadena ordenada por prioridad con short-circuit
interface Hook {
  id: string;
  priority: number;
  beforeToolCall?(ctx: ToolCallContext): Promise<ToolCallContext | null>;
  afterToolCall?(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult>;
  onError?(error: AgentError): Promise<void>;
}

// INCORRECTO: callbacks sueltos registrados con strings mágicos
server.on("beforeToolCall", (toolCall) => { ... });
server.on("afterToolCall", (result) => { ... });
````

- `null` en `beforeToolCall` = bloquea la ejecución
- Los hooks son imperativos (log, audit, enriquecer)
- Las rules son declarativas (separadas de hooks)

````

### Requisitos de un buen patrón

| Requisito | Verificación |
|---|---|
| Tiene un nombre memorable | Se puede citar: "el patrón 4 de hooks" |
| Muestra código correcto e incorrecto | El diff visual hace obvio por qué uno es mejor |
| Es específico de este proyecto | No es "usar TypeScript" — es "los hooks forman una cadena con short-circuit" |
| Es verificable | Se puede escribir un grep/bash que detecte violaciones |
| Es innegociable | Si un feature requiere romperlo, el feature está mal diseñado |

---

## Cómo Escribir Reglas de Integridad Verificables

Cada regla debe tener un **umbral numérico** y una **acción correctiva** específica:

```markdown
| Regla | Umbral | Acción al violar |
|---|---|---|
| Tamaño máximo de clase | 200 líneas | Extraer submódulo con responsabilidad única |
| Singletons | 0 tolerancia | Inyectar por constructor o AppContext |
| `any` types | 0 tolerancia | Usar `unknown` + type guard o generic |
| Schemas monolíticos | 0 tolerancia | Colocar schemas junto al dominio que los define |
````

Y una verificación obligatoria:

```bash
pnpm typecheck          # 0 errores
pnpm lint               # 0 errores
pnpm --filter <pkg> build  # build exitoso del paquete afectado
```

---

## Cómo Estructurar un Plan por Fases

Cada fase debe ser:

1. **Autónoma**: se puede buildear y testear al final de la fase
2. **Verificable**: tiene un criterio de done con comandos exactos
3. **Acotada**: máximo 8-10 tareas por fase, ~2-6 horas cada una

```markdown
### Fase N: [Nombre] — [Objetivo de una línea]

| #   | Tarea              | Archivo(s)      | Esfuerzo   |
| --- | ------------------ | --------------- | ---------- |
| N.1 | [tarea específica] | [paths exactos] | [estimado] |
| N.2 | [tarea específica] | [paths exactos] | [estimado] |

**Criterio de done**: `[comando verificable]` → resultado esperado.
```

---

## El Workflow

```
1. Definir AGENTS.md
   ├── Patrones de arquitectura (4-7, con ejemplos CORRECTO/INCORRECTO)
   ├── Reglas de integridad (con umbrales numéricos)
   ├── Estructura de paquetes (con regla de dependencia)
   └── Stack + convenciones + comandos

2. Definir PLAN.md
   ├── Visión y alcance (qué sí, qué no)
   ├── Diseño detallado del core (interfaces, clases, flujos)
   ├── Plan de fases (cada fase autónoma y buildeable)
   ├── Contratos de paquete (qué exporta cada uno)
   ├── Estrategia de extensión (cómo crecer sin tocar el core)
   └── Riesgos y decisiones

3. Revisar AGENTS.md + PLAN.md contra los criterios de esta skill
   ├── ¿Cada patrón tiene ejemplo de código correcto e incorrecto?
   ├── ¿Cada regla de integridad es verificable con un comando?
   ├── ¿Cada fase tiene criterio de done?
   └── ¿El core no depende de nadie?

4. Implementar fase por fase
   ├── Ejecutar criterios de done al final de CADA fase
   └── Actualizar PLAN.md marcando tareas como completadas

5. Auditoría post-implementación
   ├── Verificar que no se violó ningún patrón
   ├── Verificar que no hay singletons, god objects, ni `any`
   └── Corregir antes de declarar terminado
```

---

## Anti-Patrones (lo que NUNCA se hace)

| Anti-patrón                                          | Consecuencia                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Escribir código antes de definir AGENTS.md + PLAN.md | Arquitectura improvisada, deuda técnica desde el día 0             |
| AGENTS.md sin ejemplos de código CORRECTO/INCORRECTO | Los patrones son interpretables, no vinculantes                    |
| Reglas de integridad sin umbrales numéricos          | "Clases pequeñas" → ¿100 líneas? ¿500? Imposible auditar           |
| PLAN.md sin diseño detallado del core                | Las fases se improvisan, las interfaces no existen hasta la fase 3 |
| Fases que dependen de fases futuras                  | Si la fase 2 necesita algo de la fase 4, el plan está mal ordenado |
| "Después lo refactorizamos"                          | Nunca se refactoriza. La deuda se acumula                          |

---

## Criterios de Aceptación para AGENTS.md

Antes de declarar AGENTS.md como "listo", verificá:

````bash
# AC1: Existe en la raíz del proyecto
ls AGENTS.md 2>&1
# Resultado esperado: AGENTS.md (existe)

# AC2: Tiene sección de patrones innegociables
rg "Patrones de Arquitectura.*Innegociables" AGENTS.md
# Resultado esperado: al menos 1 match

# AC3: Tiene al menos 4 bloques de código TypeScript (ejemplos CORRECTO/INCORRECTO)
rg -c '```ts' AGENTS.md
# Resultado esperado: >= 4

# AC4: Tiene tabla de reglas de integridad con umbrales numéricos
rg "Tamaño máximo|0 tolerancia|singletons|any types" AGENTS.md
# Resultado esperado: al menos 4 matches

# AC5: Tiene sección de verificación obligatoria
rg "typecheck.*0 errores" AGENTS.md
# Resultado esperado: al menos 1 match

# AC6: Tiene regla de dependencia explícita
rg "nunca al revés|no importa de nadie|solo importan de core" AGENTS.md
# Resultado esperado: al menos 1 match
````

## Criterios de Aceptación para PLAN.md

````bash
# AC1: Existe en la raíz del proyecto
ls PLAN.md 2>&1
# Resultado esperado: PLAN.md (existe)

# AC2: Tiene sección "Visión y Alcance"
rg "Visión y Alcance" PLAN.md
# Resultado esperado: al menos 1 match

# AC3: Define explícitamente qué NO está en el MVP
rg "NO está en el MVP|Lo que NO" PLAN.md
# Resultado esperado: al menos 1 match

# AC4: Tiene diseño detallado con interfaces TypeScript
rg -c '```ts' PLAN.md
# Resultado esperado: >= 5

# AC5: Tiene plan de fases con estimaciones
rg "Fase \d|Esfuerzo" PLAN.md
# Resultado esperado: al menos 2 matches

# AC6: Tiene estrategia de extensión futura
rg "Estrategia de Extensión|Agregar un" PLAN.md
# Resultado esperado: al menos 1 match

# AC7: Tiene tabla de riesgos
rg "Riesgo.*Decisión|Riesgos y Decisiones" PLAN.md
# Resultado esperado: al menos 1 match
````

---

## Cuándo Usar Esta Metodología

| Situación                                   | ¿Aplicar?                                                       |
| ------------------------------------------- | --------------------------------------------------------------- |
| Proyecto nuevo desde cero                   | **Obligatorio**                                                 |
| Migración/refactor de arquitectura          | **Obligatorio**                                                 |
| Feature nuevo que toca el core              | **Obligatorio** (mini AGENTS.md + PLAN.md para el feature)      |
| Bug fix puntual                             | No aplica                                                       |
| Cambio de configuración/UI                  | No aplica                                                       |
| Proyecto legacy que no se va a refactorizar | No aplica (pero documentar el estado actual en AGENTS.md ayuda) |

---

## Relación con Otras Skills

| Skill                                     | Relación                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `criterios-de-aceptacion-verificables.md` | Los criterios de done en PLAN.md usan esta metodología                                           |
| `work-unit-commits`                       | Los commits de cada fase siguen el patrón de unidades de trabajo                                 |
| `sdd-init` a `sdd-archive`                | SDD es una versión más granular para cambios individuales. Esta skill es para el proyecto entero |

---
