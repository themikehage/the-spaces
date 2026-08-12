# Plan 36 — Campo `tag` en `definition.json` de custom tools para agrupación futura

**Estado:** 🔜 Pendiente de implementar — plan aprobado

## Objetivo

Añadir un campo opcional `tag` a la definición (`definition.json`) de cada folder custom tool, para poder agrupar tools en el futuro (UI de agrupación/filtro).

## Cambios

El campo debe fluir por 5 puntos. Es opcional en ambos lados → `definition.json` existentes siguen validando sin migración.

### 1. Schema de definición (server)
`apps/server/src/core/custom-tools/schemas.ts:265-287` (`CustomToolDefinitionSchema`): añadir
- Recomendado: `tag: z.string().max(64).optional()`
- Alternativa para agrupación más fuerte: `tags: z.array(z.string().max(32)).max(10).optional()`

### 2. Schema compartido
`packages/shared/src/schemas.ts:966-978` (`CustomToolSummarySchema`): añadir `tag` (o `tags`) opcional para que llegue tipado al cliente.

### 3. API listado
`apps/server/src/routes/custom-tools.ts:22-34`: incluir `tag: t.definition.tag` en el mapeo de summaries.

### 4. Formulario editor
`apps/client/src/components/settings/CustomToolEditorModal.tsx`:
- Estado `const [tag, setTag] = useState("")`.
- Carga: `setTag((def as any).tag || "")` (tras línea 43).
- Guardado: añadir `tag` al objeto `definition` (líneas 88-96).
- Reset en rama nueva (líneas 55-66): `setTag("")`.
- Input en tab "Contract & Parameters" (junto a Execution Mode, mismo estilo ~203-214).

### 5. Display (opcional, preparar agrupación)
`apps/client/src/components/settings/EntityCustomToolsEditor.tsx:196-198`: chip pequeño `tool.tag` junto al badge de `executeType`. Sin lógica de filtro/agrupación todavía.

## Verificación

- `pnpm build` o `pnpm --filter server run typecheck` + `pnpm --filter client run typecheck`.
- Guardar/editar una custom tool con y sin `tag` → `definition.json` y lista los reflejan.

## Archivos implicados

- `apps/server/src/core/custom-tools/schemas.ts`
- `apps/server/src/routes/custom-tools.ts`
- `packages/shared/src/schemas.ts`
- `apps/client/src/components/settings/CustomToolEditorModal.tsx`
- `apps/client/src/components/settings/EntityCustomToolsEditor.tsx`
- `apps/client/src/lib/api/custom-tools.service.ts` (tipos ya derivados de shared; revisar si hace falta)