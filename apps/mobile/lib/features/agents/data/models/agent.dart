import 'package:freezed_annotation/freezed_annotation.dart';

part 'agent.freezed.dart';

@freezed
class Agent with _$Agent {
  const Agent._();

  const factory Agent({
    required String id,
    required String name,
    String? description,
    String? model,
    String? instruction,
    String? avatarUrl,
    @Default('ready') String status,
    @Default(<String>[]) List<String> tools,
    @Default(<String>[]) List<String> skills,
    @Default(false) bool streaming,
    @Default(0) int activeObservers,
    String? createdAt,
    String? updatedAt,
    Map<String, dynamic>? definition,
  }) = _Agent;

  factory Agent.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? '') as String;
    final def = json['definition'] is Map<String, dynamic>
        ? json['definition'] as Map<String, dynamic>
        : null;

    final name = (json['name'] ?? def?['name'] ?? id) as String;
    final description = (json['description'] ?? def?['description']) as String?;
    final model = (json['model'] ?? def?['model']) as String?;
    final instruction = (json['instruction'] ?? def?['instruction']) as String?;
    final avatarUrl = json['avatarUrl'] as String?;
    final status = (json['status'] ?? 'ready') as String;
    final streaming = json['streaming'] is bool ? json['streaming'] as bool : false;
    final activeObservers = json['activeObservers'] is num
        ? (json['activeObservers'] as num).toInt()
        : 0;
    final createdAt = json['createdAt'] as String?;
    final updatedAt = json['updatedAt'] as String?;

    List<String> toolsList = [];
    final rawTools = json['tools'] ?? def?['tools'];
    if (rawTools is List) {
      toolsList = rawTools
          .map((t) => t is Map ? (t['name']?.toString() ?? '') : t.toString())
          .where((t) => t.isNotEmpty)
          .toList();
    }

    List<String> skillsList = [];
    final rawSkills = json['skills'] ?? def?['skills'];
    if (rawSkills is List) {
      skillsList = rawSkills
          .map((s) => s is Map ? (s['name']?.toString() ?? '') : s.toString())
          .where((s) => s.isNotEmpty)
          .toList();
    }

    return Agent(
      id: id,
      name: name,
      description: description,
      model: model,
      instruction: instruction,
      avatarUrl: avatarUrl,
      status: status,
      tools: toolsList,
      skills: skillsList,
      streaming: streaming,
      activeObservers: activeObservers,
      createdAt: createdAt,
      updatedAt: updatedAt,
      definition: def,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      if (model != null) 'model': model,
      if (instruction != null) 'instruction': instruction,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      'status': status,
      'tools': tools,
      'skills': skills,
      'streaming': streaming,
      'activeObservers': activeObservers,
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
      if (definition != null) 'definition': definition,
    };
  }
}
