import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/router/app_router.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import '../../helpers/fake_secure_storage.dart';
import 'package:spaces_mobile/features/attention/ui/attention_notifier.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/auth/ui/auth_notifier.dart';
import 'package:spaces_mobile/features/auth/ui/auth_state.dart';
import 'package:spaces_mobile/features/dashboard/data/dashboard_repository.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_project.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_session.dart';
import 'package:spaces_mobile/features/sessions/ui/sessions_screen.dart';

class FakeAuthRepository implements AuthRepository {
  bool isAuth = true;
  String? username = 'admin';

  @override
  Future<AuthResponse> login(String username, String password) async =>
      AuthResponse(user: AuthUser(username: username, id: 'u1'), token: 'tok');

  @override
  Future<void> logout() async {
    isAuth = false;
    username = null;
  }

  @override
  Future<String?> getToken() async => 'tok';

  @override
  Future<String?> getUsername() async => username;

  @override
  Future<String?> getUserId() async => 'u1';

  @override
  Future<bool> isAuthenticated() async => isAuth;
}

class FakeDashboardRepository implements DashboardRepository {
  @override
  Future<List<DashboardSession>> getActiveSessions() async => [
        DashboardSession(
          id: 'sess-1',
          title: 'Refactor Auth Pipeline',
          status: 'running',
          updatedAt: DateTime.now().toIso8601String(),
        ),
      ];

  @override
  Future<List<DashboardProject>> getRecentProjects({int limit = 5}) async => [
        DashboardProject(
          id: 'proj-1',
          name: 'the-spaces',
          description: '/work/the-spaces',
          updatedAt: DateTime.now().toIso8601String(),
        ),
      ];
}

class FakeWsClient implements WsClient {
  @override
  Stream<Map<String, dynamic>> get events => const Stream.empty();

  @override
  Stream<bool> get isConnected => const Stream.empty();

  @override
  bool get connected => true;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  Future<void> disconnect() async {}

  @override
  void send(Map<String, dynamic> message) {}

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}

  @override
  void dispose() {}
}

class TestAuthNotifier extends AuthNotifier {
  TestAuthNotifier(AuthRepository repository, AuthState initialState)
      : super(repository: repository) {
    state = initialState;
  }
}

class TestAttentionNotifier extends AttentionNotifier {
  final int count;
  TestAttentionNotifier(this.count);

