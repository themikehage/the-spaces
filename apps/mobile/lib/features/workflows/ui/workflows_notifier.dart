import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';
import '../data/models/workflow_run.dart';
import '../data/workflows_repository.dart';
import 'workflows_state.dart';

class WorkflowsNotifier extends StateNotifier<WorkflowsState> {
  final WorkflowsRepository _repository;
  final WsClient? _wsClient;
  StreamSubscription? _wsSubscription;

  WorkflowsNotifier({
    required WorkflowsRepository repository,
    WsClient? wsClient,
  })  : _repository = repository,
        _wsClient = wsClient,
        super(const WorkflowsState()) {
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

      if (type == 'workflow_run_started' ||
          type == 'workflow_step_status' ||
          type == 'workflow_run_completed' ||
          type == 'workflow_run_failed') {
        final runId = event['runId']?.toString();
        if (runId != null && state.activeRun?.id == runId) {
          loadRun(runId);
        }
        final workflowId = event['workflowId']?.toString();
        if (workflowId != null) {
          loadRunsForWorkflow(workflowId);
        }
        load();
      } else if (type == 'entity-updated') {
        final entityType = event['entityType']?.toString();
        if (entityType == 'workflow' ||
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
      final workflows = await _repository.getWorkflows();
      state = state.copyWith(
        workflows: workflows,
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

  Future<void> loadRunsForWorkflow(String workflowId) async {
    try {
      final runs = await _repository.getWorkflowRuns(workflowId);
      final updatedMap =
          Map<String, List<WorkflowRun>>.from(state.runsByWorkflowId);
      updatedMap[workflowId] = runs;
      state = state.copyWith(runsByWorkflowId: updatedMap);
    } catch (_) {}
  }

  Future<WorkflowRun?> loadRun(String runId) async {
    try {
      final run = await _repository.getWorkflowRun(runId);
      state = state.copyWith(activeRun: run);
      return run;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<WorkflowRun?> runWorkflow(
    String id, {
    Map<String, dynamic>? inputs,
    String? parentSessionId,
    bool? dryRun,
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final run = await _repository.runWorkflow(
        id,
        inputs: inputs,
        parentSessionId: parentSessionId,
        dryRun: dryRun,
      );

      final updatedRuns = <WorkflowRun>[
        run,
        ...(state.runsByWorkflowId[id] ?? []),
      ];
      final updatedMap =
          Map<String, List<WorkflowRun>>.from(state.runsByWorkflowId);
      updatedMap[id] = updatedRuns;

      state = state.copyWith(
        activeRun: run,
        runsByWorkflowId: updatedMap,
        isLoading: false,
        error: null,
      );

      return run;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<bool> abortRun(String runId) async {
    try {
      await _repository.abortRun(runId);
      await loadRun(runId);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final workflowsNotifierProvider =
    StateNotifierProvider<WorkflowsNotifier, WorkflowsState>((ref) {
  final repository = ref.watch(workflowsRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  return WorkflowsNotifier(
    repository: repository,
    wsClient: wsClient,
  );
});
