import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/agents/ui/agent_detail_screen.dart';
import '../../features/agents/ui/agents_screen.dart';
import '../../features/attention/ui/attention_screen.dart';
import '../../features/auth/ui/auth_notifier.dart';
import '../../features/auth/ui/auth_state.dart';
import '../../features/auth/ui/login_screen.dart';
import '../../features/chat/ui/chat_screen.dart';
import '../../features/dashboard/ui/dashboard_screen.dart';
import '../../features/projects/ui/project_detail_screen.dart';
import '../../features/projects/ui/projects_screen.dart';
import '../../features/sessions/ui/sessions_screen.dart';
import '../../features/settings/ui/settings_screen.dart';
import '../../features/teams/ui/team_detail_screen.dart';
import '../../features/teams/ui/teams_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../theme/app_theme.dart';

final GlobalKey<NavigatorState> rootNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> dashboardNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'dashboardNav');
final GlobalKey<NavigatorState> sessionsNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'sessionsNav');
final GlobalKey<NavigatorState> projectsNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'projectsNav');
final GlobalKey<NavigatorState> agentsNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'agentsNav');
final GlobalKey<NavigatorState> settingsNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'settingsNav');

class PlaceholderScreen extends StatelessWidget {
  final String title;

  const PlaceholderScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final canPop = context.canPop();

    return Scaffold(
      appBar: AppBar(
        leading: canPop
            ? null
            : IconButton(
                key: Key('placeholder_drawer_button_${title.toLowerCase()}'),
                icon: const Icon(Icons.menu),
                tooltip: 'Open menu',
                onPressed: () {
                  Scaffold.maybeOf(context)?.openDrawer();
                },
              ),
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
    navigatorKey: rootNavigatorKey,
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
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const LoginScreen(),
      ),

      // Secondary drawer routes
      GoRoute(
        path: '/teams',
        name: 'teams',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const TeamsScreen(),
        routes: [
          GoRoute(
            path: ':id',
            name: 'team-detail',
            parentNavigatorKey: rootNavigatorKey,
            builder: (context, state) => TeamDetailScreen(
              teamId: state.pathParameters['id'] ?? '',
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/workflows',
        name: 'workflows',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PlaceholderScreen(title: 'Workflows'),
      ),
      GoRoute(
        path: '/skills',
        name: 'skills',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PlaceholderScreen(title: 'Skills'),
      ),
      GoRoute(
        path: '/mcp',
        name: 'mcp',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PlaceholderScreen(title: 'MCP Servers'),
      ),
      GoRoute(
        path: '/schedules',
        name: 'schedules',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PlaceholderScreen(title: 'Schedules'),
      ),
      GoRoute(
        path: '/logs',
        name: 'logs',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PlaceholderScreen(title: 'Logs'),
      ),
      GoRoute(
        path: '/attention',
        name: 'attention',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const AttentionScreen(),
      ),

      // Stateful Shell Route for Bottom Navigation Tabs
      StatefulShellRoute.indexedStack(
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Dashboard
          StatefulShellBranch(
            navigatorKey: dashboardNavigatorKey,
            routes: [
              GoRoute(
                path: '/dashboard',
                name: 'dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),

          // Branch 1: Sessions
          StatefulShellBranch(
            navigatorKey: sessionsNavigatorKey,
            routes: [
              GoRoute(
                path: '/sessions',
                name: 'sessions',
                builder: (context, state) => const SessionsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    name: 'session-detail',
                    builder: (context, state) => ChatScreen(
                      sessionId: state.pathParameters['id'] ?? '',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Branch 2: Projects
          StatefulShellBranch(
            navigatorKey: projectsNavigatorKey,
            routes: [
              GoRoute(
                path: '/projects',
                name: 'projects',
                builder: (context, state) => const ProjectsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    name: 'project-detail',
                    builder: (context, state) => ProjectDetailScreen(
                      projectId: state.pathParameters['id'] ?? '',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Branch 3: Agents
          StatefulShellBranch(
            navigatorKey: agentsNavigatorKey,
            routes: [
              GoRoute(
                path: '/agents',
                name: 'agents',
                builder: (context, state) => const AgentsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    name: 'agent-detail',
                    builder: (context, state) => AgentDetailScreen(
                      agentId: state.pathParameters['id'] ?? '',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Branch 4: Settings
          StatefulShellBranch(
            navigatorKey: settingsNavigatorKey,
            routes: [
              GoRoute(
                path: '/settings',
                name: 'settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
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
