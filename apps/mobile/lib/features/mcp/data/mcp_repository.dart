import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/mcp_server.dart';

class McpRepository {
  final ApiClient _apiClient;

  McpRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<McpServer>> getServers() async {
    try {
      final response = await _apiClient.get<dynamic>('/api/mcp/servers');
      if (response is Map<String, dynamic> && response['servers'] is List) {
        return (response['servers'] as List)
            .map((item) => McpServer.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
    } catch (_) {
      // Fallback to GET /api/mcp
    }

    final response = await _apiClient.get<dynamic>('/api/mcp');
    if (response is Map<String, dynamic>) {
      if (response['mcpServers'] is Map) {
        final serversMap = response['mcpServers'] as Map<String, dynamic>;
        return serversMap.entries.map((e) {
          final val = Map<String, dynamic>.from(e.value as Map);
          if (!val.containsKey('id')) val['id'] = e.key;
          if (!val.containsKey('name')) val['name'] = e.key;
          return McpServer.fromJson(val);
        }).toList();
      } else if (response['servers'] is List) {
        return (response['servers'] as List)
            .map((item) => McpServer.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
    } else if (response is List) {
      return response
          .map((item) => McpServer.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    }

    return [];
  }

  Future<String> getConfigRaw() async {
    final response = await _apiClient.get<dynamic>('/api/mcp');
    if (response is Map<String, dynamic>) {
      return const JsonEncoder.withIndent('  ').convert(response);
    } else if (response is String) {
      return response;
    }
    return const JsonEncoder.withIndent('  ').convert({'mcpServers': {}});
  }

  Future<void> saveConfig(String rawJson) async {
    final dynamic payload = jsonDecode(rawJson);
    await _apiClient.post<dynamic>(
      '/api/mcp',
      data: payload,
    );
  }

  Future<void> reconnectServer(String id) async {
    await _apiClient.post<dynamic>('/api/mcp/servers/$id/connect');
  }

  Future<void> addServer(McpServer server) async {
    await _apiClient.post<dynamic>(
      '/api/mcp/servers',
      data: server.toJson(),
    );
  }

  Future<void> deleteServer(String id) async {
    await _apiClient.delete<dynamic>('/api/mcp/servers/$id');
  }
}

final mcpRepositoryProvider = Provider<McpRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return McpRepository(apiClient: apiClient);
});
