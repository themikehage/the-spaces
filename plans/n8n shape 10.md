Viewed about.md:1-82
Viewed steps.md:1-140
Searched for "workflow"
Listed directory workflows
Viewed workflows.ts:1-79

Chequeando nuestro motor de workflows actual —donde tenemos ejecuciones de pasos basadas en agentes (`WorkflowStepTypeSchema = z.enum(["agent"])`), ordenamiento topológico DAG, `onError` básico y la streaming UI que recién estuvimos tocando— y comparándolo con lo que hace fuerte a n8n, acá tenés las **10 principales mejoras ordenadas por el valor real que le aportan al producto y a la robustez**:

---

### 1. Nodos de Control de Flujo y Ramificación (`If/Else`, `Switch`, `Merge`)
* **Valor:** **Crítico.** Pasar de DAGs fijos/lineales a flujos dinámicos. Permite que el resultado de un agente (ej: "Aprobado" / "Rechazado" o "Bug Crítico" / "Mejora") decida qué rama del workflow se ejecuta a continuación.

### 2. Data Mapping & Engine de Expresiones (`{{ $steps.nodeId.output }}`)
* **Valor:** **Muy Alto (DX y Confiabilidad).** Mapeo estructurado entre salidas y entradas de nodos sin depender de prompt engineering frágil. Soporte para parsear JSON, extraer variables y pasar payloads limpios entre pasos.

### 3. Human-in-the-Loop Node (Pausa por Aprobación / Input Manual)
* **Valor:** **Muy Alto (Operativo).** Pausar la ejecución en un paso crítico (ej: desplegar a prod, enviar email masivo, mutar DB) y notificar al usuario vía nuestro **Attention Hub** para que apruebe o corrija el input antes de seguir.

### 4. Data Pinning & Step Dry-Run (Testing de Nodos Individuales)
* **Valor:** **Alto (Productividad y Ahorro de Tokens).** La función estrella de n8n para debugging: "congelar" (pin) los datos de salida de los pasos 1 a 3 para poder iterar y probar únicamente el paso 4 sin re-ejecutar las llamadas AI anteriores ni gastar tokens innecesariamente.

### 5. Nodos de Código / Transformación Determinista (`Code Node`)
* **Valor:** **Alto (Eficiencia).** Ejecutar pequeños scripts (JS/TS) sandbox para filtrar, formatear texto o transformar arreglos sin gastar latencia ni tokens de un LLM en tareas puramente algorítmicas.

### 6. Triggers Event-Driven (Webhooks, Schedules, EventBus)
* **Valor:** **Alto (Automatización Autónoma).** Desacoplar la ejecución manual desatada desde la UI/API. Permitir que un workflow arranque por un evento de GitHub (PR opened), un schedule (cron), un webhook HTTP o un evento interno del sistema.

### 7. Sub-workflows & Modularidad (`Call Workflow Node`)
* **Valor:** **Medio-Alto (Arquitectura Limpia).** Permitir que un workflow invoque a otro como si fuera un sub-paso reusable (ej: un workflow estándar de "Auditoría de Seguridad" reutilizado por múltiples flujos principales).

### 8. Manejo de Errores Avanzado (Ramas de Fallback & Circuit Breaker)
* **Valor:** **Medio-Alto (Robustez).** Si un paso falla tras los reintentos (`retryCount`), en lugar de abortar todo, el motor bidecciona la ejecución hacia una rama de recuperación o alerta (ej: notificar por Slack y continuar con datos por defecto).

### 9. Bucle sobre Listas / Procesamiento en Paralelo (`Loop / Split in Batches`)
* **Valor:** **Medio (Escalabilidad).** Procesar arreglos de datos (ej: 10 archivos o 5 issues) ejecutando instancias de agentes en paralelo con límite configurable de concurrencia.

### 10. Canvas Visual Interactivo y Validación en Tiempo Real
* **Valor:** **Medio (DX / UX).** Mejorar la experiencia visual del canvas (conectar puertos con drag-and-drop, validación visual de tipos entre nodos, detección de ciclos en el frontend antes de guardar, y badges de estado live sobre cada nodo del canvas).

---

Decime cuáles de estas 10 querés que prioricemos y armamos el plan de implementación detallado para ejecutarlas.