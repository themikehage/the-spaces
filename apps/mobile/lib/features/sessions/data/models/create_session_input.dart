import 'package:freezed_annotation/freezed_annotation.dart';

part 'create_session_input.freezed.dart';

@freezed
class CreateSessionInput with _$CreateSessionInput {
  const CreateSessionInput._();

  const factory CreateSessionInput({
    required String title,
    String? agentId,
    String? projectId,
    List<String>? tools,
    List<String>? skills,
  }) = _CreateSessionInput;

  factory CreateSessionInput.fromJson(Map<String, dynamic> json) {
    return CreateSessionInput(
      title: (json['title'] ?? json['name'] ?? '') as String,
      agentId: json['agentId'] as String?,
      projectId: json['projectId'] as String?,
      tools: (json['tools'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      skills: (json['skills'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': title,
      'title': title,
      if (agentId != null && agentId!.isNotEmpty) 'agentId': agentId,
      if (projectId != null && projectId!.isNotEmpty) 'projectId': projectId,
      if (tools != null && tools!.isNotEmpty) 'tools': tools,
      if (skills != null && skills!.isNotEmpty) 'skills': skills,
    };
  }
}
