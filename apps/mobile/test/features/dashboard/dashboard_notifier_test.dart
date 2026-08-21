import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/dashboard/data/dashboard_repository.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_project.dart';
import 'package:spaces_mobile/features/dashboard/data/models/dashboard_session.dart';
import 'package:spaces_mobile/features/dashboard/ui/dashboard_notifier.dart';

class FakeDashboardRepository implements DashboardRepository {
  List<DashboardSession> sessionsToReturn = [];
  List<DashboardProject> projectsToReturn = [];
  ApiException? errorToThrow;

  @override
  Future<List<DashboardSession>> getActiveSessions() async {
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
    return sessionsToReturn;
  }

  @override
  Future<List<DashboardProject>> getRecentProjects({int limit = 5}) async {
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
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

  void emitEvent(Map<String, dynamic> event) {
    _eventsController.add(event);
  }

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

void main() {
  late FakeDashboardRepository repository;
  late FakeWsClient wsClient;
  late DashboardNotifier notifier;

  setUp(() {
    repository = FakeDashboardRepository();
    wsClient = FakeWsClient();

    repository.sessionsToReturn = [
      const DashboardSession(
        id: 'sess-1',
        title: 'Session Alpha',
        status: 'running',
        agentId: 'agent-1',
      ),
      const DashboardSession(
        id: 'sess-2',
        title: 'Session Beta',
        status: 'idle',
        agentId: 'agent-2',
      ),
    ];

    repository.projectsToReturn = [
      const DashboardProject(
        id: 'proj-1',
        name: 'the-spaces',
        description: 'AI-assisted workspace',
        sessionCount: 5,
      ),
    ];
  });

  tearDown(() {
    wsClient.dispose();
  });

  group('DashboardNotifier Tests', () {
    test('load() transitions state from loading to success with data', () async {
      notifier = DashboardNotifier(
        repository: repository,
        wsClient: wsClient,
        autoLoad: false,
      );

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.sessions, isEmpty);
      expect(notifier.state.projects, isEmpty);

      final future = notifier.load();
      expect(notifier.state.isLoading, isTrue);

      await future;

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
      expect(notifier.state.sessions.length, equals(2));
      expect(notifier.state.projects.length, equals(1));
      expect(notifier.state.sessions.first.title, equals('Session Alpha'));
      expect(notifier.state.projects.first.name, equals('the-spaces'));
    });

    test('load() transitions state to error on repository exception', () async {
      repository.errorToThrow = const NetworkException(
        message: 'Could not connect to server',
      );

      notifier = DashboardNotifier(
        repository: repository,
        wsClient: wsClient,
        autoLoad: false,
      );

      await notifier.load();

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.isError, isTrue);
      expect(notifier.state.error, equals('Could not connect to server'));
    });

    test('refresh() reloads data and clears error', () async {
      notifier = DashboardNotifier(
        repository: repository,
        wsClient: wsClient,
        autoLoad: false,
      );

      await notifier.load();
      expect(notifier.state.sessions.length, equals(2));

      // Update mock data
      repository.sessionsToReturn = [
        const DashboardSession(
          id: 'sess-3',
          title: 'Session Gamma',
          status: 'running',
        ),
      ];

      await notifier.refresh();

      expect(notifier.state.sessions.length, equals(1));
      expect(notifier.state.sessions.first.id, equals('sess-3'));
      expect(notifier.state.error, isNull);
    });

    test('WS event session_status updates existing session badge in real-time', () async {
      notifier = DashboardNotifier(
        repository: repository,
        wsClient: wsClient,
        autoLoad: false,
      );

      await notifier.load();
      expect(notifier.state.sessions.first.status, equals('running'));

      // Emit WS event changing status to idle
      wsClient.emitEvent({
        'type': 'session_status',
        'sessionId': 'sess-1',
        'status': 'idle',
      });

      await Future<void>.delayed(Duration.zero);

      final updated = notifier.state.sessions.firstWhere((s) => s.id == 'sess-1');
      expect(updated.status, equals('idle'));
      expect(updated.isIdle, isTrue);
    });

    test('WS event session_status for new running session adds to list', () async {
      notifier = DashboardNotifier(
        repository: repository,
        wsClient: wsClient,
        autoLoad: false,
      );

      await notifier.load();
      expect(notifier.state.sessions.length, equals(2));

      wsClient.emitEvent({
        'type': 'session_status',
        'sessionId': 'sess-new',
        'title': 'New Agent Task',
        'status': 'running',
      });

      await Future<void>.delayed(Duration.zero);

      expect(notifier.state.sessions.length, equals(3));
      expect(notifier.state.sessions.first.id, equals('sess-new'));
      expect(notifier.state.sessions.first.title, equals('New Agent Task'));
      expect(notifier.state.sessions.first.isRunning, isTrue);
    });
  });
}
