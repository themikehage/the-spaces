import 'package:freezed_annotation/freezed_annotation.dart';

part 'team.freezed.dart';

@freezed
class TeamMember with _$TeamMember {
  const TeamMember._();

  const factory TeamMember({
    required String agentId,
    @Default('member') String role,
    String? title,
    String? systemPromptOverride,
    @Default(0) int order,
  }) = _TeamMember;

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      agentId: (json['agentId'] ?? json['id'] ?? '') as String,
      role: (json['role'] ?? 'member') as String,
      title: json['title'] as String?,
      systemPromptOverride: json['systemPromptOverride'] as String?,
      order: json['order'] is num ? (json['order'] as num).toInt() : 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'agentId': agentId,
      'role': role,
      if (title != null) 'title': title,
      if (systemPromptOverride != null)
        'systemPromptOverride': systemPromptOverride,
      'order': order,
    };
  }
}

@freezed
class Team with _$Team {
  const Team._();

  const factory Team({
    required String id,
    required String name,
    String? description,
    @Default('debate') String mode,
    @Default('Orchestration') String teamType,
    @Default(<TeamMember>[]) List<TeamMember> members,
    @Default(5) int maxRounds,
    @Default(0) int sessionCount,
    @Default(<String>[]) List<String> agentIds,
    String? avatarUrl,
    String? tag,
    String? blueprintId,
    String? createdAt,
    String? updatedAt,
  }) = _Team;

  factory Team.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? '') as String;
    final name = (json['name'] ?? id) as String;
    final description = json['description'] as String?;
    final mode = (json['mode'] ?? 'debate') as String;
    final teamType = (json['teamType'] ?? 'Orchestration') as String;
    final maxRounds = json['maxRounds'] is num
        ? (json['maxRounds'] as num).toInt()
        : 5;
    final sessionCount = json['sessionCount'] is num
        ? (json['sessionCount'] as num).toInt()
        : 0;
    final avatarUrl = json['avatarUrl'] as String?;
    final tag = json['tag'] as String?;
    final blueprintId = json['blueprintId'] as String?;
    final createdAt = json['createdAt'] as String?;
    final updatedAt = (json['updatedAt'] ?? createdAt) as String?;

    List<TeamMember> membersList = [];
    if (json['members'] is List) {
      membersList = (json['members'] as List)
          .whereType<Map<String, dynamic>>()
          .map(TeamMember.fromJson)
          .toList();
    }

    List<String> agentIdsList = [];
    if (json['agentIds'] is List) {
      agentIdsList =
          (json['agentIds'] as List).map((e) => e.toString()).toList();
    } else if (membersList.isNotEmpty) {
      agentIdsList = membersList.map((m) => m.agentId).toList();
    }

    return Team(
      id: id,
      name: name,
      description: description,
      mode: mode,
      teamType: teamType,
      members: membersList,
      maxRounds: maxRounds,
      sessionCount: sessionCount,
      agentIds: agentIdsList,
      avatarUrl: avatarUrl,
      tag: tag,
      blueprintId: blueprintId,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'mode': mode,
      'teamType': teamType,
      'members': members.map((m) => m.toJson()).toList(),
      'maxRounds': maxRounds,
      'sessionCount': sessionCount,
      'agentIds': agentIds,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (tag != null) 'tag': tag,
      if (blueprintId != null) 'blueprintId': blueprintId,
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
    };
  }
}
