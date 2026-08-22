1. **#9 — Eliminar plugins** (limpieza, bajo riesgo, prepara el terreno)
2. **#4 — Historial de mensajes con flechas** (quick win, alto impacto UX)
3. **#7 — Unificar task tools** (refactor interno, elimina deuda)
4. **#8 — Unificar memory tool** (refactor interno, consistencia)
5. **#3 — Default model/provider** (feature nuevo, valor inmediato)
6. **#1 — Abstracción custom tools** (refactor grande, base para #6)
7. **#6 — Custom tools con aprobación** (depende de #1)
8. **#5 — Galería de equipos** (feature nuevo, contenido + backend)
9. **#2 — Team-scoped agents** (cambio arquitectónico, máxima complejidad)

------

Problemas:
- Al hacer click en ell boton de cancel en el chat mientras se esta corriendo una tool, es verdad que la ejecucion se cancela, pero en la ui la tool se queda como running para siempre. Si la tool era una pregunta o aprobacion, el attention hub no se reestablece. DONE
- En la modal de configuracion de agente, al clickar en la tab de ver el prompt, que por cierto se muestra abajo cuando deberia estar arriba, la modal se cierra. DONE

-----

## Mobile

- El selector de modelos sale duplicado en la topbar y en el input de escribir.
- El chat muestra el bottombar, no deberia
- Falta añadir ui en tools
- Skeleton al cargar los mensajes
- Terminar de implemenatar el workspace

- No se estan mostrando los selectores de  tools y skills. DONE
- mensajes del agente a width completo. DONE
- Mostrar las setting en tabs y añadir las tabs que faltan. DONE

1.- Cuando entras a la ventana de una entidad quiero que veas directamente el chat, el ultimo chat que hayas tenido, y en la topbar el boton de sesiones y el de config, que seran los 3 puntos. Si haces swipe a la derecha navegas al workspace/files de esa entidad.
