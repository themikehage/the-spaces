import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/events/entity_event_bus.dart';
import '../data/models/workspace_file.dart';
import '../data/workspace_repository.dart';

class WorkspaceArgs {
  final String entityType;
  final String entityId;

  const WorkspaceArgs({
    required this.entityType,
    required this.entityId,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WorkspaceArgs &&
        other.entityType == entityType &&
        other.entityId == entityId;
  }

  @override
  int get hashCode => entityType.hashCode ^ entityId.hashCode;
}

class WorkspaceState {
  final bool isLoading;
  final bool isMutating;
  final List<WorkspaceFile> files;
  final Set<String> expandedPaths;
  final Set<String> loadingPaths;
  final Map<String, List<WorkspaceFile>> folderChildren;
  final String? error;
  final String query;

  const WorkspaceState({
    this.isLoading = false,
    this.isMutating = false,
    this.files = const [],
    this.expandedPaths = const {},
    this.loadingPaths = const {},
    this.folderChildren = const {},
    this.error,
    this.query = '',
  });

  List<WorkspaceFile> get filteredFiles {
    final cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.isEmpty) return files;

    final List<WorkspaceFile> allKnownFiles = [...files];
    for (final childList in folderChildren.values) {
      for (final child in childList) {
        if (!allKnownFiles.any((f) => f.path == child.path)) {
          allKnownFiles.add(child);
        }
      }
    }

    return allKnownFiles.where((file) {
      return file.name.toLowerCase().contains(cleanQuery) ||
          file.path.toLowerCase().contains(cleanQuery);
    }).toList();
  }

  bool isExpanded(String path) => expandedPaths.contains(path);
  bool isPathLoading(String path) => loadingPaths.contains(path);

  List<WorkspaceFile> getChildren(String path) => folderChildren[path] ?? const [];

  WorkspaceState copyWith({
    bool? isLoading,
    bool? isMutating,
    List<WorkspaceFile>? files,
    Set<String>? expandedPaths,
    Set<String>? loadingPaths,
    Map<String, List<WorkspaceFile>>? folderChildren,
    String? error,
    bool clearError = false,
    String? query,
  }) {
    return WorkspaceState(
      isLoading: isLoading ?? this.isLoading,
      isMutating: isMutating ?? this.isMutating,
      files: files ?? this.files,
      expandedPaths: expandedPaths ?? this.expandedPaths,
      loadingPaths: loadingPaths ?? this.loadingPaths,
      folderChildren: folderChildren ?? this.folderChildren,
      error: clearError ? null : (error ?? this.error),
      query: query ?? this.query,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WorkspaceState &&
        other.isLoading == isLoading &&
        other.isMutating == isMutating &&
        other.error == error &&
        other.query == query &&
        other.files.length == files.length &&
        other.expandedPaths.length == expandedPaths.length &&
        other.loadingPaths.length == loadingPaths.length &&
        other.folderChildren.length == folderChildren.length;
  }

  @override
  int get hashCode =>
      isLoading.hashCode ^
      isMutating.hashCode ^
      error.hashCode ^
      query.hashCode ^
      files.hashCode ^
      expandedPaths.hashCode ^
      loadingPaths.hashCode ^
      folderChildren.hashCode;
}

class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  final WorkspaceRepository _repository;
  final WorkspaceArgs _args;
  StreamSubscription<EntityUpdatedEvent>? _eventSub;

  WorkspaceNotifier({
    required WorkspaceRepository repository,
    required WorkspaceArgs args,
  })  : _repository = repository,
        _args = args,
        super(const WorkspaceState(isLoading: true)) {
    loadFiles();
    _subscribeToEvents();
  }

