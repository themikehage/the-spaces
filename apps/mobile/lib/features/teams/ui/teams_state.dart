import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/team.dart';

part 'teams_state.freezed.dart';

@freezed
class TeamsState with _$TeamsState {
  const TeamsState._();

  const factory TeamsState({
    @Default(<Team>[]) List<Team> teams,
    @Default(false) bool isLoading,
    @Default('') String searchQuery,
    String? error,
  }) = _TeamsState;

  List<Team> get filteredTeams {
    if (searchQuery.trim().isEmpty) {
      return teams;
    }
    final query = searchQuery.trim().toLowerCase();
    return teams.where((t) {
      final nameMatches = t.name.toLowerCase().contains(query);
      final idMatches = t.id.toLowerCase().contains(query);
      final descMatches = t.description?.toLowerCase().contains(query) ?? false;
      final modeMatches = t.mode.toLowerCase().contains(query);
      final typeMatches = t.teamType.toLowerCase().contains(query);
      return nameMatches ||
          idMatches ||
          descMatches ||
          modeMatches ||
          typeMatches;
    }).toList();
  }
}
