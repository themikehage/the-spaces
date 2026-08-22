import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/workflow.dart';
import 'models/workflow_run.dart';

class WorkflowsRepository {
  final ApiClient _apiClient;

  WorkflowsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<Workflow>> getWorkflows({
    String? scopeType,
    String? entityId,
  }) async {
    final queryParams = <String, dynamic>{};
    if (scopeType != null) queryParams['scopeType'] = scopeType;
    if (entityId != null) queryParams['entityId'] = entityId;

    final response = await _apiClient.get<dynamic>(
      '/api/workflows',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map(Workflow.fromJson)
          .toList();
    } else if (response is Map<String, dynamic>) {
      final list = response['workflows'] ?? response['items'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map(Workflow.fromJson)
            .toList();
      }
    }

    return [];
  }

  Future<Workflow> getWorkflow(String id) async {
    final response = await _apiClient.get<dynamic>('/api/workflows/$id');
    if (response is Map<String, dynamic>) {
      return Workflow.fromJson(response);
    }
    return Workflow(id: id, name: id);
  }

  Future<WorkflowRun> runWorkflow(
    String id, {
    Map<String, dynamic>? inputs,
    String? parentSessionId,
    bool? dryRun,
  }) async {
    final response = await _apiClient.post<dynamic>(
      '/api/workflows/$id/run',
      data: {
        if (inputs != null) 'inputs': inputs,
        if (parentSessionId != null) 'parentSessionId': parentSessionId,
        if (dryRun != null) 'dryRun': dryRun,
      },
    );

    if (response is Map<String, dynamic>) {
      return WorkflowRun.fromJson(response);
    }

    return WorkflowRun(id: 'run-$id', workflowId: id);
  }

  Future<List<WorkflowRun>> getWorkflowRuns(String workflowId) async {
    final response = await _apiClient.get<dynamic>(
      '/api/workflows/$workflowId/runs',
    );

    if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map(WorkflowRun.fromJson)
          .toList();
    } else if (response is Map<String, dynamic>) {
      final list = response['runs'] ?? response['items'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map(WorkflowRun.fromJson)
            .toList();
      }
    }

    return [];
  }

  Future<WorkflowRun> getWorkflowRun(String runId) async {
    final response = await _apiClient.get<dynamic>(
      '/api/workflows/runs/$runId',
    );

    if (response is Map<String, dynamic>) {
      return WorkflowRun.fromJson(response);
    }

    return WorkflowRun(id: runId, workflowId: '');
  }

  Future<void> abortRun(String runId) async {
    await _apiClient.post<dynamic>(
      '/api/workflows/runs/$runId/abort',
    );
  }
}

final workflowsRepositoryProvider = Provider<WorkflowsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WorkflowsRepository(apiClient: apiClient);
});
