import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/ui/auth_notifier.dart';
import '../../features/auth/ui/auth_state.dart';
import '../../features/auth/ui/login_screen.dart';
import '../../features/dashboard/ui/dashboard_screen.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';
import '../ws/ws_client.dart';

class PlaceholderScreen extends StatelessWidget {
  final String title;

  const PlaceholderScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: Center(
        child: Text(
          '$title (Coming Soon)',
          style: AppTypography.bodyLarge.copyWith(
            color: AppColors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _apiStatus = 'Checking...';
  bool _apiOk = false;
  bool _wsConnected = false;
  StreamSubscription? _wsSub;

  @override
  void initState() {
    super.initState();
    _checkBackend();
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }

  Future<void> _checkBackend() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.get<Map<String, dynamic>>('/api/health');
      if (mounted) {
        setState(() {
          _apiOk = response['status'] == 'ok';
          _apiStatus = _apiOk ? 'HTTP Health: 200 OK (${response['version']})' : 'Health Error';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _apiOk = false;
          _apiStatus = 'HTTP: Offline';
        });
      }
    }

    try {
      final wsClient = ref.read(wsClientProvider);
      await wsClient.connect();
      _wsSub = wsClient.isConnected.listen((connected) {
        if (mounted) {
          setState(() {
            _wsConnected = connected;
          });
        }
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Spaces'),
        actions: [
          IconButton(
            key: const Key('home_logout_button'),
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () {
              ref.read(authNotifierProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: AppColors.primary,
                  size: 32,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                authState.username != null
                    ? 'Welcome, ${authState.username}!'
                    : 'Spaces Mobile',
                style: AppTypography.headlineLarge,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'AI-Assisted Cloud Workspace',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Container(
                constraints: const BoxConstraints(maxWidth: 320),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
                decoration: BoxDecoration(
                  color: AppColors.darkCard,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(
                          _apiOk ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: _apiOk ? AppColors.success : AppColors.mutedForeground,
                          size: 18,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            _apiStatus,
                            style: AppTypography.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Icon(
                          _wsConnected ? Icons.wifi : Icons.wifi_off,
                          color: _wsConnected ? AppColors.success : AppColors.warning,
                          size: 18,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            _wsConnected ? 'WebSocket: Connected' : 'WebSocket: Disconnected',
                            style: AppTypography.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RouterListenable extends ChangeNotifier {
  final Ref _ref;

  RouterListenable(this._ref) {
    _ref.listen<AuthState>(
      authNotifierProvider,
      (_, __) => notifyListeners(),
    );
  }
}

final routerListenableProvider = Provider<RouterListenable>((ref) {
  return RouterListenable(ref);
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final listenable = ref.watch(routerListenableProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: listenable,
    redirect: (context, state) {
      final isAuthenticated = ref.read(authNotifierProvider).isAuthenticated;
      final isLoggingIn = state.matchedLocation == '/login';

      if (!isAuthenticated && !isLoggingIn) {
        return '/login';
      }

      if (isAuthenticated && isLoggingIn) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        name: 'dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/sessions',
        name: 'sessions',
        builder: (context, state) => const PlaceholderScreen(title: 'Sessions'),
        routes: [
          GoRoute(
            path: ':id',
            name: 'session-detail',
            builder: (context, state) => PlaceholderScreen(
              title: 'Session ${state.pathParameters['id'] ?? ''}',
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/projects',
        name: 'projects',
        builder: (context, state) => const PlaceholderScreen(title: 'Projects'),
        routes: [
          GoRoute(
            path: ':id',
            name: 'project-detail',
            builder: (context, state) => PlaceholderScreen(
              title: 'Project ${state.pathParameters['id'] ?? ''}',
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/',
        redirect: (context, state) => '/dashboard',
      ),
    ],
  );
});

