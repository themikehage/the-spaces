import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/dashboard/data/dashboard_repository.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_project.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_session.dart';
import 'package:spaces_mobile/features/dashboard/ui/dashboard_screen.dart';
import 'package:spaces_mobile/features/dashboard/ui/widgets/project_card.dart';
import 'package:spaces_mobile/features/dashboard/ui/widgets/session_card.dart';

class FakeAuthRepository implements AuthRepository {
  bool isAuth = true;
  String? username = 'spacesadmin';

  @override
  Future<AuthResponse> login(String username, String password) async {
    return AuthResponse(user: AuthUser(username: username));
  }

  @override
  Future<void> logout() async {
    isAuth = false;
    username = null;
  }

  @override
  Future<String?> getToken() async => 'fake-token';

  @override
  Future<String?> getUsername() async => username;

  @override
  Future<String?> getUserId() async => 'u-1';

  @override
  Future<bool> isAuthenticated() async => isAuth;
}

class FakeDashboardRepository implements DashboardRepository {
  List<DashboardSession> sessionsToReturn = [];
  List<DashboardProject> projectsToReturn = [];
  bool shouldThrow = false;
  int loadCalls = 0;

  @override
  Future<List<DashboardSession>> getActiveSessions() async {
    loadCalls++;
    if (shouldThrow) throw Exception('Network error');
    return sessionsToReturn;
  }

  @override
  Future<List<DashboardProject>> getRecentProjects({int limit = 5}) async {
    if (shouldThrow) throw Exception('Network error');
    return projectsToReturn;
  }
}

class FakeWsClient implements WsClient {
  final _eventsController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<bool>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _eventsController.stream;

  @override
  Stream<bool> get isConnected => _statusController.stream;

  @override
  bool get connected => true;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  Future<void> disconnect() async {}

  @override
  void send(Map<String, dynamic> message) {}

  @override
  void dispose() {
    _eventsController.close();
    _statusController.close();
  }
}

Widget createTestApp({
  required DashboardRepository dashboardRepository,
  required AuthRepository authRepository,
  WsClient? wsClient,
}) {
  return ProviderScope(
    overrides: [
      dashboardRepositoryProvider.overrideWithValue(dashboardRepository),
      authRepositoryProvider.overrideWithValue(authRepository),
      if (wsClient != null) wsClientProvider.overrideWithValue(wsClient),
    ],
    child: MaterialApp(
      theme: AppTheme.dark(),
      home: const DashboardScreen(),
    ),
  );
}

void main() {
  late FakeDashboardRepository repository;
  late FakeAuthRepository authRepository;
  late FakeWsClient wsClient;

  setUp(() {
    repository = FakeDashboardRepository();
    authRepository = FakeAuthRepository();
    wsClient = FakeWsClient();

    repository.sessionsToReturn = [
      const DashboardSession(
        id: 'sess-1',
        title: 'Refactor Core Architecture',
        status: 'running',
        agentId: 'agent-architect',
        messageCount: 8,
        updatedAt: '2026-08-19T20:00:00Z',
      ),
    ];

    repository.projectsToReturn = [
      const DashboardProject(
        id: 'proj-1',
        name: 'the-spaces',
        description: 'AI-assisted cloud workspace',
        sessionCount: 12,
        updatedAt: '2026-08-19T21:00:00Z',
      ),
    ];
  });

  tearDown(() {
    wsClient.dispose();
  });

  group('DashboardScreen Widget Tests', () {
    testWidgets('renders active sessions and recent projects on load', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          dashboardRepository: repository,
          authRepository: authRepository,
          wsClient: wsClient,
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Spaces'), findsOneWidget);
      expect(find.textContaining('Welcome back, spacesadmin!'), findsOneWidget);
      expect(find.text('Active Sessions'), findsOneWidget);
      expect(find.text('Recent Projects'), findsOneWidget);
      expect(find.text('Quick Actions'), findsOneWidget);

      expect(find.byType(SessionCard), findsOneWidget);
      expect(find.text('Refactor Core Architecture'), findsOneWidget);
      expect(find.text('Running'), findsOneWidget);
      expect(find.text('agent-architect'), findsOneWidget);

      expect(find.byType(ProjectCard), findsOneWidget);
      expect(find.text('the-spaces'), findsOneWidget);
      expect(find.text('12 sessions'), findsOneWidget);
    });

    testWidgets('renders empty state when no sessions or projects exist', (tester) async {
      repository.sessionsToReturn = [];
      repository.projectsToReturn = [];

      await tester.pumpWidget(
        createTestApp(
          dashboardRepository: repository,
          authRepository: authRepository,
          wsClient: wsClient,
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No active sessions running'), findsOneWidget);
      expect(find.text('No projects found in workspace'), findsOneWidget);
    });

    testWidgets('renders error banner and retry button on load failure', (tester) async {
      repository.shouldThrow = true;

      await tester.pumpWidget(
        createTestApp(
          dashboardRepository: repository,
          authRepository: authRepository,
          wsClient: wsClient,
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('dashboard_retry_button')), findsOneWidget);
      expect(find.textContaining('Failed to load dashboard data'), findsOneWidget);

      // Now fix error and tap retry
      repository.shouldThrow = false;
      await tester.tap(find.byKey(const Key('dashboard_retry_button')));
      await tester.pumpAndSettle();

      expect(find.byType(SessionCard), findsOneWidget);
      expect(find.text('Refactor Core Architecture'), findsOneWidget);
    });

    testWidgets('pull to refresh invokes refresh', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          dashboardRepository: repository,
          authRepository: authRepository,
          wsClient: wsClient,
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('dashboard_refresh_indicator')), findsOneWidget);

      await tester.fling(
        find.byKey(const Key('dashboard_refresh_indicator')),
        const Offset(0.0, 300.0),
        1000.0,
      );

      await tester.pumpAndSettle();
      expect(repository.loadCalls, greaterThanOrEqualTo(2));
    });

    testWidgets('logout button triggers auth logout', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          dashboardRepository: repository,
          authRepository: authRepository,
          wsClient: wsClient,
        ),
      );

      await tester.pumpAndSettle();

      final logoutButton = find.byKey(const Key('dashboard_logout_button'));
      expect(logoutButton, findsOneWidget);

      await tester.tap(logoutButton);
      await tester.pumpAndSettle();

      expect(authRepository.isAuth, isFalse);
    });
  });
}
