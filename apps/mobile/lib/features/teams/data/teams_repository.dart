import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../sessions/data/models/session.dart';
import 'models/team.dart';

class TeamsRepository {
  final ApiClient _apiClient;

  TeamsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<Team>> getTeams() async {
    final response = await _apiClient.get<dynamic>('/api/teams');

    if (response is Map<String, dynamic>) {
      final list = response['teams'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map(Team.fromJson)
            .toList();
      }
    } else if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map(Team.fromJson)
          .toList();
    }

    return [];
  }

  Future<Team> getTeam(String id) async {
    final response = await _apiClient.get<dynamic>('/api/teams/$id');
    if (response is Map<String, dynamic>) {
      return Team.fromJson(response);
    }
    return Team(id: id, name: id);
  }

  Future<Team> createTeam(Map<String, dynamic> data) async {
    final response = await _apiClient.post<dynamic>(
      '/api/teams',
      data: data,
    );

    if (response is Map<String, dynamic>) {
      return Team.fromJson(response);
    }

    return Team(
      id: data['id']?.toString() ?? '',
      name: data['name']?.toString() ?? '',
    );
  }

  Future<Team> updateTeam(String id, Map<String, dynamic> patch) async {
    final response = await _apiClient.patch<dynamic>(
      '/api/teams/$id',
      data: patch,
    );

    if (response is Map<String, dynamic>) {
      return Team.fromJson(response);
    }

    return Team(id: id, name: id);
  }

  Future<void> deleteTeam(String id) async {
    await _apiClient.delete<dynamic>('/api/teams/$id');
  }

  Future<List<Session>> getTeamSessions(String teamId) async {
    final response = await _apiClient.get<dynamic>('/api/sessions');

    List<Session> sessions = [];
    if (response is Map<String, dynamic>) {
      final list = response['sessions'];
      if (list is List) {
        sessions = list
            .whereType<Map<String, dynamic>>()
            .map(Session.fromJson)
            .toList();
      }
    } else if (response is List) {
      sessions = response
          .whereType<Map<String, dynamic>>()
          .map(Session.fromJson)
          .toList();
    }

    return sessions.where((s) => s.teamId == teamId).toList();
  }
}

final teamsRepositoryProvider = Provider<TeamsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return TeamsRepository(apiClient: apiClient);
});
