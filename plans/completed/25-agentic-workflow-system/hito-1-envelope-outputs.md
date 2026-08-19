# Hito 25.1 — Outputs Tipados en `EnvelopeResult`

**Estado:** 📋 Planificado  
**Dependencias:** ninguna  
**Desbloquea:** Hito 25.2, 25.3

---

## Objetivo

Agregar un campo `outputs: Record<string, unknown>` a `EnvelopeResult` para que los agentes puedan pasar datos estructurados entre pasos de delegación. Sin esto, un agente padre solo puede leer el `executive_summary` como texto — no puede consumir datos del subagente de forma programática.

---

## Diagnóstico — Estado actual

### Lo que SÍ funciona

| Aspecto                                      | Estado | Detalle                                                            |
| -------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `EnvelopeResult` existe en `packages/shared` | OK     | `status`, `executive_summary`, `artifacts`, `risks`                |
| `handleDelegationCompletion` parsea el sobre | OK     | `agent-utils.ts` — extrae el JSON del último mensaje del subagente |
| `DelegationRegistry` almacena el resultado   | OK     | `delegation-registry.ts` — escribe el `EnvelopeResult` en JSON     |
| UI muestra delegaciones con su resultado     | OK     | `DelegationsPanel.tsx` — muestra estado y `executive_summary`      |

### Lo que NO funciona (gaps)

| Gap                                                     | Impacto                                                                             | Ubicación                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| `artifacts` es `string` — no estructurado               | El agente padre no puede extraer datos del subagente para usar en el siguiente paso | `packages/shared/src/envelope.ts` |
| `EnvelopeResult` sin `outputs: Record<string, unknown>` | No hay mecanismo para pass-by-name entre agentes                                    | `packages/shared/src/envelope.ts` |
| `parseEnvelope` no extrae outputs estructurados         | Aunque el subagente los incluyera, el padre no los leería                           | `core/session/agent-utils.ts`     |
| UI no muestra outputs tipados                           | El usuario no puede ver qué datos pasaron entre agentes                             | `DelegationsPanel.tsx`            |

---

## Diseño

### 1. Extensión de `EnvelopeResult` en `packages/shared`

```typescript
// packages/shared/src/envelope.ts

export interface EnvelopeResult {
  status: "success" | "error" | "blocked" | "partial";
  executive_summary: string;
  artifacts: string;
  risks: string;
  /** Outputs estructurados para consumo programático por el agente padre */
  outputs?: Record<string, unknown>;
}
```

### 2. Instrucción al subagente para emitir outputs

El system prompt del subagente ya incluye instrucciones de sobre. Se extiende para que emita el campo `outputs`:

```
Al finalizar, responde SOLO con un JSON con esta estructura:
{
  "status": "success" | "error" | "blocked",
  "executive_summary": "Resumen de 2-3 oraciones",
  "artifacts": "Descripción de artefactos creados o 'none'",
  "risks": "Riesgos identificados o 'none'",
  "outputs": {
    "nombreVariable": <valor>,
    ...
  }
}

El campo `outputs` debe contener los datos que el agente padre necesita para continuar.
```

**Archivo afectado:** `core/prompts/prompt-assembly.ts` → `wrapDelegationTask()`

### 3. `parseEnvelope` extrae outputs

```typescript
// core/session/agent-utils.ts

export function parseEnvelope(text: string): EnvelopeResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        status: parsed.status ?? "success",
        executive_summary: parsed.executive_summary ?? text,
        artifacts: parsed.artifacts ?? "none",
        risks: parsed.risks ?? "none",
        outputs: parsed.outputs ?? {}, // ← nuevo
      };
    }
  } catch {
    // noop
  }
  return {
    status: "success",
    executive_summary: text,
    artifacts: "none",
    risks: "none",
    outputs: {},
  };
}
```

### 4. Acceso a outputs desde el agente padre

El resultado de `manage_delegations` (el texto que el agente lee) debe incluir los outputs en formato legible:

```typescript
// En handleDelegationCompletion (agent-utils.ts)
// Al armar el tool result devuelto al agente padre:

const outputsSection =
  result.outputs && Object.keys(result.outputs).length > 0
    ? `\n\nOutputs disponibles:\n${JSON.stringify(result.outputs, null, 2)}`
    : "";

return `${result.executive_summary}${outputsSection}`;
```

---

## Archivos afectados

| Archivo                                                | Operación | Descripción                                                                                  |
| ------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------- |
| `packages/shared/src/envelope.ts`                      | MODIFY    | Agregar `outputs?: Record<string, unknown>`                                                  |
| `apps/server/src/core/session/agent-utils.ts`          | MODIFY    | `parseEnvelope` extrae `outputs`, `handleDelegationCompletion` los incluye en el tool result |
| `apps/server/src/core/prompts/prompt-assembly.ts`      | MODIFY    | `wrapDelegationTask` incluye instrucción de `outputs`                                        |
| `apps/client/src/components/chat/DelegationsPanel.tsx` | MODIFY    | Mostrar `outputs` tipados en la card de delegación                                           |

---

## Criterio de aceptación

- [ ] `EnvelopeResult.outputs` tiene el tipo correcto en `packages/shared`
- [ ] Un subagente que emite `outputs: { result: 42 }` → el agente padre lee ese valor en el tool result
- [ ] `DelegationsPanel` muestra los outputs cuando existen
- [ ] `pnpm --filter server run typecheck` → 0 errores
- [ ] `pnpm build` → 0 errores

---

## Estimación

**2-3 horas.** Cambio muy localizado — no toca la arquitectura de agentes.
