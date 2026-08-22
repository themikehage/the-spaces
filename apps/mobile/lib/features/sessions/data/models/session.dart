import 'package:freezed_annotation/freezed_annotation.dart';

part 'session.freezed.dart';

@freezed
class Session with _$Session {
  const Session._();

  const factory Session({
    required String id,
    @Default('') String title,
    @Default('idle') String status,
    String? agentId,
    String? projectId,
    String? teamId,
    @Default('') String createdAt,
    @Default('') String updatedAt,
    @Default(0) int messageCount,
    @Default(false) bool isExecution,
  }) = _Session;

  factory Session.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] ?? json['name'] ?? '') as String;
    final status = (json['status'] ?? json['state'] ?? 'idle') as String;
    final createdAt = (json['createdAt'] ?? '') as String;
    final updatedAt = (json['updatedAt'] ?? json['lastModified'] ?? createdAt) as String;
    final messageCount = json['messageCount'] is num ? (json['messageCount'] as num).toInt() : 0;
    final isExecution = json['isExecution'] is bool ? json['isExecution'] as bool : false;

    return Session(
      id: (json['id'] ?? json['sessionId'] ?? '') as String,
      title: title,
      status: status,
      agentId: json['agentId'] as String?,
      projectId: json['projectId'] as String?,
      teamId: json['teamId'] as String?,
      createdAt: createdAt,
      updatedAt: updatedAt,
      messageCount: messageCount,
      isExecution: isExecution,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'name': title,
      'status': status,
      if (agentId != null) 'agentId': agentId,
      if (projectId != null) 'projectId': projectId,
      if (teamId != null) 'teamId': teamId,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'messageCount': messageCount,
      'isExecution': isExecution,
    };
  }

  bool get isRunning =>
      status == 'running' ||
      status == 'active' ||
      status == 'streaming' ||
      status == 'task-running';
  bool get isWaitingApproval =>
      status == 'waiting_approval' || status == 'waiting-approval';
  bool get isError => status == 'error' || status == 'aborted';
  bool get isIdle => !isRunning && !isWaitingApproval && !isError;
}
