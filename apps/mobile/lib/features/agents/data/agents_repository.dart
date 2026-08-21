import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/agent.dart';

class AgentsRepository {
  final ApiClient _apiClient;

  AgentsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<Agent>> getAgents() async {
    final response = await _apiClient.get<dynamic>('/api/agents');

    if (response is Map<String, dynamic>) {
      final list = response['agents'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map(Agent.fromJson)
            .toList();
      }
    } else if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map(Agent.fromJson)
          .toList();
    }

    return [];
  }

  Future<Agent> getAgent(String id) async {
    final response = await _apiClient.get<dynamic>('/api/agents/$id');
    if (response is Map<String, dynamic>) {
      return Agent.fromJson(response);
    }
    return Agent(id: id, name: id);
  }

  Future<Agent> createAgent(Map<String, dynamic> definition) async {
    final response = await _apiClient.post<dynamic>(
      '/api/agents',
      data: definition,
    );

    if (response is Map<String, dynamic>) {
      return Agent.fromJson(response);
    }

    return Agent(
      id: definition['id']?.toString() ?? '',
      name: definition['name']?.toString() ?? '',
    );
  }

  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async {
    final response = await _apiClient.patch<dynamic>(
      '/api/agents/$id',
      data: patch,
    );

    if (response is Map<String, dynamic>) {
      return Agent.fromJson(response);
    }

    return Agent(id: id, name: id);
  }

  Future<void> deleteAgent(String id) async {
    await _apiClient.delete<dynamic>('/api/agents/$id');
  }

  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async {
    final response = await _apiClient.get<dynamic>(
      '/api/config/agent/$agentId/resolved',
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  Future<Map<String, dynamic>> getEntityConfig(
    String entityType,
    String entityId,
  ) async {
    final response = await _apiClient.get<dynamic>(
      '/api/config/$entityType/$entityId',
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async {
    final response = await _apiClient.put<dynamic>(
      '/api/config/$entityType/$entityId',
      data: config,
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  Future<List<Map<String, dynamic>>> getAvailableModels() async {
    final response = await _apiClient.get<dynamic>('/api/models');
    if (response is Map<String, dynamic>) {
      final list = response['models'];
      if (list is List) {
        return list.whereType<Map<String, dynamic>>().toList();
      }
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async {
    final queryParams = <String, dynamic>{};
    if (entityType != null) queryParams['entityType'] = entityType;
    if (entityId != null) queryParams['entityId'] = entityId;

    final response = await _apiClient.get<dynamic>(
      '/api/skills',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    if (response is Map<String, dynamic>) {
      final list = response['skills'];
      if (list is List) {
        return list.whereType<Map<String, dynamic>>().toList();
      }
    }
    return [];
  }

  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async {
    final queryParams = <String, dynamic>{};
    if (entityType != null) queryParams['entityType'] = entityType;
    if (entityId != null) queryParams['entityId'] = entityId;

    final response = await _apiClient.get<dynamic>(
      '/api/agents/scope/tools',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }
}

final agentsRepositoryProvider = Provider<AgentsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AgentsRepository(apiClient: apiClient);
});
