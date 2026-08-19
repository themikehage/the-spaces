# Hito 8 — Settings & Config

**Prerequisito**: Hito 7 completado y verificado (todos los criterios H7-A* en verde).

**Objetivo**: Ajustes de usuario, configuración de proveedores de IA y credenciales. Equivalente de `SettingsPage` + `useGeneralSettingsForm` del cliente web. Las credenciales se almacenan en `FlutterSecureStorage` — nunca en texto plano.

**Principios innegociables**:
- `SettingsRepository` es la única clase que hace HTTP de settings y credenciales.
- Credenciales de proveedores almacenadas exclusivamente via `AppStorage` (secure). Nunca `SharedPreferences`.
- `SettingsNotifier` es la única fuente de estado — sin `Form`s con estado propio.
- Los cambios de settings se guardan al instante (sin botón "Save" global) o al abandonar el campo — consistente con el comportamiento de la web.

---

## 1. Estado Actual (As-Is)

- Existe placeholder de `SettingsScreen` en el shell del Hito 3.
- El backend expone `GET /api/settings`, `PUT /api/settings`, `GET /api/providers`, `PUT /api/providers/:id`.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H8-A1** — `SettingsScreen` muestra secciones: General, Providers, Security.
- [ ] **H8-A2** — Sección General: idioma de respuesta, preferencias de UI. Cambios persisten en backend.
- [ ] **H8-A3** — Sección Providers: lista de 9 proveedores con su estado (configurado/no configurado).
- [ ] **H8-A4** — Tap en proveedor → `ProviderCredentialsSheet` con campos de API key.
- [ ] **H8-A5** — Guardar API key → almacenada en secure storage local Y enviada al backend encriptada.
- [ ] **H8-A6** — API key guardada → icono de "configurado" aparece en la lista de proveedores.
- [ ] **H8-A7** — Sección Security: botón de logout, opción de borrar datos locales.
- [ ] **H8-A8** — `SettingsRepository` no tiene referencias a widgets ni a `BuildContext`.
- [ ] **H8-A9** — `flutter analyze lib/features/settings/` produce cero warnings.
- [ ] **H8-A10** — `flutter test test/features/settings/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 8.1: SettingsRepository

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/settings/data/models/app_settings.dart`
   - `AppSettings` con `freezed`: `responseLanguage`, `memoryEnabled`, `memoryAutoStore`, `defaultProvider`, `defaultModel`.

2. **[NEW]** `apps/mobile/lib/features/settings/data/models/provider_config.dart`
   - `ProviderConfig` con `freezed`: `id`, `name`, `isConfigured`, `defaultModel`.

3. **[NEW]** `apps/mobile/lib/features/settings/data/settings_repository.dart`
   - `getSettings()` → `GET /api/settings`.
   - `updateSettings(patch)` → `PUT /api/settings`.
   - `getProviders()` → `GET /api/providers`.
   - `saveProviderCredentials(providerId, apiKey)` → `PUT /api/providers/:id` + `AppStorage.secureWrite(...)`.
   - `clearProviderCredentials(providerId)` → elimina de storage + notifica backend.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/settings/settings_repository_test.dart
# getSettings → AppSettings tipado. saveProviderCredentials → escribe en secure storage Y hace HTTP.
```

---

### Sub-hito 8.2: SettingsNotifier

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/settings/ui/settings_notifier.dart`
   - `SettingsState { settings, providers, isLoading, error }` con `freezed`.
   - `SettingsNotifier extends AsyncNotifier<SettingsState>`.
   - `load()` — carga settings y providers en paralelo.
   - `updateSetting(key, value)` → hace `PUT /api/settings` con debounce de 500ms.
   - `saveProviderKey(providerId, apiKey)` → llama repository.
   - `logout()` → limpia storage → navega a `/login`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/settings/settings_notifier_test.dart
# updateSetting → debounced PUT. saveProviderKey → provider marcado como configurado.
```

---

### Sub-hito 8.3: SettingsScreen y ProviderCredentialsSheet

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/settings/ui/settings_screen.dart`
   - Lista de secciones: General, Providers, Security.
   - Tap en sección → expande o navega a sub-screen según complejidad.
   - Sin `setState` — consume `SettingsNotifier`.

2. **[NEW]** `apps/mobile/lib/features/settings/ui/widgets/provider_list_item.dart`
   - Nombre del proveedor, icono, estado (configurado = check verde / no configurado = gris).
   - Tap → `ProviderCredentialsSheet`.

3. **[NEW]** `apps/mobile/lib/features/settings/ui/widgets/provider_credentials_sheet.dart`
   - Campo de API key (oscurecido, con toggle de visibilidad).
   - Botón "Save" → `settingsNotifier.saveProviderKey(...)`.
   - Botón "Clear" si ya estaba configurado.

**Verificación visual**: Guardar API key de OpenAI → ícono verde → siguiente sesión usa el proveedor.

---

## 4. Verificación Final del Hito 8

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/settings/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/settings/
# → exit code 0

# 3. API keys nunca en SharedPreferences
grep -rn "prefWrite\|prefs.setString" apps/mobile/lib/features/settings/ --include="*.dart"
# → cero líneas con datos de credenciales (solo secureWrite para apiKey)

# 4. Sin setState en SettingsScreen
grep -n "setState" apps/mobile/lib/features/settings/ui/settings_screen.dart
# → cero líneas

# 5. Debounce implementado en updateSetting
grep -n "debounce\|Debounce\|Duration" apps/mobile/lib/features/settings/ui/settings_notifier.dart
# → al menos 1 línea
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 8.1 → 8.2 → 8.3.
2. **Credenciales SIEMPRE en `secureWrite`** — ningún dato sensible en `SharedPreferences`.
3. **Un commit por sub-hito**: `feat(mobile): hito-8.1-settings-repository`, etc.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **Sin lógica de UI en el repository** — solo HTTP y storage.