  void _subscribeToEvents() {
    _eventSub = EntityEventBus.listen((event) {
      final isWorkspaceMatch = event.type == 'workspace' ||
          event.type == 'entity-updated' ||
          event.action == 'agent_end' ||
          event.rawName == 'workspace';
      if (isWorkspaceMatch) {
        refreshOnAgentEnd();
      }
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    super.dispose();
  }

  Future<void> loadFiles() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final files = await _repository.getFiles(
        entityType: _args.entityType,
        entityId: _args.entityId,
      );

      state = state.copyWith(
        isLoading: false,
        files: files,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
    }
  }

  void setQuery(String query) {
    state = state.copyWith(query: query);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  Future<void> toggleFolder(String path) async {
    final isCurrentlyExpanded = state.isExpanded(path);
    final updatedExpanded = Set<String>.from(state.expandedPaths);

    if (isCurrentlyExpanded) {
      updatedExpanded.remove(path);
      state = state.copyWith(expandedPaths: updatedExpanded);
    } else {
      updatedExpanded.add(path);
      state = state.copyWith(expandedPaths: updatedExpanded);
      if (!state.folderChildren.containsKey(path)) {
        await loadChildren(path);
      }
    }
  }

  Future<void> loadChildren(String path) async {
    final updatedLoading = Set<String>.from(state.loadingPaths)..add(path);
    state = state.copyWith(loadingPaths: updatedLoading, clearError: true);

    try {
      final children = await _repository.listChildren(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
      );

      final updatedChildrenMap = Map<String, List<WorkspaceFile>>.from(state.folderChildren);
      updatedChildrenMap[path] = children;

      final updatedDoneLoading = Set<String>.from(state.loadingPaths)..remove(path);
      state = state.copyWith(
        folderChildren: updatedChildrenMap,
        loadingPaths: updatedDoneLoading,
      );
    } catch (e) {
      final updatedDoneLoading = Set<String>.from(state.loadingPaths)..remove(path);
      state = state.copyWith(
        loadingPaths: updatedDoneLoading,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
    }
  }

  String _getParentPath(String path) {
    final clean = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final lastSlash = clean.lastIndexOf('/');
    if (lastSlash == -1) return '';
    return clean.substring(0, lastSlash);
  }

  Future<void> _refreshParentOrRoot(String path) async {
    final parent = _getParentPath(path);
    if (parent.isNotEmpty && state.folderChildren.containsKey(parent)) {
      await loadChildren(parent);
    } else {
      await loadFiles();
    }
  }

  Future<bool> createFile(String path, {String content = ''}) async {
    state = state.copyWith(isMutating: true, clearError: true);
    try {
      await _repository.createFile(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
        content: content,
      );
      await _refreshParentOrRoot(path);
      state = state.copyWith(isMutating: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isMutating: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return false;
    }
  }

  Future<bool> createFolder(String path) async {
    state = state.copyWith(isMutating: true, clearError: true);
    try {
      await _repository.createFolder(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
      );
      await _refreshParentOrRoot(path);
      state = state.copyWith(isMutating: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isMutating: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return false;
    }
  }

  Future<bool> renameFile(String oldPath, String newPath) async {
    state = state.copyWith(isMutating: true, clearError: true);
    try {
      await _repository.renameFile(
        entityType: _args.entityType,
        entityId: _args.entityId,
        oldPath: oldPath,
        newPath: newPath,
      );
      await _refreshParentOrRoot(oldPath);
      final newParent = _getParentPath(newPath);
      if (newParent != _getParentPath(oldPath)) {
        await _refreshParentOrRoot(newPath);
      }
      state = state.copyWith(isMutating: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isMutating: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return false;
    }
  }

  Future<bool> deleteFile(String path) async {
    state = state.copyWith(isMutating: true, clearError: true);
    try {
      await _repository.deleteFile(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
      );
      await _refreshParentOrRoot(path);
      state = state.copyWith(isMutating: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isMutating: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return false;
    }
  }

  Future<bool> saveFile(String path, String content) async {
    state = state.copyWith(isMutating: true, clearError: true);
    try {
      await _repository.saveFile(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
        content: content,
      );
      await _refreshParentOrRoot(path);
      state = state.copyWith(isMutating: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isMutating: false,
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return false;
    }
  }

  Future<List<int>> downloadFile(String path) async {
    try {
      return await _repository.downloadFileBytes(
        entityType: _args.entityType,
        entityId: _args.entityId,
        path: path,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
      );
      return [];
    }
  }

  Future<void> refresh() async {
    await loadFiles();
    for (final path in state.expandedPaths) {
      await loadChildren(path);
    }
  }

  Future<void> refreshOnAgentEnd() async {
    await refresh();
  }
}

final workspaceNotifierProvider = StateNotifierProvider.autoDispose
    .family<WorkspaceNotifier, WorkspaceState, WorkspaceArgs>((ref, args) {
  final repository = ref.watch(workspaceRepositoryProvider);
  return WorkspaceNotifier(repository: repository, args: args);
});
