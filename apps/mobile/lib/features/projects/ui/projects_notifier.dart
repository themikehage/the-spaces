import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';
import '../data/models/project.dart';
import '../data/projects_repository.dart';
import 'projects_state.dart';

class ProjectsNotifier extends StateNotifier<ProjectsState> {
  final ProjectsRepository _repository;
  final WsClient? _wsClient;
  StreamSubscription? _wsSubscription;

  ProjectsNotifier({
    required ProjectsRepository repository,
    WsClient? wsClient,
  })  : _repository = repository,
        _wsClient = wsClient,
        super(const ProjectsState()) {
    _listenToWsEvents();
    load();
  }

  void _listenToWsEvents() {
    final client = _wsClient;
    if (client == null) return;
    _wsSubscription?.cancel();
    _wsSubscription = client.events.listen((event) {
      final type = event['type']?.toString();
      if (type == null) return;

      if (type == 'entity-updated') {
        final entityType = event['entityType']?.toString();
        if (entityType == 'project' || entityType == 'all' || entityType == null) {
          load();
        }
      }
    });
  }

  Future<void> load() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final projects = await _repository.getProjects();
      state = state.copyWith(
        projects: projects,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<Project?> createProject({
    required String name,
    String? description,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final created = await _repository.createProject(
        name: name,
        description: description,
        cloneUrl: cloneUrl,
        avatarUrl: avatarUrl,
        tag: tag,
      );

      final updatedProjects = [
        created,
        ...state.projects.where((p) => p.id != created.id),
      ];

      state = state.copyWith(
        projects: updatedProjects,
        isLoading: false,
        error: null,
      );

      return created;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<Project?> updateProject(String id, Map<String, dynamic> patch) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final updated = await _repository.updateProject(id, patch);

      final updatedProjects = state.projects.map((p) {
        if (p.id == id) {
          return updated;
        }
        return p;
      }).toList();

      state = state.copyWith(
        projects: updatedProjects,
        isLoading: false,
        error: null,
      );

      return updated;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  Future<bool> deleteProject(String id) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      await _repository.deleteProject(id);

      final updatedProjects = state.projects.where((p) => p.id != id).toList();
      state = state.copyWith(
        projects: updatedProjects,
        isLoading: false,
        error: null,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final projectsNotifierProvider =
    StateNotifierProvider<ProjectsNotifier, ProjectsState>((ref) {
  final repository = ref.watch(projectsRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  return ProjectsNotifier(
    repository: repository,
    wsClient: wsClient,
  );
});
