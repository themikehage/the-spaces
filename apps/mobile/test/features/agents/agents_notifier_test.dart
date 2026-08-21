import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/agents/ui/agents_notifier.dart';

class FakeAgentsRepository implements AgentsRepository {
  List<Agent> agentsList = [];
  bool shouldThrow = false;

  @override
  Future<List<Agent>> getAgents() async {
    if (shouldThrow) {
      throw Exception('Network error');
    }
    return List.from(agentsList);
  }

  @override
  Future<Agent> getAgent(String id) async {
    return agentsList.firstWhere(
      (a) => a.id == id,
      orElse: () => Agent(id: id, name: id),
    );
  }

  @override
  Future<Agent> createAgent(Map<String, dynamic> definition) async {
    if (shouldThrow) {
      throw Exception('Create error');
    }
    final newAgent = Agent(
      id: definition['id']?.toString() ?? 'agent-new',
      name: definition['name']?.toString() ?? 'New Agent',
      model: definition['model']?.toString(),
    );
    agentsList.add(newAgent);
    return newAgent;
  }

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async {
    if (shouldThrow) {
      throw Exception('Update error');
    }
    final index = agentsList.indexWhere((a) => a.id == id);
    if (index >= 0) {
      final existing = agentsList[index];
      final updated = existing.copyWith(
        name: (patch['name'] as String?) ?? existing.name,
        model: (patch['model'] as String?) ?? existing.model,
      );
      agentsList[index] = updated;
      return updated;
    }
    return Agent(id: id, name: id);
  }

  @override
  Future<void> deleteAgent(String id) async {
    if (shouldThrow) {
      throw Exception('Delete error');
    }
    agentsList.removeWhere((a) => a.id == id);
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

  late FakeAgentsRepository repository;
  late FakeWsClient wsClient;
  late AgentsNotifier notifier;

  setUp(() {
    repository = FakeAgentsRepository();
    repository.agentsList = [
      const Agent(
        id: 'agent-1',
        name: 'Lead Architect',
        description: 'Designs systems',
        model: 'claude-3-7-sonnet',
      ),
      const Agent(
        id: 'agent-2',
        name: 'Backend Dev',
        description: 'Implements APIs',
        model: 'gpt-4o',
      ),
    ];
    wsClient = FakeWsClient();
    notifier = AgentsNotifier(
      repository: repository,
      wsClient: wsClient,
    );
  });

  group('AgentsNotifier Tests', () {
    test('load populates agents list in state', () async {
      await notifier.load();

      expect(notifier.state.agents.length, equals(2));
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('search filters agents by name, id, description or model', () async {
      await notifier.load();

      notifier.search('architect');
      expect(notifier.state.filteredAgents.length, equals(1));
      expect(notifier.state.filteredAgents.first.id, equals('agent-1'));

      notifier.search('gpt-4o');
      expect(notifier.state.filteredAgents.length, equals(1));
      expect(notifier.state.filteredAgents.first.id, equals('agent-2'));

      notifier.search('none');
      expect(notifier.state.filteredAgents.isEmpty, isTrue);

      notifier.search('');
      expect(notifier.state.filteredAgents.length, equals(2));
    });

    test('createAgent appends agent to state', () async {
      await notifier.load();

      final created = await notifier.createAgent({
        'id': 'agent-qa',
        'name': 'QA Specialist',
        'model': 'gemini-2.5-flash',
      });

      expect(created, isNotNull);
      expect(notifier.state.agents.any((a) => a.id == 'agent-qa'), isTrue);
    });

    test('deleteAgent removes agent from state', () async {
      await notifier.load();

      final deleted = await notifier.deleteAgent('agent-1');

      expect(deleted, isTrue);
      expect(notifier.state.agents.length, equals(1));
      expect(notifier.state.agents.first.id, equals('agent-2'));
    });

    test('WsClient entity-updated event refreshes agents', () async {
      await notifier.load();
      expect(notifier.state.agents.length, equals(2));

      repository.agentsList.add(
        const Agent(id: 'agent-devops', name: 'DevOps Agent'),
      );

      wsClient.emit({'type': 'entity-updated', 'entityType': 'agent'});
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.agents.length, equals(3));
    });
  });
}
