import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/dashboard_project.dart';
import 'models/dashboard_session.dart';

class DashboardRepository {
  final ApiClient _apiClient;

  DashboardRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<DashboardSession>> getActiveSessions() async {
    final response = await _apiClient.get<dynamic>(
      '/api/sessions',
      queryParameters: {'status': 'running'},
    );

    final List<dynamic> rawList;
    if (response is Map<String, dynamic> && response['sessions'] is List) {
      rawList = response['sessions'] as List<dynamic>;
    } else if (response is List) {
      rawList = response;
    } else {
      rawList = [];
    }

    return rawList
        .whereType<Map<String, dynamic>>()
        .map(DashboardSession.fromJson)
        .toList();
  }

  Future<List<DashboardProject>> getRecentProjects({int limit = 5}) async {
    final response = await _apiClient.get<dynamic>(
      '/api/workspace-projects',
      queryParameters: {
        'limit': limit,
        'sort': 'updatedAt',
      },
    );

    final List<dynamic> rawList;
    if (response is Map<String, dynamic>) {
      if (response['projects'] is List) {
        rawList = response['projects'] as List<dynamic>;
      } else if (response['repos'] is List) {
        rawList = response['repos'] as List<dynamic>;
      } else {
        rawList = [];
      }
    } else if (response is List) {
      rawList = response;
    } else {
      rawList = [];
    }

    final projects = rawList
        .whereType<Map<String, dynamic>>()
        .map(DashboardProject.fromJson)
        .toList();

    if (projects.length > limit) {
      return projects.sublist(0, limit);
    }
    return projects;
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardRepository(apiClient: apiClient);
});
