import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/agent.dart';

part 'agents_state.freezed.dart';

@freezed
class AgentsState with _$AgentsState {
  const AgentsState._();

  const factory AgentsState({
    @Default(<Agent>[]) List<Agent> agents,
    @Default(false) bool isLoading,
    @Default('') String searchQuery,
    String? error,
  }) = _AgentsState;

  List<Agent> get filteredAgents {
    if (searchQuery.trim().isEmpty) {
      return agents;
    }
    final query = searchQuery.trim().toLowerCase();
    return agents.where((a) {
      final nameMatches = a.name.toLowerCase().contains(query);
      final idMatches = a.id.toLowerCase().contains(query);
      final descMatches = a.description?.toLowerCase().contains(query) ?? false;
      final modelMatches = a.model?.toLowerCase().contains(query) ?? false;
      return nameMatches || idMatches || descMatches || modelMatches;
    }).toList();
  }
}
