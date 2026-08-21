import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/agents/ui/agents_screen.dart';

class MockAgentsRepository implements AgentsRepository {
  List<Agent> agents = [
    const Agent(
      id: 'agent-1',
      name: 'Senior Architect',
      description: 'System design expert',
      model: 'claude-3-7-sonnet',
      status: 'ready',
    ),
    const Agent(
      id: 'agent-2',
      name: 'Flutter Dev',
      description: 'Mobile UI/UX engineer',
      model: 'gemini-2.5-pro',
      status: 'ready',
    ),
  ];

  @override
  Future<List<Agent>> getAgents() async => List.from(agents);

  @override
  Future<Agent> getAgent(String id) async =>
      agents.firstWhere((a) => a.id == id, orElse: () => Agent(id: id, name: id));

  @override
  Future<Agent> createAgent(Map<String, dynamic> definition) async {
    final a = Agent(
      id: definition['id']?.toString() ?? 'new-id',
      name: definition['name']?.toString() ?? 'New Agent',
      description: definition['description']?.toString(),
      model: definition['model']?.toString(),
    );
    agents.add(a);
    return a;
  }

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async =>
      Agent(id: id, name: id);

  @override
  Future<void> deleteAgent(String id) async {
    agents.removeWhere((a) => a.id == id);
  }

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};

  @override
  Future<Map<String, dynamic>> getEntityConfig(String entityType, String entityId) async => {};

  @override
  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async => {'success': true};

  @override
  Future<List<Map<String, dynamic>>> getAvailableModels() async => [];

  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async => [];

  @override
  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async => {};
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
        home: AgentsScreen(),
      ),
    );
  }

  group('AgentsScreen Widget Tests', () {
    testWidgets('renders list of agents and search bar', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Agents'), findsOneWidget);
      expect(find.byKey(const Key('agents_search_input')), findsOneWidget);
      expect(find.text('Senior Architect'), findsOneWidget);
      expect(find.text('Flutter Dev'), findsOneWidget);
      expect(find.text('claude-3-7-sonnet'), findsOneWidget);
      expect(find.byKey(const Key('create_agent_fab')), findsOneWidget);
    });

    testWidgets('search input filters displayed agents', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final searchInput = find.byKey(const Key('agents_search_input'));
      await tester.enterText(searchInput, 'flutter');
      await tester.pumpAndSettle();

      expect(find.text('Flutter Dev'), findsOneWidget);
      expect(find.text('Senior Architect'), findsNothing);
    });

    testWidgets('tapping FAB opens register agent modal and registers agent',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final fab = find.byKey(const Key('create_agent_fab'));
      await tester.tap(fab);
      await tester.pumpAndSettle();

      expect(find.text('Register New Agent'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('create_agent_id_input')),
        'agent-security',
      );
      await tester.enterText(
        find.byKey(const Key('create_agent_name_input')),
        'Security Auditor',
      );
      await tester.tap(find.byKey(const Key('create_agent_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Security Auditor'), findsOneWidget);
    });
  });
}
