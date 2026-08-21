import 'package:freezed_annotation/freezed_annotation.dart';

part 'dashboard_session.freezed.dart';

@freezed
class DashboardSession with _$DashboardSession {
  const DashboardSession._();

  const factory DashboardSession({
    required String id,
    @Default('') String title,
    @Default('idle') String status,
    String? agentId,
    String? projectId,
    @Default('') String updatedAt,
    @Default(0) int messageCount,
  }) = _DashboardSession;

  factory DashboardSession.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] ?? json['name'] ?? '') as String;
    final status = (json['status'] ?? json['state'] ?? 'idle') as String;
    final updatedAt = (json['updatedAt'] ?? json['lastModified'] ?? json['createdAt'] ?? '') as String;
    final messageCount = json['messageCount'] is int ? json['messageCount'] as int : 0;

    return DashboardSession(
      id: (json['id'] ?? json['sessionId'] ?? '') as String,
      title: title,
      status: status,
      agentId: json['agentId'] as String?,
      projectId: json['projectId'] as String?,
      updatedAt: updatedAt,
      messageCount: messageCount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'status': status,
      if (agentId != null) 'agentId': agentId,
      if (projectId != null) 'projectId': projectId,
      'updatedAt': updatedAt,
      'messageCount': messageCount,
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
