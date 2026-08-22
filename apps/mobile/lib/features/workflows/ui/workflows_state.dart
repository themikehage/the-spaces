import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/workflow.dart';
import '../data/models/workflow_run.dart';

part 'workflows_state.freezed.dart';

@freezed
class WorkflowsState with _$WorkflowsState {
  const WorkflowsState._();

  const factory WorkflowsState({
    @Default(<Workflow>[]) List<Workflow> workflows,
    @Default(<String, List<WorkflowRun>>{})
    Map<String, List<WorkflowRun>> runsByWorkflowId,
    WorkflowRun? activeRun,
    @Default(false) bool isLoading,
    @Default('') String searchQuery,
    String? error,
  }) = _WorkflowsState;

  List<Workflow> get filteredWorkflows {
    if (searchQuery.trim().isEmpty) {
      return workflows;
    }
    final query = searchQuery.trim().toLowerCase();
    return workflows.where((w) {
      final nameMatches = w.name.toLowerCase().contains(query);
      final idMatches = w.id.toLowerCase().contains(query);
      final descMatches = w.description?.toLowerCase().contains(query) ?? false;
      return nameMatches || idMatches || descMatches;
    }).toList();
  }
}
