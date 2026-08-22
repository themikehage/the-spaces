import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';
import 'package:spaces_mobile/features/sessions/ui/sessions_notifier.dart';

import '../../helpers/fake_secure_storage.dart';

class FakeSessionsRepository implements SessionsRepository {
  List<Session> mockSessions = [];
  int total = 0;
  bool shouldThrow = false;
  CreateSessionInput? lastCreatedInput;
  String? lastDeletedId;

  @override
  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
    String? agentId,
    String? projectId,
  }) async {
    if (shouldThrow) {
      throw Exception('Failed to fetch sessions');
    }
    return PaginatedSessions(
      items: mockSessions,
      total: total,
      page: page,
      perPage: limit,
    );
  }

  @override
  Future<Session> createSession(CreateSessionInput input) async {
    if (shouldThrow) {
      throw Exception('Failed to create session');
    }
    lastCreatedInput = input;
    final created = Session(
      id: 'created-id',
      title: input.title,
      agentId: input.agentId,
      projectId: input.projectId,
      status: 'active',
      createdAt: '2026-08-21T21:00:00Z',
      updatedAt: '2026-08-21T21:00:00Z',
    );
    mockSessions.insert(0, created);
    return created;
  }

  @override
  Future<void> deleteSession(String id) async {
    if (shouldThrow) {
      throw Exception('Failed to delete session');
    }
    lastDeletedId = id;
    mockSessions.removeWhere((s) => s.id == id);
  }
}

class FakeWsClient extends WsClient {
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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late FakeSessionsRepository repository;
  late FakeWsClient wsClient;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    repository = FakeSessionsRepository();
    wsClient = FakeWsClient();
  });

  group('SessionsNotifier Tests', () {
    test('load fetches sessions and updates state', () async {
      repository.mockSessions = [
        const Session(
          id: 'sess-1',
          title: 'Session One',
          status: 'active',
          createdAt: '2026-08-21T10:00:00Z',
          updatedAt: '2026-08-21T11:00:00Z',
        ),
      ];
      repository.total = 1;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.sessions.length, equals(1));
      expect(notifier.state.sessions.first.id, equals('sess-1'));
    });

    test('loadMore concatenates next page when hasMore is true', () async {
      repository.mockSessions = [
        const Session(id: 'sess-1', title: 'Session 1', status: 'active'),
      ];
      repository.total = 40;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.sessions.length, equals(1));
      expect(notifier.state.hasMore, isTrue);

      repository.mockSessions = [
        const Session(id: 'sess-2', title: 'Session 2', status: 'idle'),
      ];

      await notifier.loadMore();

      expect(notifier.state.sessions.length, equals(2));
      expect(notifier.state.sessions[0].id, equals('sess-1'));
      expect(notifier.state.sessions[1].id, equals('sess-2'));
      expect(notifier.state.page, equals(2));
    });

    test('setFilter updates filter and persists in AppStorage', () async {
      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await notifier.setFilter('active');

      expect(notifier.state.filter, equals('active'));
      expect(storage.prefRead(StorageKey.sessionFilter), equals('active'));
    });

    test('search updates searchQuery and filters local list', () async {
      repository.mockSessions = [
        const Session(id: 'sess-1', title: 'Fix bug in auth', status: 'active'),
        const Session(id: 'sess-2', title: 'Deploy mobile app', status: 'idle'),
      ];
      repository.total = 2;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.filteredSessions.length, equals(2));

      notifier.search('auth');
      expect(notifier.state.filteredSessions.length, equals(1));
      expect(notifier.state.filteredSessions.first.title, equals('Fix bug in auth'));
    });

    test('createSession calls repository and prepends created session', () async {
      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      const input = CreateSessionInput(
        title: 'New Session 101',
        agentId: 'agent-dev',
      );

      final created = await notifier.createSession(input);

      expect(created.id, equals('created-id'));
      expect(notifier.state.sessions.any((s) => s.id == 'created-id'), isTrue);
    });

    test('deleteSession removes session from state and calls repository', () async {
      repository.mockSessions = [
        const Session(id: 'sess-del-1', title: 'To Delete', status: 'idle'),
      ];
      repository.total = 1;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.sessions.length, equals(1));

      await notifier.deleteSession('sess-del-1');

      expect(notifier.state.sessions.isEmpty, isTrue);
      expect(repository.lastDeletedId, equals('sess-del-1'));
    });

    test('WS session_created event prepends session to state', () async {
      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      wsClient.emit({
        'type': 'session_created',
        'session': {
          'id': 'ws-sess-1',
          'name': 'Created from Web',
          'status': 'active',
          'createdAt': '2026-08-21T21:30:00Z',
          'updatedAt': '2026-08-21T21:30:00Z',
        },
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.sessions.any((s) => s.id == 'ws-sess-1'), isTrue);
      expect(notifier.state.sessions.first.title, equals('Created from Web'));
    });

    test('WS session_deleted event removes session from state', () async {
      repository.mockSessions = [
        const Session(id: 'ws-del-1', title: 'Will Be Deleted', status: 'idle'),
      ];
      repository.total = 1;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.sessions.length, equals(1));

      wsClient.emit({
        'type': 'session_deleted',
        'sessionId': 'ws-del-1',
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.sessions.isEmpty, isTrue);
    });

    test('WS session_status event updates status in state', () async {
      repository.mockSessions = [
        const Session(id: 'ws-status-1', title: 'Running Task', status: 'idle'),
      ];
      repository.total = 1;

      final notifier = SessionsNotifier(
        repository: repository,
        storage: storage,
        wsClient: wsClient,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      wsClient.emit({
        'type': 'session_status',
        'sessionId': 'ws-status-1',
        'status': 'running',
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.sessions.first.status, equals('running'));
    });
  });
}
