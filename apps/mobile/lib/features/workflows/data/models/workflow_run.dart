import 'package:freezed_annotation/freezed_annotation.dart';

part 'workflow_run.freezed.dart';

@freezed
class WorkflowStepState with _$WorkflowStepState {
  const WorkflowStepState._();

  const factory WorkflowStepState({
    required String stepId,
    @Default('pending') String status,
    String? startedAt,
    String? completedAt,
    Map<String, dynamic>? outputs,
    String? agentSessionId,
    String? error,
    String? activeBranch,
  }) = _WorkflowStepState;

  factory WorkflowStepState.fromJson(Map<String, dynamic> json) {
    return WorkflowStepState(
      stepId: (json['stepId'] ?? json['id'] ?? '') as String,
      status: (json['status'] ?? 'pending') as String,
      startedAt: json['startedAt'] as String?,
      completedAt: json['completedAt'] as String?,
      outputs: json['outputs'] is Map<String, dynamic>
          ? json['outputs'] as Map<String, dynamic>
          : null,
      agentSessionId: json['agentSessionId'] as String?,
      error: json['error'] as String?,
      activeBranch: json['activeBranch'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stepId': stepId,
      'status': status,
      if (startedAt != null) 'startedAt': startedAt,
      if (completedAt != null) 'completedAt': completedAt,
      if (outputs != null) 'outputs': outputs,
      if (agentSessionId != null) 'agentSessionId': agentSessionId,
      if (error != null) 'error': error,
      if (activeBranch != null) 'activeBranch': activeBranch,
    };
  }

  bool get isRunning => status == 'running';
  bool get isSuccess => status == 'success' || status == 'completed';
  bool get isError => status == 'error' || status == 'failed';
  bool get isPending => status == 'pending';
  bool get isWaitingApproval => status == 'waiting_approval';
}

@freezed
class WorkflowRun with _$WorkflowRun {
  const WorkflowRun._();

  const factory WorkflowRun({
    required String id,
    required String workflowId,
    @Default('') String workflowName,
    @Default('pending') String status,
    @Default(<String, WorkflowStepState>{})
    Map<String, WorkflowStepState> stepStates,
    @Default('') String startedAt,
    String? completedAt,
    String? username,
    String? parentSessionId,
    String? workflowSessionId,
    Map<String, dynamic>? inputs,
    String? error,
  }) = _WorkflowRun;

  factory WorkflowRun.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? json['runId'] ?? '') as String;
    final workflowId = (json['workflowId'] ?? '') as String;
    final workflowName = (json['workflowName'] ?? workflowId) as String;
    final status = (json['status'] ?? 'pending') as String;
    final startedAt = (json['startedAt'] ?? '') as String;
    final completedAt = json['completedAt'] as String?;
    final username = json['username'] as String?;
    final parentSessionId = json['parentSessionId'] as String?;
    final workflowSessionId = json['workflowSessionId'] as String?;
    final inputs = json['inputs'] is Map<String, dynamic>
        ? json['inputs'] as Map<String, dynamic>
        : null;
    final error = json['error'] is Map
        ? json['error']['message']?.toString()
        : json['error']?.toString();

    final stepStatesMap = <String, WorkflowStepState>{};
    if (json['stepStates'] is Map) {
      final rawMap = json['stepStates'] as Map<String, dynamic>;
      rawMap.forEach((k, v) {
        if (v is Map<String, dynamic>) {
          stepStatesMap[k] = WorkflowStepState.fromJson({
            ...v,
            'stepId': v['stepId'] ?? k,
          });
        }
      });
    } else if (json['steps'] is List) {
      for (final s in json['steps']) {
        if (s is Map<String, dynamic>) {
          final sId = (s['id'] ?? s['stepId'] ?? '').toString();
          if (sId.isNotEmpty) {
            stepStatesMap[sId] = WorkflowStepState.fromJson(s);
          }
        }
      }
    }

    return WorkflowRun(
      id: id,
      workflowId: workflowId,
      workflowName: workflowName,
      status: status,
      stepStates: stepStatesMap,
      startedAt: startedAt,
      completedAt: completedAt,
      username: username,
      parentSessionId: parentSessionId,
      workflowSessionId: workflowSessionId,
      inputs: inputs,
      error: error,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workflowId': workflowId,
      'workflowName': workflowName,
      'status': status,
      'stepStates': stepStates.map((k, v) => MapEntry(k, v.toJson())),
      'startedAt': startedAt,
      if (completedAt != null) 'completedAt': completedAt,
      if (username != null) 'username': username,
      if (parentSessionId != null) 'parentSessionId': parentSessionId,
      if (workflowSessionId != null) 'workflowSessionId': workflowSessionId,
      if (inputs != null) 'inputs': inputs,
      if (error != null) 'error': error,
    };
  }

  bool get isRunning => status == 'running';
  bool get isCompleted => status == 'success' || status == 'completed';
  bool get isFailed => status == 'error' || status == 'failed';
  bool get isCancelled => status == 'cancelled' || status == 'aborted';
}
