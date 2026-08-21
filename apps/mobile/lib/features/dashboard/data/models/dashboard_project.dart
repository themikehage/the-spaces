import 'package:freezed_annotation/freezed_annotation.dart';

part 'dashboard_project.freezed.dart';

@freezed
class DashboardProject with _$DashboardProject {
  const DashboardProject._();

  const factory DashboardProject({
    required String id,
    required String name,
    String? description,
    @Default(0) int sessionCount,
    @Default('') String updatedAt,
  }) = _DashboardProject;

  factory DashboardProject.fromJson(Map<String, dynamic> json) {
    final updatedAt = (json['updatedAt'] ?? json['lastModified'] ?? json['createdAt'] ?? '') as String;
    final sessionCount = json['sessionCount'] is int
        ? json['sessionCount'] as int
        : (json['sessionsCount'] is int ? json['sessionsCount'] as int : 0);

    return DashboardProject(
      id: (json['id'] ?? json['name'] ?? '') as String,
      name: (json['name'] ?? json['id'] ?? '') as String,
      description: (json['description'] ?? json['tag'] ?? json['path']) as String?,
      sessionCount: sessionCount,
      updatedAt: updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'sessionCount': sessionCount,
      'updatedAt': updatedAt,
    };
  }
}
