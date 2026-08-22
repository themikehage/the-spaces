import 'package:flutter_riverpod/flutter_riverpod.dart';

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
  final List<WorkspaceFile> files;
  final String? error;
  final String query;

  const WorkspaceState({
    this.isLoading = false,
    this.files = const [],
    this.error,
    this.query = '',
  });

  List<WorkspaceFile> get filteredFiles {
    final cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.isEmpty) return files;
    return files.where((file) {
      return file.name.toLowerCase().contains(cleanQuery) ||
          file.path.toLowerCase().contains(cleanQuery);
    }).toList();
  }

  WorkspaceState copyWith({
    bool? isLoading,
    List<WorkspaceFile>? files,
    String? error,
    bool clearError = false,
    String? query,
  }) {
    return WorkspaceState(
      isLoading: isLoading ?? this.isLoading,
      files: files ?? this.files,
      error: clearError ? null : (error ?? this.error),
      query: query ?? this.query,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WorkspaceState &&
        other.isLoading == isLoading &&
        other.error == error &&
        other.query == query &&
        other.files.length == files.length;
  }

  @override
  int get hashCode =>
      isLoading.hashCode ^ error.hashCode ^ query.hashCode ^ files.hashCode;
}

class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  final WorkspaceRepository _repository;
  final WorkspaceArgs _args;

  WorkspaceNotifier({
    required WorkspaceRepository repository,
    required WorkspaceArgs args,
  })  : _repository = repository,
        _args = args,
        super(const WorkspaceState(isLoading: true)) {
    loadFiles();
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

  Future<void> refresh() async {
    await loadFiles();
  }
}

final workspaceNotifierProvider = StateNotifierProvider.autoDispose
    .family<WorkspaceNotifier, WorkspaceState, WorkspaceArgs>((ref, args) {
  final repository = ref.watch(workspaceRepositoryProvider);
  return WorkspaceNotifier(repository: repository, args: args);
});
