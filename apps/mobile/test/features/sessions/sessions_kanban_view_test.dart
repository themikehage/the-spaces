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
import 'package:spaces_mobile/features/sessions/ui/sessions_kanban_view.dart';
import 'package:spaces_mobile/features/sessions/ui/widgets/kanban_column.dart';
import 'package:spaces_mobile/features/sessions/ui/widgets/kanban_session_card.dart';

import '../../helpers/fake_secure_storage.dart';

class MockKanbanRepository implements SessionsRepository {
  List<Session> sessions = [];

  @override
  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
    String? agentId,
    String? projectId,
    bool archived = false,
  }) async {
    return PaginatedSessions(
      items: sessions.where((s) => s.archived == archived).toList(),
      total: sessions.length,
      page: page,
      perPage: limit,
    );
  }

  @override
  Future<Session> createSession(CreateSessionInput input) async => throw UnimplementedError();

  @override
  Future<void> archiveSession(String id) async {}

  @override
  Future<void> unarchiveSession(String id) async {}

  @override
  Future<void> deleteSession(String id) async {}
}

class MockKanbanWsClient extends WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late MockKanbanRepository repository;
  late MockKanbanWsClient wsClient;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    repository = MockKanbanRepository();
    wsClient = MockKanbanWsClient();
  });

  Widget createKanbanTestWidget({GoRouter? router}) {
    final widget = ProviderScope(
      overrides: [
        sessionsRepositoryProvider.overrideWithValue(repository),
        appStorageProvider.overrideWithValue(storage),
        wsClientProvider.overrideWithValue(wsClient),
      ],
      child: const MaterialApp(
        home: Scaffold(
          body: SessionsKanbanView(),
        ),
      ),
    );

    if (router != null) {
      return ProviderScope(
        overrides: [
          sessionsRepositoryProvider.overrideWithValue(repository),
          appStorageProvider.overrideWithValue(storage),
          wsClientProvider.overrideWithValue(wsClient),
        ],
        child: MaterialApp.router(routerConfig: router),
      );
    }

    return widget;
  }

  group('SessionsKanbanView Widget Tests', () {
    testWidgets('renders 2 columns (Idle, Working) with correct counts', (tester) async {
      repository.sessions = [
        const Session(id: 'sess-1', title: 'Idle Planning', status: 'idle'),
        const Session(id: 'sess-2', title: 'Active Coding', status: 'running'),
        const Session(id: 'sess-3', title: 'Awaiting User', status: 'waiting_approval'),
        const Session(id: 'sess-4', title: 'Finished Job', status: 'completed'),
        const Session(id: 'sess-5', title: 'Archived Task', status: 'idle', archived: true),
      ];

      await tester.pumpWidget(createKanbanTestWidget());
      await tester.pumpAndSettle();

      expect(find.byType(KanbanColumn), findsNWidgets(2));
      expect(find.byKey(const Key('kanban_column_idle')), findsOneWidget);
      expect(find.byKey(const Key('kanban_column_working')), findsOneWidget);
      expect(find.byKey(const Key('kanban_column_done')), findsNothing);

      expect(find.text('Idle Planning'), findsOneWidget);
      expect(find.text('Active Coding'), findsOneWidget);
      expect(find.text('Awaiting User'), findsOneWidget);
      expect(find.text('Archived Task'), findsNothing);
    });

    testWidgets('tapping Kanban card navigates to session route', (tester) async {
      repository.sessions = [
        const Session(id: 'kanban-nav-1', title: 'Nav Session', status: 'running', agentId: 'lead-dev'),
      ];

      String? navigatedRoute;
      final router = GoRouter(
        initialLocation: '/kanban',
        routes: [
          GoRoute(
            path: '/kanban',
            builder: (context, state) => const Scaffold(body: SessionsKanbanView()),
            routes: [
              GoRoute(
                path: 'sessions/:id',
                builder: (context, state) {
                  navigatedRoute = '/sessions/${state.pathParameters['id']}';
                  return Text('Session Detail ${state.pathParameters['id']}');
                },
              ),
            ],
          ),
          GoRoute(
            path: '/sessions/:id',
            builder: (context, state) {
              navigatedRoute = '/sessions/${state.pathParameters['id']}';
              return Text('Session Detail ${state.pathParameters['id']}');
            },
          ),
        ],
      );

      await tester.pumpWidget(createKanbanTestWidget(router: router));
      await tester.pumpAndSettle();

      expect(find.byType(KanbanSessionCard), findsOneWidget);
      expect(find.text('lead-dev'), findsOneWidget);

      await tester.tap(find.byKey(const Key('kanban_card_kanban-nav-1')));
      await tester.pumpAndSettle();

      expect(navigatedRoute, equals('/sessions/kanban-nav-1'));
    });
  });
}