  @override
  build() {
    return super.build().copyWith(pendingCount: count);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeAuthRepository fakeAuthRepo;
  late FakeDashboardRepository fakeDashboardRepo;
  late FakeWsClient fakeWsClient;
  late AppStorage fakeStorage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    fakeStorage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    fakeAuthRepo = FakeAuthRepository();
    fakeDashboardRepo = FakeDashboardRepository();
    fakeWsClient = FakeWsClient();
  });

  Widget buildShellApp({int attentionCount = 0}) {
    return ProviderScope(
      overrides: [
        appStorageProvider.overrideWithValue(fakeStorage),
        authRepositoryProvider.overrideWithValue(fakeAuthRepo),
        dashboardRepositoryProvider.overrideWithValue(fakeDashboardRepo),
        wsClientProvider.overrideWithValue(fakeWsClient),
        authNotifierProvider.overrideWith(
          (ref) => TestAuthNotifier(
            fakeAuthRepo,
            const AuthState.authenticated(username: 'admin'),
          ),
        ),
        attentionNotifierProvider.overrideWith(
          () => TestAttentionNotifier(attentionCount),
        ),
      ],
      child: Consumer(
        builder: (context, ref, _) {
          final router = ref.watch(appRouterProvider);
          return MaterialApp.router(
            theme: AppTheme.dark(),
            routerConfig: router,
          );
        },
      ),
    );
  }

  group('ShellRoute & Navigation Shell Tests', () {
    testWidgets('renders all 5 bottom navigation tabs and defaults to Dashboard',
        (tester) async {
      await tester.pumpWidget(buildShellApp());
      await tester.pumpAndSettle();

      // Bottom nav destinations
      expect(find.byKey(const Key('shell_nav_dashboard')), findsOneWidget);
      expect(find.byKey(const Key('shell_nav_sessions')), findsOneWidget);
      expect(find.byKey(const Key('shell_nav_projects')), findsOneWidget);
      expect(find.byKey(const Key('shell_nav_agents')), findsOneWidget);
      expect(find.byKey(const Key('shell_nav_settings')), findsOneWidget);

      // Verify dashboard content is visible
      expect(find.text('Active Sessions'), findsOneWidget);
      expect(find.text('Recent Projects'), findsOneWidget);
    });

    testWidgets('tapping each bottom nav tab navigates to its branch', (tester) async {
      await tester.pumpWidget(buildShellApp());
      await tester.pumpAndSettle();

      // Tap Sessions tab
      await tester.tap(find.byKey(const Key('shell_nav_sessions')));
      await tester.pumpAndSettle();
      expect(find.byType(SessionsScreen), findsOneWidget);

      // Tap Projects tab
      await tester.tap(find.byKey(const Key('shell_nav_projects')));
      await tester.pumpAndSettle();
      expect(find.text('Projects (Coming Soon)'), findsOneWidget);

      // Tap Agents tab
      await tester.tap(find.byKey(const Key('shell_nav_agents')));
      await tester.pumpAndSettle();
      expect(find.text('Agents (Coming Soon)'), findsOneWidget);

      // Tap Settings tab
      await tester.tap(find.byKey(const Key('shell_nav_settings')));
      await tester.pumpAndSettle();
      expect(find.text('Settings (Coming Soon)'), findsOneWidget);

      // Return to Dashboard
      await tester.tap(find.byKey(const Key('shell_nav_dashboard')));
      await tester.pumpAndSettle();
      expect(find.text('Active Sessions'), findsOneWidget);
    });

    testWidgets('preserves state when switching between tabs', (tester) async {
      await tester.pumpWidget(buildShellApp());
      await tester.pumpAndSettle();

      expect(find.text('Refactor Auth Pipeline'), findsOneWidget);

      // Switch to Projects
      await tester.tap(find.byKey(const Key('shell_nav_projects')));
      await tester.pumpAndSettle();
      expect(find.text('Projects (Coming Soon)'), findsOneWidget);

      // Switch back to Dashboard — state is preserved immediately without reload
      await tester.tap(find.byKey(const Key('shell_nav_dashboard')));
      await tester.pumpAndSettle();
      expect(find.text('Refactor Auth Pipeline'), findsOneWidget);
    });

    testWidgets('renders AttentionBadge on Sessions tab when pendingCount > 0',
        (tester) async {
      await tester.pumpWidget(buildShellApp(attentionCount: 4));
      await tester.pumpAndSettle();

      expect(find.text('4'), findsWidgets);
    });

    testWidgets('opens AppDrawer and navigates to secondary route', (tester) async {
      await tester.pumpWidget(buildShellApp());
      await tester.pumpAndSettle();

      // Open drawer from Dashboard leading icon
      await tester.tap(find.byKey(const Key('dashboard_drawer_button')));
      await tester.pumpAndSettle();

      // Drawer contents visible
      expect(find.text('Teams'), findsOneWidget);
      expect(find.text('Workflows'), findsOneWidget);
      expect(find.text('Skills'), findsOneWidget);
      expect(find.text('MCP Servers'), findsOneWidget);
      expect(find.text('Schedules'), findsOneWidget);
      expect(find.text('Logs'), findsOneWidget);

      // Navigate to Teams
      await tester.tap(find.byKey(const Key('drawer_teams_item')));
      await tester.pumpAndSettle();

      expect(find.text('Teams (Coming Soon)'), findsOneWidget);
    });
  });
}
