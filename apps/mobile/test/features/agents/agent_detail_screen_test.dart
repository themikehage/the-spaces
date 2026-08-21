import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/agents/ui/agent_detail_screen.dart';

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
      Agent(id: 'new', name: 'New');

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

  late MockAgentsRepository mockRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockRepo = MockAgentsRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        agentsRepositoryProvider.overrideWithValue(mockRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: AgentDetailScreen(agentId: 'agent-1'),
      ),
    );
  }

  group('AgentDetailScreen Widget Tests', () {
    testWidgets('renders agent info card and EntityConfigEditor', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Senior Architect'), findsWidgets);
      expect(find.text('ID: agent-1'), findsOneWidget);
      expect(find.text('System design expert'), findsOneWidget);
      expect(find.text('Agent Configuration'), findsOneWidget);
      expect(find.text('Assigned Model'), findsOneWidget);
      expect(find.byKey(const Key('agent_detail_delete_button')), findsOneWidget);
    });
  });
}
