# Auditoría — Chat y Workspace (Files) Mobile vs Web

**Fecha**: 2026-08-22
**Ámbito**: `apps/mobile/lib/features/chat/`, `apps/mobile/lib/features/workspace/`, `apps/mobile/lib/shared/widgets/` vs `apps/client/src/components/chat/`, `apps/client/src/components/workspace/`, `apps/client/src/lib/api/workspace.service.ts`
**Método**: lectura directa del estado real de ambas apps (no contra planes).

---

## Resumen ejecutivo

- **Chat**: la base está (streaming, markdown, thinking, tool-cards, aprobación/pregunta inline, steer/follow-up, context ring, modelos). Faltan **input avanzado** (slash/@, skills, tools presets), **~25 tool renderers** (incluido el **Custom UI declarativo** completo y el log de subagente en vivo), **media inline** (imágenes con auth, pdf, audio, video), **ramas de mensaje**, **delegaciones/tasks** y **footer de costos**.
- **Workspace**: la mobile es **solo lectura**. Falta TODO el CRUD: crear/renombrar/borrar/editar en línea, árbol expandible, descargar, compartir y refresco automático por WS.

---

## 1. CHAT — Comparación por categoría

### 1.1 Lo que mobile YA tiene

| Feature | Mobile |
|---|---|
| Streaming + cursor parpadeante | `streaming_bubble.dart` |
| Thinking block colapsable (+ split `<thinking>` en streaming) | `thinking_block.dart`, `streaming_bubble.dart:53-64` |
| Markdown (GFM básico: tablas, code, blockquote) | `markdown_block.dart` (flutter_markdown) |
| Send/Stop, autoresize input | `chat_input_bar.dart` |
| Steer / Follow-up (toggle, prompt con `followUp`) | `input_mode_toggle.dart`, `chat_notifier.dart:385-402` |
| Historial de prompts con flechas (arriba/abajo) | `chat_notifier.dart:311-319` |
| Context ring + botón compact | `context_ring.dart`, `compact_button.dart`, `chat_input_bar.dart:185-196` |
| Selector de modelo (proveedor + badge REASONING) | `model_selector_sheet.dart` |
| Aprobación de tool inline (`ApprovalForm`) y pregunta inline (`AskQuestionForm`) | `message_bubble.dart:30-54`, `approval_form.dart`, `ask_question_form.dart` |
| Adjuntos: imágenes del dispositivo -> base64 en el prompt | `chat_notifier.dart:363-383,414-428` |
| ToolCallCard colapsable con estado running/error/done | `tool_call_card.dart` |
| Tool renderers: bash, edit, read, grep, write + generic JSON | `tools/tool_result_router.dart` |
| Auto-renombrar sesión con el primer mensaje | `chat_notifier.dart:335-343` |
| Eventos WS: agent_start, message_start/update, context_usage, tool_execution_start/end, approval, ask_question, message_end/agent_end, agent_error, aborted | `chat_notifier.dart:77-240` |

### 1.2 Lo que NO tiene mobile (gaps vs web)

#### A. Input avanzado (lo más usado del web)

| Feature web | Archivo web | Gap |
|---|---|---|
| **Autocomplete en vivo** `/` (tools) y `@` (menciones), teclado arriba/abajo/Enter/Tab/Esc | `AutocompletePopover.tsx`, `useChatInputForm.ts:170-237` | **No existe** en mobile |
| **Slash con tools del catálogo + custom-tools** (con badges y descripción) | `useChatInputForm.ts:112-129`, `useCustomToolsList.ts` | No |
| **Slash con skills de la sesión** | `useChatInputForm.ts:131-139` | No |
| **Menciones `@target`** de agentes/proyectos/equipos | `useChatInputForm.ts:157-212` | No |
| **SkillsPopover** (tabs ALL/GLOBAL/LOCAL, buscador, ver SKILL.md) | `SkillsPopover.tsx:34-149,219-276` | No (mobile no tiene selector de skills) |
| **ToolsPopover**: presets Autonomous/Standard/ReadOnly + toggle tools + sección Custom + tools gated | `ToolsPopover.tsx:87-263` | No (mobile no configura tools por sesión) |
| Atajos **Enter=Steer / Alt+Enter=Follow-up** | `useChatInputForm.ts:370-382` | Solo toggle |
| **Model selector rico**: provider tree, modelos recientes, badge Vision, persistir a entidad/global, fallback | `ModelSelector.tsx:73-354` | Lista plana, sin recents/vision/persistencia global |

