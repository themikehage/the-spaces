import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/mcp_repository.dart';
import '../data/models/mcp_server.dart';

class McpState {
  final bool isLoading;
  final List<McpServer> servers;
  final String rawJson;
  final String? error;
  final bool isSubmitting;
  final String? connectingServerId;

  const McpState({
    this.isLoading = false,
    this.servers = const [],
    this.rawJson = '',
    this.error,
    this.isSubmitting = false,
    this.connectingServerId,
  });

  McpState copyWith({
    bool? isLoading,
    List<McpServer>? servers,
    String? rawJson,
    String? error,
    bool? isSubmitting,
    String? connectingServerId,
    bool clearError = false,
    bool clearConnectingServerId = false,
  }) {
    return McpState(
      isLoading: isLoading ?? this.isLoading,
      servers: servers ?? this.servers,
      rawJson: rawJson ?? this.rawJson,
      error: clearError ? null : (error ?? this.error),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      connectingServerId: clearConnectingServerId
          ? null
          : (connectingServerId ?? this.connectingServerId),
    );
  }
}

class McpNotifier extends StateNotifier<McpState> {
  final McpRepository _repository;

  McpNotifier({required McpRepository repository})
      : _repository = repository,
        super(const McpState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final servers = await _repository.getServers();
      final rawJson = await _repository.getConfigRaw();
      state = state.copyWith(
        isLoading: false,
        servers: servers,
        rawJson: rawJson,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<bool> reconnect(String id) async {
    state = state.copyWith(connectingServerId: id, clearError: true);
    try {
      await _repository.reconnectServer(id);
      await load();
      state = state.copyWith(clearConnectingServerId: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        clearConnectingServerId: true,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> saveRaw(String jsonString) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await _repository.saveConfig(jsonString);
      state = state.copyWith(rawJson: jsonString);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> addServer(McpServer server) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await _repository.addServer(server);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> deleteServer(String id) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await _repository.deleteServer(id);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }
}

final mcpNotifierProvider =
    StateNotifierProvider<McpNotifier, McpState>((ref) {
  final repository = ref.watch(mcpRepositoryProvider);
  return McpNotifier(repository: repository);
});
