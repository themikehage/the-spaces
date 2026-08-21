import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/project.dart';

class ProjectsRepository {
  final ApiClient _apiClient;

  ProjectsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<Project>> getProjects() async {
    final response = await _apiClient.get<dynamic>('/api/workspace-projects');

    if (response is Map<String, dynamic>) {
      final projectsRaw = response['projects'] ?? response['repos'];
      if (projectsRaw is List) {
        return projectsRaw
            .whereType<Map<String, dynamic>>()
            .map(Project.fromJson)
            .toList();
      }
    } else if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map(Project.fromJson)
          .toList();
    }

    return [];
  }

  Future<Project> createProject({
    required String name,
    String? description,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      if (description != null) 'description': description,
      if (cloneUrl != null) 'cloneUrl': cloneUrl,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (tag != null) 'tag': tag,
    };

    final response = await _apiClient.post<dynamic>(
      '/api/workspace-projects',
      data: payload,
    );

    if (response is Map<String, dynamic>) {
      return Project.fromJson(response);
    }

    return Project(id: name, name: name, description: description);
  }

  Future<Project> updateProject(String id, Map<String, dynamic> patch) async {
    final response = await _apiClient.patch<dynamic>(
      '/api/workspace-projects/$id',
      data: patch,
    );

    if (response is Map<String, dynamic>) {
      return Project.fromJson(response);
    }

    return Project(id: id, name: id);
  }

  Future<void> deleteProject(String id) async {
    await _apiClient.delete<dynamic>('/api/workspace-projects/$id');
  }

  Future<Map<String, dynamic>> getProjectAssignment(String id) async {
    final response = await _apiClient.get<dynamic>(
      '/api/workspace-projects/$id/assignment',
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  Future<Map<String, dynamic>> updateProjectAssignment(
    String id,
    Map<String, dynamic> assignment,
  ) async {
    final response = await _apiClient.put<dynamic>(
      '/api/workspace-projects/$id/assignment',
      data: assignment,
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  Future<List<Map<String, dynamic>>> getProjectAgents(String id) async {
    final response = await _apiClient.get<dynamic>(
      '/api/workspace-projects/$id/agents',
    );
    if (response is Map<String, dynamic>) {
      final list = response['agents'];
      if (list is List) {
        return list.whereType<Map<String, dynamic>>().toList();
      }
    } else if (response is List) {
      return response.whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }
}

final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ProjectsRepository(apiClient: apiClient);
});