#### B. Adjuntos (mobile solo imágenes locales)

| Feature web | Archivo web | Gap |
|---|---|---|
| Adjuntar **cualquier archivo** (no solo imagen) | `ChatInput.tsx:324-330` | Mobile usa `ImagePicker.pickImage` |
| **Upload multipart al workspace** `POST /api/workspace/assets/uploads` | `ChatInput.tsx:113-197` | No |
| Docs **<100 KB inline como code block** con lenguaje detectado | `ChatInput.tsx:38-111` | No |
| Preview de adjunto con thumbnail y KB | `AttachmentPreview.tsx` | Solo thumbnail de imagen |
| `[Attached File: path]` -> tarjeta descargable en UserBubble | `UserBubble.tsx:18-32,147-186` | No |
| Adjuntos en pantalla de bienvenida (pre-creación de sesión) | `WelcomeChatInput.tsx:120-131` | No |

#### C. Render de mensajes / media

| Feature web | Archivo web | Gap |
|---|---|---|
| **Imágenes con auth** (descarga con Bearer + lazy + lightbox + descargar todo) | `ImageGrid.tsx:42-349` | **Crítico**: en mobile las imágenes inline del markdown se renderizan sin header de auth => no cargan |
| **HTML inline** con fetch autenticado (`HtmlFileFetcher`) | `ToolResultInspector.tsx:103-183` | No |
| **PDF inline** (iframe + open new tab) | `MessageBlocks.tsx:114-145` | No |
| **Audio / video inline** | `MessageBlocks.tsx:147-191` | No |
| **RichMarkdown**: syntax highlighting, file trees (`├──`), links `workspace-file://`, copy por bloque | `RichMarkdown.tsx:44-195` | No |
| **BranchNav** entre versiones de mensaje + `POST /api/sessions/:id/navigate` | `SystemMessage.tsx:7-67` | No |
| **DelegationNotification** con executive summary y artifacts | `SystemMessage.tsx:69-148` | No |
| **Footer del mensaje**: provider/model/tokens/**costo $**/timestamp + copy | `MessageGroup.tsx:9-77` | No |
| Badges STEERING / FOLLOW-UP en UserBubble | `UserBubble.tsx:81-131` | No |
| **ToolCallRow** rica: resumen de args, serial tools bloqueados | `ToolCallRow.tsx:73-231` | card simplificada |

#### D. Tool renderers — el agujero más grande

Web: `tools/ToolResultRouter.tsx` (41-501) despacha ~30 renderers. Mobile (`tools/tool_result_router.dart`) tiene solo **5** (bash/edit/read/grep/write) + generic:

| Renderer web | Mobile |
|---|---|
| `find`, `ls` | No |
| `exa_search` (dominio, snippet, costo, sintetizado) | No |
| `memory*` (semantic/episodic/procedural, importancia) | No |
| `manage_workflow`, `manage_factory`, `task`/`decompose_tasks` | No |
| **`spawn_subagent`/`delegate_task` + `SubagentLiveView`** (log en vivo via WS `subagent_event`) | No |
| `request_approval`/`ask_question` (forms inline) | Si (mobile tiene ambos) |
| `share_file` -> ShareFileCard descargable | No |
| `web_fetch`, `refresh_ui`, `manage_preview`, `create_experiment`, `manage_custom_tools` | No |
| **`render_chart`** (recharts bar/line/pie/area) | No |
| **`render_html`** (iframe sandbox + tabs Preview/Source + download) | No |
| **`render_images`/`generate_image` -> ImageGrid** | No |
| **`CustomUiRenderer`** + 21 componentes (card, tabs, steps, timeline, diff, stats, metric, progress, badge, markdown, code, table, section, audio, video, pdf, html, accordion, card-list, custom-html) | **cero en mobile** |
| Fallback JSON (unwrapp 3 niveles) | generic card |
| Resultados **parciales en vivo** (`tool_execution_update`) | mobile ignora ese evento |
| Paths clickeables -> `openWorkspaceFile` | No |

#### E. Delegaciones / tasks / WS faltantes

