# Hito 3: Modularización de Herramientas del Sistema (`ITool`)

> **Estado:** 📋 Planificado
> **Objetivo:** Extraer las herramientas nativas de archivos y consola (`read`, `write`, `edit`, `glob`, `grep`, `bash`) a módulos independientes que implementen la interfaz `ITool` pura sin acoplamiento con el vendor.

---

## 1. Contexto y Diagnóstico

Actualmente las herramientas del sistema están envueltas en adaptadores del vendor o declaradas con funciones heredadas (`ai/tools/read-tool.ts`, `ai/bash-tool.ts`).

## 2. Plan de Trabajo

1. **Crear Implementaciones Puras `ITool`**:
   - `ai/tools/read.tool.ts`: Implementa `ITool` para lectura de archivos con `ToolContext`.
   - `ai/tools/write.tool.ts`: Implementa `ITool` para escritura con validación de sandbox.
   - `ai/tools/edit.tool.ts`: Implementa `ITool` para reemplazo contiguo de texto.
   - `ai/tools/glob.tool.ts`: Implementa `ITool` para búsqueda de patrones de archivos.
   - `ai/tools/grep.tool.ts`: Implementa `ITool` para búsqueda de contenido.
   - `ai/tools/bash.tool.ts`: Implementa `ITool` para ejecución de comandos vía `ISandbox`.

2. **`DefaultToolRegistry` (`core/tool-registry.ts`)**:
   - Pre-poblar el registro con las herramientas `ITool` nativas.
   - Eliminar gradualmente la función de mapeo temporal `toAgentTools()`.

---

## 3. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores**.
- Pruebas unitarias de cada herramienta `ITool` ejecutándose aisladamente.
