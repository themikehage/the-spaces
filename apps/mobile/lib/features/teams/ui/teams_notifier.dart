import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';
import '../data/models/team.dart';
import '../data/teams_repository.dart';
import 'teams_state.dart';

class TeamsNotifier extends StateNotifier<TeamsState> {
  final TeamsRepository _repository;
  final WsClient? _wsClient;
  StreamSubscription? _wsSubscription;

  TeamsNotifier({
    required TeamsRepository repository,
    WsClient? wsClient,
  })  : _repository = repository,
        _wsClient = wsClient,
        super(const TeamsState()) {
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
        if (entityType == 'team' ||
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
      final teams = await _repository.getTeams();
      state = state.copyWith(
        teams: teams,
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

  Future<Team?> createTeam(Map<String, dynamic> data) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final created = await _repository.createTeam(data);

      final updatedTeams = [
        created,
        ...state.teams.where((t) => t.id != created.id),
      ];

      state = state.copyWith(
        teams: updatedTeams,
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

  Future<Team?> updateTeam(String id, Map<String, dynamic> patch) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final updated = await _repository.updateTeam(id, patch);

      final updatedTeams = state.teams.map((t) {
        if (t.id == id) {
          return updated;
        }
        return t;
      }).toList();

      state = state.copyWith(
        teams: updatedTeams,
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

  Future<bool> deleteTeam(String id) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      await _repository.deleteTeam(id);

      final updatedTeams = state.teams.where((t) => t.id != id).toList();
      state = state.copyWith(
        teams: updatedTeams,
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

final teamsNotifierProvider =
    StateNotifierProvider<TeamsNotifier, TeamsState>((ref) {
  final repository = ref.watch(teamsRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  return TeamsNotifier(
    repository: repository,
    wsClient: wsClient,
  );
});
