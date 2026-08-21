import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/router/app_router.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/auth/ui/auth_notifier.dart';
import 'package:spaces_mobile/features/auth/ui/auth_state.dart';
import 'package:spaces_mobile/features/dashboard/data/dashboard_repository.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_project.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_session.dart';

class FakeAuthRepository implements AuthRepository {
  bool isAuth = false;
  String? username;
  String? userId;
  String? token;

  @override
  Future<AuthResponse> login(String username, String password) async {
    this.username = username;
    token = 'fake-token';
    isAuth = true;
    return AuthResponse(
      user: AuthUser(username: username, id: 'u1'),
      token: token,
    );
  }

  @override
  Future<void> logout() async {
    isAuth = false;
    username = null;
    token = null;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Future<String?> getUsername() async => username;

  @override
  Future<String?> getUserId() async => userId;

  @override
  Future<bool> isAuthenticated() async => isAuth;
}

class FakeDashboardRepository implements DashboardRepository {
  @override
  Future<List<DashboardSession>> getActiveSessions() async => [];

  @override
  Future<List<DashboardProject>> getRecentProjects({int limit = 5}) async => [];
}

class FakeWsClient implements WsClient {
  final _eventsController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<bool>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _eventsController.stream;

  @override
  Stream<bool> get isConnected => _statusController.stream;

  @override
  bool get connected => false;

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

class TestAuthNotifier extends AuthNotifier {
  TestAuthNotifier(AuthRepository repository, AuthState initialState)
      : super(repository: repository) {
    state = initialState;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeAuthRepository fakeRepository;
  late FakeDashboardRepository fakeDashboardRepo;
  late FakeWsClient fakeWsClient;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    fakeRepository = FakeAuthRepository();
    fakeDashboardRepo = FakeDashboardRepository();
    fakeWsClient = FakeWsClient();
  });

  tearDown(() {
    fakeWsClient.dispose();
  });

  Widget buildApp(AuthState initialState) {
    return ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(fakeRepository),
        dashboardRepositoryProvider.overrideWithValue(fakeDashboardRepo),
        wsClientProvider.overrideWithValue(fakeWsClient),
        authNotifierProvider.overrideWith((ref) => TestAuthNotifier(fakeRepository, initialState)),
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

  group('AppRouter Route Guard Tests', () {
    testWidgets('unauthenticated user is redirected to /login', (tester) async {
      await tester.pumpWidget(buildApp(const AuthState.unauthenticated()));
      await tester.pumpAndSettle();

      expect(find.text('Welcome to Spaces'), findsOneWidget);
      expect(find.byKey(const Key('login_submit_button')), findsOneWidget);
    });

    testWidgets('authenticated user sees dashboard and can sign out', (tester) async {
      fakeRepository.isAuth = true;
      fakeRepository.username = 'admin';
      await tester.pumpWidget(buildApp(const AuthState.authenticated(username: 'admin')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Welcome back, admin!'), findsOneWidget);
      expect(find.byKey(const Key('dashboard_logout_button')), findsOneWidget);
    });
  });
}
