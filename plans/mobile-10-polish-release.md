# Hito 10 — Polish & Release

**Prerequisito**: Hito 9 completado y verificado (todos los criterios H9-A* en verde).

**Objetivo**: Calidad production-ready. Experiencia pulida, robusta ante errores, con dark mode completo, skeleton loaders en todas las pantallas, CI/CD y cobertura mínima de tests. Sin nuevas features — solo calidad y estabilidad.

**Principios innegociables**:
- Ningún spinner genérico (`CircularProgressIndicator` sin context) en la app final — solo skeleton loaders.
- Dark mode completo y sin hardcoded colors (verificado con grep).
- CI falla si `flutter analyze` o `flutter test` producen errores.
- No se hace `flutter build --release` sin que CI haya pasado en verde.

---

## 1. Estado Actual (As-Is)

- Todos los hitos 0-9 completados y verificados.
- Algunos skeleton loaders implementados en hitos anteriores, pero no en todas las pantallas.
- No existe CI/CD para mobile.
- Posibles warnings menores acumulados en hitos anteriores.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H10-A1** — `flutter analyze` en todo `apps/mobile/` produce **cero** warnings y **cero** errores.
- [ ] **H10-A2** — `flutter test` produce exit code 0 con cobertura ≥ 60% en `lib/features/*/data/` y `lib/features/*/ui/*_notifier.dart`.
- [ ] **H10-A3** — Ningún `CircularProgressIndicator` sin `SemanticLabel` en la app — todos los estados loading usan skeleton loaders.
- [ ] **H10-A4** — Dark mode completo: ningún widget usa `Colors.*` hardcodeado fuera de `app_theme.dart`.
- [ ] **H10-A5** — Offline banner visible cuando no hay conexión a internet o al backend.
- [ ] **H10-A6** — Error boundary global captura crashes no manejados y muestra pantalla de error amigable con botón de retry.
- [ ] **H10-A7** — Splash screen y app icon configurados para iOS y Android.
- [ ] **H10-A8** — CI GitHub Actions: `flutter analyze` + `flutter test` en cada PR.
- [ ] **H10-A9** — `flutter build apk --release` y `flutter build ios --no-codesign` pasan en CI sin errores.
- [ ] **H10-A10** — Performance: ningún frame drop visible durante scroll en lista de mensajes larga (> 100 mensajes).

---

## 3. Hitos Innegociables

Los sub-hitos se ejecutan en orden estricto.

---

### Sub-hito 10.1: Audit y limpieza de warnings

**Responsabilidad**: Llevar `flutter analyze` a cero warnings.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/analysis_options.yaml`
   - Habilitar reglas estrictas adicionales: `avoid_print`, `prefer_const_constructors`, `prefer_final_fields`.
   - Eliminar cualquier `// ignore:` que no tenga justificación documentada.

2. **Audit** de todos los archivos con warnings acumulados desde hitos anteriores.

**Verificación**:
```bash
cd apps/mobile && flutter analyze
# → "No issues found!" — cero líneas de output de error.
```

---

### Sub-hito 10.2: Skeleton loaders en todas las pantallas

**Responsabilidad**: Reemplazar spinners genéricos por skeleton loaders consistentes.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/skeletons/skeleton_list.dart`
   - Widget genérico de skeleton para listas con `n` items configurables.

2. **[NEW]** `apps/mobile/lib/shared/widgets/skeletons/skeleton_card.dart`
   - Skeleton de card genérico con animación shimmer.

3. **[MODIFY]** Todas las screens que aún usen `CircularProgressIndicator`:
   - `TeamsScreen`, `WorkflowsScreen`, `AgentsScreen`, `ProjectsScreen`.
   - Reemplazar spinner por `SkeletonList()` durante `isLoading`.

**Verificación**:
```bash
grep -rn "CircularProgressIndicator()" apps/mobile/lib/features/ --include="*.dart"
# → cero líneas (todos los spinners sin semanticLabel eliminados)
```

---

### Sub-hito 10.3: Dark mode completo

**Responsabilidad**: Verificar y corregir cualquier hardcoded color fuera del theme.

**Artefactos**:

1. **Audit completo**:
   ```bash
   grep -rn "Colors\.\|Color(0x\|Color(0X" apps/mobile/lib/features/ apps/mobile/lib/shared/ --include="*.dart"
   ```
   Cada ocurrencia encontrada → mover la constante a `AppTheme` o `AppColors`.

2. **[MODIFY]** `apps/mobile/lib/core/theme/app_theme.dart`
   - Verificar que `AppTheme.light()` y `AppTheme.dark()` cubren todos los `ColorScheme` roles usados.
   - Agregar colores faltantes que se descubran en el audit.

**Verificación**:
```bash
grep -rn "Colors\." apps/mobile/lib/features/ apps/mobile/lib/shared/ --include="*.dart" | grep -v "_test.dart"
# → cero líneas
```

---

### Sub-hito 10.4: Error boundary y offline banner

**Responsabilidad**: Robustez ante fallos de red y errores no manejados.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/error_boundary.dart`
   - Wrappea el app en un `ErrorWidget.builder` personalizado.
   - Pantalla de error con: icono, mensaje amigable, botón "Retry" que reinicia el provider.

