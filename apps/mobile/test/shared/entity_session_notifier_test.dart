import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';
import 'package:spaces_mobile/shared/notifiers/entity_session_notifier.dart';

class MockSessionsRepository implements SessionsRepository {
  List<Session> sessions = [];
  CreateSessionInput? lastCreateInput;

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
    final filtered = sessions.where((s) {
      if (agentId != null && s.agentId != agentId) return false;
      if (projectId != null && s.projectId != projectId) return false;
      return true;
    }).toList();

    return PaginatedSessions(
      items: filtered,
      total: filtered.length,
      page: 1,
      perPage: limit,
    );
  }

  @override
  Future<void> archiveSession(String id) async {}

  @override
  Future<void> unarchiveSession(String id) async {}

  @override
  Future<Session> createSession(CreateSessionInput input) async {
    lastCreateInput = input;
    final newSession = Session(
      id: 'session-created-${sessions.length + 1}',
      title: input.title,
      agentId: input.agentId,
      projectId: input.projectId,
      status: 'active',
    );
    sessions.add(newSession);
    return newSession;
  }

  @override
  Future<void> deleteSession(String id) async {
    sessions.removeWhere((s) => s.id == id);
  }
}

void main() {
  group('EntitySessionNotifier Unit Tests', () {
    late MockSessionsRepository mockRepo;

    setUp(() {
      mockRepo = MockSessionsRepository();
    });

    test('resolves existing active session when available', () async {
      mockRepo.sessions = [
        const Session(
          id: 'sess-existing-1',
          title: 'Agent Chat',
          agentId: 'agent-1',
          status: 'active',
        ),
      ];

      final notifier = EntitySessionNotifier(
        repository: mockRepo,
        args: const EntitySessionArgs(
          entityType: 'agent',
          entityId: 'agent-1',
        ),
      );

      // Wait for async initialization
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.currentSessionId, 'sess-existing-1');
      expect(notifier.state.error, isNull);
    });

    test('auto-creates new session when none exists', () async {
      mockRepo.sessions = [];

      final notifier = EntitySessionNotifier(
        repository: mockRepo,
        args: const EntitySessionArgs(
          entityType: 'project',
          entityId: 'proj-1',
        ),
      );

      // Wait for async initialization and auto-creation
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.currentSessionId, isNotNull);
      expect(notifier.state.currentSessionId, startsWith('session-created-'));
      expect(mockRepo.lastCreateInput?.projectId, 'proj-1');
    });

    test('selectSession updates currentSessionId', () async {
      mockRepo.sessions = [
        const Session(
          id: 'sess-1',
          title: 'Chat 1',
          agentId: 'agent-1',
        ),
      ];

      final notifier = EntitySessionNotifier(
        repository: mockRepo,
        args: const EntitySessionArgs(
          entityType: 'agent',
          entityId: 'agent-1',
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.currentSessionId, 'sess-1');

      notifier.selectSession('sess-2');
      expect(notifier.state.currentSessionId, 'sess-2');
    });

    test('uses initialSessionId directly if provided without query', () {
      final notifier = EntitySessionNotifier(
        repository: mockRepo,
        args: const EntitySessionArgs(
          entityType: 'agent',
          entityId: 'agent-1',
          initialSessionId: 'sess-explicit',
        ),
      );

      expect(notifier.state.currentSessionId, 'sess-explicit');
      expect(notifier.state.isLoading, isFalse);
    });
  });
}
