# Hito 3: Modularización de Herramientas del Sistema (`ITool`)

> **Estado:** 📋 Planificado
> **Objetivo:** Extraer las herramientas nativas de archivos y consola (`read`, `write`, `edit`, `glob`, `grep`, `bash`) a módulos independientes que implementen la interfaz `ITool` pura sin acoplamiento con el vendor.

---

## 1. Visión y Meta (A dónde se quiere llegar)

Cumplir con la sección **2.6 Tool Registry como Contrato Tipado** de `out/auto-browser/PLAN.md`. Cada herramienta del sistema debe ser una clase/módulo independiente que implemente `ITool`, con esquemas Zod o JSON Schema tipados, ejecutable a través de `IToolExecutor` sin importar tipos ni clases del directorio `vendor/`.

---

## 2. Motivación y Por Qué (Por qué se hace este ajuste)

- **Eliminar envoltorios redundantes**: Las herramientas actuales están envueltas en adaptadores legacy (`iToolToAgentTool`, `base-tool.ts`, `bash-tool.ts`).
- **Aislamiento y Testabilidad**: Al convertir cada herramienta en una clase pura `ITool`, cada una puede probarse unitariamente de forma aislada pasándole parámetros y un `ToolContext` simulado.
- **Formato LLM Estándar**: `ToolRegistry` podrá exportar directamente las definiciones a formato OpenAI/LLM (`toLLMFormat()`) para cualquier proveedor.

---

## 3. Plan de Trabajo Paso a Paso

1. **Crear Implementaciones Puras `ITool` (`ai/tools/`)**:
   - `read.tool.ts`: Implementa `ITool` para lectura de archivos.
   - `write.tool.ts`: Implementa `ITool` para escritura con validación de directorio.
   - `edit.tool.ts`: Implementa `ITool` para reemplazo exacto contiguo.
   - `glob.tool.ts`: Implementa `ITool` para filtrado por patrones glob.
   - `grep.tool.ts`: Implementa `ITool` para búsqueda ripgrep / regex.
   - `bash.tool.ts`: Implementa `ITool` delegando a `ISandbox`.

2. **Poblar `ToolRegistry` (`core/tool-registry.ts`)**:
   - Registrar las herramientas puras `ITool` en `DefaultToolRegistry`.
   - Reemplazar las definiciones de herramientas heredadas en `sessionToolFactory`.

---

## 4. Consideraciones Anti-Regresión (Para evitar romper nada)

> [!WARNING]
> **Estructura de Retorno de Resultados**: El vendor actual espera un objeto `{ content: [{ type: "text", text: string }], details: unknown }`. Las herramientas `ITool` deben devolver resultados que `ToolExecutor` transforme limpiamente manteniendo compatibilidad.

> [!IMPORTANT]
> **Parámetros de Herramientas**: Mantener los nombres exactos de los parámetros (`path`, `content`, `targetContent`, `replacementContent`, `command`, `cwd`) que los modelos LLM ya están acostumbrados a generar.

> [!CAUTION]
> **Cancelación vía `AbortSignal`**: La herramienta `bash` puede ejecutar procesos largos. Asegurar que `ToolContext.signal` cancele el subproceso hijo inmediatamente sin dejar procesos huérfanos.

---

## 5. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores de compilación**.
- Pruebas unitarias independientes para cada herramienta `ITool` verificadas.
