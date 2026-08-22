import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/agents/ui/agent_detail_screen.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';
import 'package:spaces_mobile/shared/widgets/entity_chat_screen.dart';
import 'package:spaces_mobile/shared/widgets/entity_page_indicator.dart';

class MockAgentsRepository implements AgentsRepository {
  Agent testAgent = const Agent(
    id: 'agent-1',
    name: 'Senior Architect',
    description: 'System design expert',
    model: 'claude-3-7-sonnet',
    status: 'ready',
  );

  @override
  Future<List<Agent>> getAgents() async => [testAgent];

  @override
  Future<Agent> getAgent(String id) async => testAgent;

  @override
  Future<Agent> createAgent(Map<String, dynamic> definition) async =>
      const Agent(id: 'new', name: 'New');

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async =>
      testAgent.copyWith(
        model: patch['model'] as String? ?? testAgent.model,
      );

  @override
  Future<void> deleteAgent(String id) async {}

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};

  @override
  Future<Map<String, dynamic>> getEntityConfig(
    String entityType,
    String entityId,
  ) async => {
        'defaultModel': 'claude-3-7-sonnet',
        'skills': ['web-search'],
      };

  @override
  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async => {
        'resolved': ['read_file'],
      };

  @override
  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async => {'success': true};

  @override
  Future<List<Map<String, dynamic>>> getAvailableModels() async => [
        {'id': 'claude-3-7-sonnet', 'name': 'Claude 3.7 Sonnet'},
        {'id': 'gpt-4o', 'name': 'GPT-4o'},
      ];

  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async => [
        {'name': 'web-search', 'description': 'Search live web', 'scope': 'global'},
      ];
}

class MockSessionsRepository implements SessionsRepository {
  List<Session> sessions = [
    const Session(
      id: 'sess-agent-1',
      title: 'Architect Session',
      agentId: 'agent-1',
      status: 'active',
    ),
  ];

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
    final newSession = Session(
      id: 'sess-${sessions.length + 1}',
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

class MockChatRepository extends Fake implements ChatRepository {
  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async => [];

  @override
  Future<List<AiModel>> getModels() async => [];

  @override
  Stream<Map<String, dynamic>> sessionEvents(String sessionId) =>
      const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get events => const Stream.empty();

  @override
  Future<void> connectToSession(String sessionId) async {}

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}
}

class FakeWsClient extends WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockAgentsRepository mockAgentsRepo;
  late MockSessionsRepository mockSessionsRepo;
  late MockChatRepository mockChatRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockAgentsRepo = MockAgentsRepository();
    mockSessionsRepo = MockSessionsRepository();
    mockChatRepo = MockChatRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        agentsRepositoryProvider.overrideWithValue(mockAgentsRepo),
        sessionsRepositoryProvider.overrideWithValue(mockSessionsRepo),
        chatRepositoryProvider.overrideWithValue(mockChatRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: AgentDetailScreen(agentId: 'agent-1'),
      ),
    );
  }

  group('AgentDetailScreen Entity-First Widget Tests', () {
    testWidgets('renders EntityChatScreen with PageView, AppBar, Sessions button, and Config button',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.byType(EntityChatScreen), findsOneWidget);
      expect(find.text('Senior Architect'), findsOneWidget);
      expect(find.byType(EntityPageIndicator), findsOneWidget);
      expect(find.byKey(const Key('entity_chat_sessions_button')), findsOneWidget);
      expect(find.byKey(const Key('entity_chat_config_button')), findsOneWidget);
    });

    testWidgets('tap on config button opens EntityConfigSheet', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('entity_chat_config_button')));
      await tester.pumpAndSettle();

      expect(find.text('Agent Settings'), findsOneWidget);
      expect(find.text('Assigned Model'), findsOneWidget);
      expect(find.byKey(const Key('entity_config_sheet_delete_button')), findsOneWidget);
    });

    testWidgets('tap on Sessions button opens EntitySessionsSheet', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('entity_chat_sessions_button')));
      await tester.pumpAndSettle();

      expect(find.text('Architect Session'), findsOneWidget);
      expect(find.byKey(const Key('entity_sessions_new_session_button')), findsOneWidget);
    });
  });
}
