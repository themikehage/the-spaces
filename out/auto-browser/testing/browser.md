### 1. Navegación Básica y Árbol de Accesibilidad (Snapshot)

> _"Navegá a `https://example.com`, tomá un snapshot de la página y decime qué título principal (H1) y qué enlaces encontraste en el árbol."_

- **Qué evalúa:** `open` + `snapshot`. Verifica que aparezca la estructura con referencias (`@e1`, `@e2`) en el panel.

---

### 2. Búsqueda e Interacción con Formularios (Click y Fill con Refs)

> _"Abrí `https://duckduckgo.com`, escribí 'agent-browser CLI' en la caja de búsqueda, hacé click en buscar y decime cuál es el primer resultado."_

- **Qué evalúa:** `open` → `snapshot` → `fill @ref` → `click @ref` → `snapshot`. Prueba la capacidad del agente para encadenar interacción con selectores dinámicos.

---

### 3. Extracción Directa de Texto / Contenido

> _"Leé la página actual de `https://news.ycombinator.com` y listame los títulos y enlaces de los primeros 3 posts de la portada."_

- **Qué evalúa:** `read`. Muestra cómo la herramienta extrae directamente el DOM o texto amigable para el modelo sin recargar todo el DOM raw.

---

### 4. Desplazamiento y Lectura Específica (Scroll + Snapshot)

> _"Entrá a `https://es.wikipedia.org/wiki/Inteligencia_artificial`, hacé scroll hacia abajo 2 veces para avanzar en la lectura y leeme el texto de la sección que quedó visible."_

- **Qué evalúa:** `scroll` (down) + `snapshot`/`read`. Confirma el manejo de la vista y desplazamiento en páginas largas.

---

### 5. Evaluación de Scripts y Estado de Navegador (Eval JS)

> _"Navegá a `https://httpbin.org/user-agent`, ejecutá un script JavaScript (`eval`) para extraer el User Agent desde `window.navigator.userAgent` y mostrame qué valor devuelve."_

- **Qué evalúa:** `eval`. Prueba la ejecución directa de fragmentos de código JS dentro del contexto activo de la página.
