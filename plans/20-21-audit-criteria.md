# Auditoría — Planes 20 y 21 vs Criterios de Aceptación Verificables

> Aplica `skills/criterios-de-aceptacion-verificables.md` a los Planes 20 y 21.

---

## Plan 20 — Puntaje: 4/9 tareas con criterios parciales, 5/9 sin ningún criterio

| Tarea                             | Criterios actuales    | Fallas                                                        |
| --------------------------------- | --------------------- | ------------------------------------------------------------- |
| 20.1 — Unificar apiFetch          | 0                     | Sin criterios. 49 consumidores sin verificar migración        |
| 20.2 — Unificar WsClient          | 0                     | Sin criterios. 3 consumidores sin verificar migración         |
| 20.3 — Unificar SessionsContext   | 0                     | Sin criterios. Sin verificar que usa useSessions internamente |
| 20.4 — ChatArea 927→<300          | 0                     | Sin criterios individuales                                    |
| 20.5 — MessageList 852→<300       | 0                     | Sin criterios. Sin verificar ToolCallCard                     |
| 20.6 — ChatInput 659→<300         | 0                     | Sin criterios. Sin verificar ChatToolbar                      |
| 20.7 — MainLayout 804→descomponer | 0                     | Sin criterios. Sin verificar AppShell/AppSidebar/AppHeader    |
| 20.8 — Eliminar ruta /v2          | 1 (`rg /v2`, parcial) | No verifica que el router no monta el Layout v2               |
| 20.9 — Eliminar componentes v2    | 0                     | Sin criterios. 7 archivos sin verificar eliminación           |

**Anti-patrones detectados**:

- "Prueba manual: chat funciona" → narrativo, no verificable
- `wc -l` sin verificar que existe → falla silenciosa si el archivo fue renombrado
- `ls ... # Debe fallar` sin `2>&1`

---

## Plan 21 — Puntaje: 0/7 tareas con criterios verificables

| Tarea                               | Criterios actuales                 | Fallas                                                              |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| 21.1 — Destino de shared            | 0                                  | "Decidir" no es una tarea ejecutable                                |
| 21.2 — Migrar schemas gap           | 0                                  | Sin criterios                                                       |
| 21.3 — Arreglar spaces-sdk          | 0                                  | Sin criterios                                                       |
| 21.4 — Migrar/eliminar rutas legacy | 0                                  | Sin criterios                                                       |
| 21.5 — Eliminar archivos legacy     | 0                                  | Sin criterios                                                       |
| 21.6 — Actualizar docs              | 0                                  | Sin criterios                                                       |
| 21.7 — Verificación final           | 8 (mezcla de comandos y narrativa) | "# Solo constantes de configuración" es comentario, no verificación |

**Anti-patrones detectados**:

- "# Solo constantes de configuración" → comentario, no comando
- "# Ningún .ts/.tsx > 300 líneas" → instrucción, no verificación
- "Smoke test manual" → anti-patrón explícito de la skill
- `rg` sin `--glob '!**/__tests__/**'` → falsos positivos por tests

---

_Auditoría basada en `skills/criterios-de-aceptacion-verificables.md`._
