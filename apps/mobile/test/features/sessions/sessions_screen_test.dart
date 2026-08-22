import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';
import 'package:spaces_mobile/features/sessions/ui/sessions_screen.dart';
import 'package:spaces_mobile/features/sessions/ui/widgets/session_list_item.dart';

import '../../helpers/fake_secure_storage.dart';

class MockSessionsRepository implements SessionsRepository {
  List<Session> sessions = [];
  int total = 0;
  String? lastDeletedId;
  CreateSessionInput? lastCreatedInput;

  @override
  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
  }) async {
    var list = sessions;
    if (status != null && status.isNotEmpty && status.toLowerCase() != 'all') {
      if (status.toLowerCase() == 'active') {
        list = list.where((s) => s.isRunning).toList();
      } else if (status.toLowerCase() == 'idle') {
        list = list.where((s) => s.isIdle).toList();
      }
    }
    return PaginatedSessions(
      items: list,
      total: total > 0 ? total : list.length,
      page: page,
      perPage: limit,
    );
  }

  @override
  Future<Session> createSession(CreateSessionInput input) async {
    lastCreatedInput = input;
    final created = Session(
      id: 'sess-new-123',
      title: input.title,
      agentId: input.agentId,
      projectId: input.projectId,
      status: 'active',
      createdAt: '2026-08-21T21:00:00Z',
      updatedAt: '2026-08-21T21:00:00Z',
    );
    sessions.insert(0, created);
    return created;
  }

  @override
  Future<void> deleteSession(String id) async {
    lastDeletedId = id;
    sessions.removeWhere((s) => s.id == id);
  }
}

class MockWsClient extends WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  void emit(Map<String, dynamic> event) {
    _controller.add(event);
  }

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

Widget createTestableWidget({
  required Widget child,
  required MockSessionsRepository repository,
  required AppStorage storage,
  required MockWsClient wsClient,
  GoRouter? router,
}) {
  return ProviderScope(
    overrides: [
      sessionsRepositoryProvider.overrideWithValue(repository),
      appStorageProvider.overrideWithValue(storage),
      wsClientProvider.overrideWithValue(wsClient),
    ],
    child: router != null
        ? MaterialApp.router(routerConfig: router)
        : MaterialApp(home: child),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late MockSessionsRepository repository;
  late MockWsClient wsClient;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    repository = MockSessionsRepository();
    wsClient = MockWsClient();
  });

  group('SessionsScreen Widget Tests', () {
    testWidgets('shows skeleton and then real sessions list', (tester) async {
      repository.sessions = [
        const Session(
          id: 'sess-1',
          title: 'Refactor Auth Architecture',
          status: 'active',
          agentId: 'architect',
          messageCount: 5,
        ),
        const Session(
          id: 'sess-2',
          title: 'Migrate Theme Tokens',
          status: 'idle',
          agentId: 'designer',
          messageCount: 2,
        ),
      ];

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      ));

      expect(find.byKey(const Key('sessions_skeleton_list')), findsOneWidget);

      await tester.pumpAndSettle();

      expect(find.text('Refactor Auth Architecture'), findsOneWidget);
      expect(find.text('Migrate Theme Tokens'), findsOneWidget);
      expect(find.text('architect'), findsOneWidget);
      expect(find.text('designer'), findsOneWidget);
      expect(find.text('5 msgs'), findsOneWidget);
    });

    testWidgets('search filters sessions in real-time', (tester) async {
      repository.sessions = [
        const Session(id: 'sess-1', title: 'Implement Auth', status: 'active'),
        const Session(id: 'sess-2', title: 'Design System', status: 'idle'),
      ];

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      ));

      await tester.pumpAndSettle();

      expect(find.text('Implement Auth'), findsOneWidget);
      expect(find.text('Design System'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('sessions_search_field')), 'Auth');
      await tester.pumpAndSettle();

      expect(find.text('Implement Auth'), findsOneWidget);
      expect(find.text('Design System'), findsNothing);
    });

    testWidgets('filter chips filter sessions by status', (tester) async {
      repository.sessions = [
        const Session(id: 'sess-1', title: 'Active Task', status: 'active'),
        const Session(id: 'sess-2', title: 'Idle Task', status: 'idle'),
      ];

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      ));

      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('filter_chip_active')));
      await tester.pumpAndSettle();

      expect(find.text('Active Task'), findsOneWidget);
      expect(find.text('Idle Task'), findsNothing);
    });

    testWidgets('FAB opens NewSessionSheet and creates session', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      repository.sessions = [];

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      ));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('sessions_empty_state')), findsOneWidget);

      await tester.tap(find.byKey(const Key('new_session_fab')));
      await tester.pumpAndSettle();

      expect(find.text('Create New Session'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('new_session_title_field')),
        'Test Session From Sheet',
      );
      await tester.enterText(
        find.byKey(const Key('new_session_agent_field')),
        'agent-core',
      );

      await tester.ensureVisible(find.byKey(const Key('create_session_submit_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('create_session_submit_button')));
      await tester.pumpAndSettle();

      expect(repository.lastCreatedInput?.title, equals('Test Session From Sheet'));
      expect(find.byType(SessionListItem), findsOneWidget);
      expect(find.text('Test Session From Sheet'), findsWidgets);
    });

    testWidgets('swipe to delete shows confirmation and deletes session on confirm', (tester) async {
      repository.sessions = [
        const Session(id: 'sess-to-del', title: 'Session To Delete', status: 'idle'),
      ];

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      ));

      await tester.pumpAndSettle();

      expect(find.text('Session To Delete'), findsOneWidget);

      await tester.drag(
        find.byKey(const Key('dismissible_session_sess-to-del')),
        const Offset(-500, 0),
      );
      await tester.pumpAndSettle();

      expect(find.text('Delete Session'), findsOneWidget);

      await tester.tap(find.byKey(const Key('confirm_delete_button')));
      await tester.pumpAndSettle();

      expect(find.text('Session To Delete'), findsNothing);
      expect(repository.lastDeletedId, equals('sess-to-del'));
    });

    testWidgets('tapping session item navigates to /sessions/:id', (tester) async {
      repository.sessions = [
        const Session(id: 'sess-nav-1', title: 'Clickable Session', status: 'active'),
      ];

      String? navigatedRoute;
      final router = GoRouter(
        initialLocation: '/sessions',
        routes: [
          GoRoute(
            path: '/sessions',
            builder: (context, state) => const SessionsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  navigatedRoute = '/sessions/${state.pathParameters['id']}';
                  return Text('Detail ${state.pathParameters['id']}');
                },
              ),
            ],
          ),
        ],
      );

      await tester.pumpWidget(createTestableWidget(
        child: const SessionsScreen(),
        repository: repository,
        storage: storage,
        wsClient: wsClient,
        router: router,
      ));

      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('session_item_sess-nav-1')));
      await tester.pumpAndSettle();

      expect(navigatedRoute, equals('/sessions/sess-nav-1'));
      expect(find.text('Detail sess-nav-1'), findsOneWidget);
    });
  });
}
