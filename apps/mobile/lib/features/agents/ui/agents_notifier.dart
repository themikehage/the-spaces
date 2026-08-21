import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';
import '../data/agents_repository.dart';
import '../data/models/agent.dart';
import 'agents_state.dart';

class AgentsNotifier extends StateNotifier<AgentsState> {
  final AgentsRepository _repository;
  final WsClient? _wsClient;
  StreamSubscription? _wsSubscription;

  AgentsNotifier({
    required AgentsRepository repository,
    WsClient? wsClient,
  })  : _repository = repository,
        _wsClient = wsClient,
        super(const AgentsState()) {
    _listenToWsEvents();
    load();
  }

  void _listenToWsEvents() {
    final client = _wsClient;
    if (client == null) return;
    _wsSubscription?.cancel();
    _wsSubscription = client.events.listen((event) {
      final type = event['type']?.toString();
      if (type == null) return;

      if (type == 'entity-updated') {
        final entityType = event['entityType']?.toString();
        if (entityType == 'agent' ||
            entityType == 'custom_tool_scope' ||
            entityType == 'all' ||
            entityType == null) {
          load();
        }
      }
    });
  }

  Future<void> load() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final agents = await _repository.getAgents();
      state = state.copyWith(
        agents: agents,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<Agent?> createAgent(Map<String, dynamic> definition) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final created = await _repository.createAgent(definition);

      final updatedAgents = [
        created,
        ...state.agents.where((a) => a.id != created.id),
      ];

      state = state.copyWith(
        agents: updatedAgents,
        isLoading: false,
        error: null,
      );

      return created;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<Agent?> updateAgent(String id, Map<String, dynamic> patch) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final updated = await _repository.updateAgent(id, patch);

      final updatedAgents = state.agents.map((a) {
        if (a.id == id) {
          return updated;
        }
        return a;
      }).toList();

      state = state.copyWith(
        agents: updatedAgents,
        isLoading: false,
        error: null,
      );

      return updated;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<bool> deleteAgent(String id) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      await _repository.deleteAgent(id);

      final updatedAgents = state.agents.where((a) => a.id != id).toList();
      state = state.copyWith(
        agents: updatedAgents,
        isLoading: false,
        error: null,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final agentsNotifierProvider =
    StateNotifierProvider<AgentsNotifier, AgentsState>((ref) {
  final repository = ref.watch(agentsRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  return AgentsNotifier(
    repository: repository,
    wsClient: wsClient,
  );
});
