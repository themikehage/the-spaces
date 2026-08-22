import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/storage/app_storage.dart';
import 'core/theme/app_theme.dart';
import 'shared/widgets/error_boundary.dart';
import 'shared/widgets/offline_banner.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize global error widget catcher
  ErrorBoundary.initialize();

  final appStorage = await AppStorage.create();

  runApp(
    ErrorBoundary(
      child: ProviderScope(
        overrides: [
          appStorageProvider.overrideWithValue(appStorage),
        ],
        child: const SpacesApp(),
      ),
    ),
  );
}

class SpacesApp extends ConsumerWidget {
  const SpacesApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Spaces',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      routerConfig: router,
      builder: (context, child) => OfflineBanner(
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