2. **[NEW]** `apps/mobile/lib/shared/widgets/offline_banner.dart`
   - Banner fijo en la parte superior cuando no hay conexión.
   - Usa `connectivity_plus` para detectar estado de red.
   - Se oculta automáticamente cuando la conexión se restaura.

3. **[MODIFY]** `apps/mobile/pubspec.yaml` — agrega `connectivity_plus: ^6.0.0`.

4. **[MODIFY]** `apps/mobile/lib/main.dart`
   - Wrappea el `ProviderScope` con el `ErrorBoundary`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/shared/widgets/offline_banner_test.dart
# Sin conexión → banner visible. Con conexión → banner oculto.
```

---

### Sub-hito 10.5: Splash screen, app icon y assets

**Artefactos**:

1. **[MODIFY]** `apps/mobile/pubspec.yaml` — agrega `flutter_native_splash: ^2.4.0`.

2. **[NEW]** `apps/mobile/flutter_native_splash.yaml`
   - Color de fondo alineado con `AppColors.background`.
   - Logo de Spaces como imagen central.

3. **Configurar app icon** con `flutter_launcher_icons`:
   ```bash
   cd apps/mobile && dart run flutter_launcher_icons
   ```

4. Bundle ID:
   - iOS: `com.spaces.mobile`
   - Android: `com.spaces.mobile`

**Verificación visual**: App abre con splash screen en lugar de pantalla blanca genérica.

---

### Sub-hito 10.6: CI/CD GitHub Actions

**Artefactos**:

1. **[NEW]** `.github/workflows/mobile-ci.yml`
   ```yaml
   name: Mobile CI
   on: [push, pull_request]
   jobs:
     analyze-and-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: subosito/flutter-action@v2
           with:
             flutter-version: '3.x'
             channel: 'stable'
         - run: cd apps/mobile && flutter pub get
         - run: cd apps/mobile && flutter analyze
         - run: cd apps/mobile && flutter test --coverage
         - run: cd apps/mobile && flutter build apk --release --no-pub
   ```

**Verificación**:
```bash
# Empujar un PR → CI corre → todos los jobs en verde.
```

---

## 4. Verificación Final del Hito 10 (= Release Candidate)

```bash
# 1. Análisis estático limpio
cd apps/mobile && flutter analyze
# → "No issues found!"

# 2. Tests con cobertura
cd apps/mobile && flutter test --coverage
# → exit code 0, cobertura ≥ 60% en features/*/data/ y features/*/ui/*_notifier.dart

# 3. Sin spinners genéricos
grep -rn "CircularProgressIndicator()" apps/mobile/lib/features/ --include="*.dart"
# → cero líneas

# 4. Sin hardcoded colors
grep -rn "Colors\." apps/mobile/lib/features/ apps/mobile/lib/shared/ --include="*.dart" | grep -v "_test.dart"
# → cero líneas

# 5. Build de release limpio
cd apps/mobile && flutter build apk --release
# → exit code 0

# 6. Build iOS limpio (sin codesign)
cd apps/mobile && flutter build ios --no-codesign
# → exit code 0

# 7. Monorepo intacto
cd ../../ && pnpm build
# → exit code 0
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 10.1 → 10.2 → 10.3 → 10.4 → 10.5 → 10.6.
2. **Cero features nuevas en este hito** — solo calidad, robustez y CI.
3. **`flutter analyze` en cero warnings** antes del release build.
4. **CI debe pasar antes del build de release** — nunca distribuir sin CI verde.
5. **Un commit por sub-hito**: `chore(mobile): hito-10.1-analyze-cleanup`, etc.
