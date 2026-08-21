import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/project.dart';

part 'projects_state.freezed.dart';

@freezed
class ProjectsState with _$ProjectsState {
  const ProjectsState._();

  const factory ProjectsState({
    @Default(<Project>[]) List<Project> projects,
    @Default(false) bool isLoading,
    @Default('') String searchQuery,
    String? error,
  }) = _ProjectsState;

  List<Project> get filteredProjects {
    if (searchQuery.trim().isEmpty) {
      return projects;
    }
    final query = searchQuery.trim().toLowerCase();
    return projects.where((p) {
      final nameMatches = p.name.toLowerCase().contains(query);
      final descMatches = p.description?.toLowerCase().contains(query) ?? false;
      final tagMatches = p.tag?.toLowerCase().contains(query) ?? false;
      final idMatches = p.id.toLowerCase().contains(query);
      return nameMatches || descMatches || tagMatches || idMatches;
    }).toList();
  }
}
