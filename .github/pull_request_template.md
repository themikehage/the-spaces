## Descripción

<!-- Describe brevemente qué cambios introduce este PR y por qué son necesarios -->

## Tipo de Cambio

- [ ] Bug fix (cambio no rompedor que soluciona un problema)
- [ ] Nueva funcionalidad (cambio no rompedor que añade funcionalidad)
- [ ] Breaking change (cambio que causa que la funcionalidad existente no trabaje como se espera)
- [ ] Documentación (actualizaciones en guías o README)
- [ ] Refactor / Mantenimiento interno

## Checklist de Calidad

- [ ] El código sigue las convenciones del proyecto (TypeScript strict, no `any`, Tailwind CSS v4)
- [ ] Todos los archivos `.ts` y `.tsx` tienen el encabezado `// SPDX-License-Identifier: MIT` (`pnpm run check-license`)
- [ ] Pasó `pnpm run typecheck` sin errores
- [ ] Pasó `pnpm run lint` sin advertencias
- [ ] Pasó la suite de tests (`pnpm run test`)
- [ ] Verifiqué el build de producción (`pnpm run build`)