| Feature | Gap |
|---|---|
| `DelegationsPanel`, `FloatingDelegations`, `FloatingTasks` (task runner) | No existe feature de delegaciones en mobile |
| Eventos WS `subagent_event`, `tool_execution_update`, `ui_action_error`, delegación, ramas | mobile solo maneja ~12 tipos |
| Enviar `postPrompt` tras crear sesión con primer mensaje (REST fallback) | No |

---

## 2. WORKSPACE (FILES) — Comparación

### 2.1 Lo que mobile YA tiene

| Feature | Mobile |
|---|---|
| Listar archivos del scope (agent/project/team) | `workspace_repository.dart:32-57` (`GET /api/workspace?agentId|project|teamId`) |
| Search local por nombre/ruta | `workspace_notifier.dart:40-47`, `workspace_files_panel.dart` |
| Refresh + pull-to-refresh | `workspace_files_panel.dart:100-109,313` |
| Leer contenido de texto (base64 decode) | `workspace_repository.dart:93-145` |
| **Preview sheet** de texto (monoespaciado + copiar) | `file_preview_sheet.dart` |
| **Lightbox de imágenes** con URL raw con token | `image_lightbox.dart`, `workspace_repository.dart:147-157` |
| Iconos/tamaño/fecha/ruta por archivo | `workspace_file_item.dart` |
| Estados loading/error/vacío/búsqueda-sin-resultados | `workspace_files_panel.dart:186-311` |

### 2.2 Lo que NO tiene mobile (gaps vs web)

| Feature web | Archivo web | Gap |
|---|---|---|
| **Crear archivo/carpeta** (`PUT`, `{type}`) | `workspace.service.ts:105-123`, `WorkspacePanel.tsx:99-112` | No |
| **Renombrar** (`PATCH`, `{newPath}`) | `workspace.service.ts:125-142` | No |
| **Borrar** (con `ConfirmModal`) | `workspace.service.ts:61-69,144-154`, `WorkspacePanel.tsx:159-171` | No |
| **Editar y guardar en línea** (`PUT` con content) | `WorkspaceFileEditor.tsx`, `workspace.service.ts:86-103` | mobile solo lee (no envía content) |
| **Árbol lazy-expandible** de carpetas (`GET /api/workspace/{path}` -> children) | `WorkspaceFileTree.tsx`, `WorkspaceFileTreeNode.tsx`, `useWorkspacePanel.ts:19-43,64-80` | lista plana, **tocar una carpeta no hace nada** |
| **Download** (`GET ...?download=true`) | `workspace.service.ts:167-187` | No |
| **Raw blob** (`raw=true`) | `workspace.service.ts:156-165` | solo URL de imágenes |
| **Auto-refresh por eventos** (`workspaceUpdated` tras agent_end/write) | `useWorkspacePanel.ts:57-62` | solo refresh manual |
| `openWorkspaceFile` (abrir archivo desde chat/links) | `useWorkspacePanel.ts:102-136` | No |
| **Upload de archivos al workspace desde el chat** | `workspace.service.ts` + `ChatInput.tsx:113-197` | No |
| Scope **channelId** | `workspace.service.ts:21-30` | mobile no mapea channelId |
| **ShareFileCard** (descargar archivo desde chat) | `components/chat/tools/ShareFileCard.tsx` | No |
| Preview de build (`/api/preview/*`) | `workspace.service.ts:189-217`, `PreviewPanel.tsx` | funcionalidad de preview separada, no en mobile |

---

## 3. Prioridades sugeridas

### Crítico (sin esto no es "el mismo producto")
1. **Custom UI renderer** (`CustomUiRenderer` + componentes) y `SubagentLiveView` — el núcleo de presentación de tool calls del web.
2. **Autocomplete slash/@ + skills/tools del input** — la interacción diaria del chat.
3. **CRUD de workspace** (crear/renombrar/borrar/editar) + **árbol navegable** (hoy la carpeta no responde al tap).
4. **Imágenes inline con auth** en el markdown del chat (hoy probablemente no cargan).
5. **Media inline**: html/pdf/audio/video en mensajes.

### Importante
6. Tool renderers restantes (find, ls, exa, memory, chart, share_file, manage_*).
7. Footer con costo `$` y copy; BranchNav; DelegationNotification.
8. `tool_execution_update` (resultados parciales) + `subagent_event`.
9. Adjuntos de archivo.