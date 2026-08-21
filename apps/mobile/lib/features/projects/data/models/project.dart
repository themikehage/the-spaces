import 'package:freezed_annotation/freezed_annotation.dart';

part 'project.freezed.dart';

@freezed
class Project with _$Project {
  const Project._();

  const factory Project({
    required String id,
    required String name,
    String? description,
    String? path,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
    @Default('planning') String status,
    String? createdAt,
    String? updatedAt,
    String? lastModified,
    @Default(0) int sessionCount,
    @Default(<String>[]) List<String> agentIds,
    String? diskPath,
  }) = _Project;

  factory Project.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? json['name'] ?? '') as String;
    final name = (json['name'] ?? id) as String;
    final description = json['description'] as String?;
    final path = json['path'] as String?;
    final cloneUrl = json['cloneUrl'] as String?;
    final avatarUrl = json['avatarUrl'] as String?;
    final tag = json['tag'] as String?;
    final status = (json['status'] ?? 'planning') as String;
    final createdAt = json['createdAt'] as String?;
    final lastModified = json['lastModified'] as String?;
    final updatedAt = (json['updatedAt'] ?? lastModified ?? createdAt) as String?;
    final sessionCount = json['sessionCount'] is num
        ? (json['sessionCount'] as num).toInt()
        : 0;

    List<String> agentIds = [];
    if (json['agentIds'] is List) {
      agentIds = (json['agentIds'] as List).map((e) => e.toString()).toList();
    } else if (json['agents'] is List) {
      agentIds = (json['agents'] as List)
          .map((e) => e is Map ? (e['id']?.toString() ?? '') : e.toString())
          .where((e) => e.isNotEmpty)
          .toList();
    }

    return Project(
      id: id,
      name: name,
      description: description,
      path: path,
      cloneUrl: cloneUrl,
      avatarUrl: avatarUrl,
      tag: tag,
      status: status,
      createdAt: createdAt,
      updatedAt: updatedAt,
      lastModified: lastModified,
      sessionCount: sessionCount,
      agentIds: agentIds,
      diskPath: json['diskPath'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      if (path != null) 'path': path,
      if (cloneUrl != null) 'cloneUrl': cloneUrl,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (tag != null) 'tag': tag,
      'status': status,
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
      if (lastModified != null) 'lastModified': lastModified,
      'sessionCount': sessionCount,
      'agentIds': agentIds,
      if (diskPath != null) 'diskPath': diskPath,
    };
  }
}
