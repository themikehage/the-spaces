import 'package:freezed_annotation/freezed_annotation.dart';

part 'workflow.freezed.dart';

@freezed
class WorkflowStep with _$WorkflowStep {
  const WorkflowStep._();

  const factory WorkflowStep({
    required String id,
    required String type,
    required String label,
    @Default(<String>[]) List<String> dependsOn,
    String? agentId,
    String? taskTemplate,
    String? condition,
    String? approvalMessage,
    Map<String, dynamic>? inputs,
  }) = _WorkflowStep;

  factory WorkflowStep.fromJson(Map<String, dynamic> json) {
    List<String> dependsOnList = [];
    if (json['dependsOn'] is List) {
      dependsOnList =
          (json['dependsOn'] as List).map((e) => e.toString()).toList();
    }

    return WorkflowStep(
      id: (json['id'] ?? '') as String,
      type: (json['type'] ?? 'agent') as String,
      label: (json['label'] ?? json['id'] ?? '') as String,
      dependsOn: dependsOnList,
      agentId: json['agentId'] as String?,
      taskTemplate: json['taskTemplate'] as String?,
      condition: json['condition'] as String?,
      approvalMessage: json['approvalMessage'] as String?,
      inputs: json['inputs'] is Map<String, dynamic>
          ? json['inputs'] as Map<String, dynamic>
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'label': label,
      'dependsOn': dependsOn,
      if (agentId != null) 'agentId': agentId,
      if (taskTemplate != null) 'taskTemplate': taskTemplate,
      if (condition != null) 'condition': condition,
      if (approvalMessage != null) 'approvalMessage': approvalMessage,
      if (inputs != null) 'inputs': inputs,
    };
  }
}

@freezed
class Workflow with _$Workflow {
  const Workflow._();

  const factory Workflow({
    required String id,
    required String name,
    String? description,
    String? systemPrompt,
    @Default(<WorkflowStep>[]) List<WorkflowStep> steps,
    @Default('stop') String onError,
    String? lastRunStatus,
    String? createdAt,
    String? updatedAt,
    String? tag,
  }) = _Workflow;

  factory Workflow.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? '') as String;
    final name = (json['name'] ?? id) as String;
    final description = json['description'] as String?;
    final systemPrompt = json['systemPrompt'] as String?;
    final onError = (json['onError'] ?? 'stop') as String;
    final lastRunStatus = json['lastRunStatus'] as String?;
    final createdAt = json['createdAt'] as String?;
    final updatedAt = (json['updatedAt'] ?? createdAt) as String?;
    final tag = json['tag'] as String?;

    List<WorkflowStep> stepsList = [];
    if (json['steps'] is List) {
      stepsList = (json['steps'] as List)
          .whereType<Map<String, dynamic>>()
          .map(WorkflowStep.fromJson)
          .toList();
    }

    return Workflow(
      id: id,
      name: name,
      description: description,
      systemPrompt: systemPrompt,
      steps: stepsList,
      onError: onError,
      lastRunStatus: lastRunStatus,
      createdAt: createdAt,
      updatedAt: updatedAt,
      tag: tag,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      if (systemPrompt != null) 'systemPrompt': systemPrompt,
      'steps': steps.map((s) => s.toJson()).toList(),
      'onError': onError,
      if (lastRunStatus != null) 'lastRunStatus': lastRunStatus,
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
      if (tag != null) 'tag': tag,
    };
  }
}
