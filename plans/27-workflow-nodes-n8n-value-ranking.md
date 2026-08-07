# Plan 27 — Top 10 Nodos de Workflow Faltantes (Experiencia n8n)

**Estado:** 🔜 Análisis — sin implementar

## Contexto

Idea: investigar cuáles son los 10 principales nodos que faltan en el motor de workflows, ordenados por valor aportado, para acercar la experiencia a n8n.

## Estado actual del motor

Tipos de paso existentes (`.agents/rules/workflow.rules.md:14-22`): `agent`, `if`, `switch`, `merge`, `approval`, `code`. Motor DAG con resolución topológica, interpolación `$inputs/$steps`, `onError: stop|continue|retry`, dry-run con `pinnedOutputs`, sandbox `isolated-vm` para `code`.

Nota: `plans/n8n shape 10.md` contiene un análisis previo; este doc prioriza por valor/coste con una tesis estratégica distinta.

## Ranking por valor aportado

1. **`http_request`** — Llamadas REST a APIs externas con auth (Bearer/Basic/headers). El nodo más usado de n8n. Reutiliza los servicios de `ServerSpacesHost`. Rendimiento alto, coste medio.
2. **`webhook`** — Trigger por petición entrante para iniciar un workflow. Complementa `http` y habilita automatizaciones externas (hoy solo disparan agentes/schedules).
3. **`variables` (set/get de estado)** — Gestión explícita de variables de workflow entre nodos; hoy solo hay interpolación `$inputs/$steps`. Configurar estado inter-nodo es un hueco claro.
4. **`code` multi-bloque** — Extender el tipo `code` existente (aridad de `function`) sin LLM; el sandbox ya está. Coste bajo, recompensa alta.
5. **`wait`** — Pausa por tiempo/condición. Comparte infraestructura con el nodo `approval` (pausa/resume) con timer. Coste bajo-medio.
6. **`error`/`retry` visual** — Exponer `onError` como bloque visual explícito en el canvas. Coste bajo.
7. **`schedule` como nodo** — Hoy los schedules son un feature separado (`ScheduleService`); convertirlos a nodo que entra al DAG consolida el modelo mental.
8. **`llm`/transformador** — Nodo LLM que transforma texto entre pasos, separado del `agent` step. Coste medio.
9. **`http_route` / routing** — Enrutar a sub-workflows según respuesta; probablemente basta mejorar `switch` con matching de payload en vez de un nodo nuevo.
10. **`splitOut`/`aggregate` (data mapping)** — Dividir listas en items y agregar. Requiere salto de modelo (item vs workflow). Coste mayor, queda detrás.

## Top-3 por valor aportado

`http` > `webhook` > `variables`: todos responden a la mayor limitación actual — el motor no conversa con el mundo exterior.

## Observación estratégica

n8n es un **integrador de apps**; Spaces es un **coordinador con agentes**. El mayor salto de valor no es replicar el catálogo de nodos por completitud, sino decidir si los flujos deben ser **n8n-like (eventos/datos)** o **agent-centric**. Los nodos de mayor valor (HTTP/webhook/variables) son los que permiten que un workflow sea disparado por sistemas externos y hable con ellos; el resto es cosmética sobre la máquina DAG existente.
