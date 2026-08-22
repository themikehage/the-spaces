import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/config/app_config.dart';
import '../../../core/storage/app_storage.dart';
import 'models/workspace_file.dart';

class WorkspaceRepository {
  final ApiClient _apiClient;
  final AppStorage _storage;

  WorkspaceRepository({
    required ApiClient apiClient,
    required AppStorage storage,
  })  : _apiClient = apiClient,
        _storage = storage;

  Map<String, dynamic> _buildScopeParams(String entityType, String entityId) {
    final lower = entityType.toLowerCase();
    if (lower == 'agent' || lower == 'agents') {
      return {'agentId': entityId};
    } else if (lower == 'project' || lower == 'projects') {
      return {'project': entityId};
    } else if (lower == 'team' || lower == 'teams') {
      return {'teamId': entityId};
    }
    return {'agentId': entityId};
  }

  Future<List<WorkspaceFile>> getFiles({
    required String entityType,
    required String entityId,
  }) async {
    final queryParams = _buildScopeParams(entityType, entityId);

    try {
      final response = await _apiClient.get<dynamic>(
        '/api/workspace',
        queryParameters: queryParams,
      );

      return _parseFilesFromResponse(response);
    } catch (_) {
      // Fallback: Try REST endpoint /api/{entityType}s/{entityId}/files
      try {
        final normalizedType = entityType.endsWith('s') ? entityType : '${entityType}s';
        final fallbackResponse = await _apiClient.get<dynamic>(
          '/api/$normalizedType/$entityId/files',
        );
        return _parseFilesFromResponse(fallbackResponse);
      } catch (fallbackError) {
        rethrow;
      }
    }
  }

  List<WorkspaceFile> _parseFilesFromResponse(dynamic response) {
    final List<WorkspaceFile> results = [];

    if (response is Map<String, dynamic>) {
      if (response['children'] is List) {
        final children = response['children'] as List;
        for (final item in children) {
          if (item is Map<String, dynamic>) {
            results.add(WorkspaceFile.fromJson(item));
          }
        }
      } else if (response['files'] is List) {
        final files = response['files'] as List;
        for (final item in files) {
          if (item is Map<String, dynamic>) {
            results.add(WorkspaceFile.fromJson(item));
          } else if (item is String) {
            results.add(WorkspaceFile(path: item, name: item.split('/').last));
          }
        }
      }
    } else if (response is List) {
      for (final item in response) {
        if (item is Map<String, dynamic>) {
          results.add(WorkspaceFile.fromJson(item));
        } else if (item is String) {
          results.add(WorkspaceFile(path: item, name: item.split('/').last));
        }
      }
    }

    return results;
  }

  Future<String> getFileContent({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);

    try {
      final response = await _apiClient.get<dynamic>(
        '/api/workspace/$cleanPath',
        queryParameters: queryParams,
      );

      if (response is Map<String, dynamic>) {
        final rawContent = response['content'];
        if (rawContent is String) {
          try {
            final decoded = base64Decode(rawContent);
            return utf8.decode(decoded, allowMalformed: true);
          } catch (_) {
            return rawContent;
          }
        }
      } else if (response is String) {
        return response;
      }

      return '';
    } catch (_) {
      // Fallback: Try /api/{entityType}s/{entityId}/files/content?path=...
      final normalizedType = entityType.endsWith('s') ? entityType : '${entityType}s';
      final fallbackResponse = await _apiClient.get<dynamic>(
        '/api/$normalizedType/$entityId/files/content',
        queryParameters: {'path': cleanPath},
      );

      if (fallbackResponse is Map<String, dynamic>) {
        final content = fallbackResponse['content'];
        if (content is String) {
          try {
            return utf8.decode(base64Decode(content), allowMalformed: true);
          } catch (_) {
            return content;
          }
        }
      } else if (fallbackResponse is String) {
        return fallbackResponse;
      }

      return '';
    }
  }

  String getImageUrl({
    required String entityType,
    required String entityId,
    required String path,
  }) {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final scopeParams = _buildScopeParams(entityType, entityId);
    final key = scopeParams.keys.first;
    final value = Uri.encodeComponent(scopeParams[key] ?? '');
    return '${AppConfig.apiBaseUrl}/api/workspace/$cleanPath?$key=$value&raw=true';
  }

  Future<WorkspaceFile> createFile({
    required String entityType,
    required String entityId,
    required String path,
    String content = '',
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    final response = await _apiClient.put<dynamic>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
      data: {'type': 'file', 'content': content},
    );
    if (response is Map<String, dynamic>) {
      return WorkspaceFile.fromJson(response);
    }
    return WorkspaceFile(path: cleanPath, name: cleanPath.split('/').last);
  }

  Future<WorkspaceFile> createFolder({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    final response = await _apiClient.put<dynamic>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
      data: {'type': 'folder'},
    );
    if (response is Map<String, dynamic>) {
      return WorkspaceFile.fromJson(response);
    }
    return WorkspaceFile(path: cleanPath, name: cleanPath.split('/').last, isDirectory: true);
  }

  Future<WorkspaceFile> renameFile({
    required String entityType,
    required String entityId,
    required String oldPath,
    required String newPath,
  }) async {
    final cleanOldPath = oldPath.replaceAll(RegExp(r'^[/\\]+'), '');
    final cleanNewPath = newPath.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    final response = await _apiClient.patch<dynamic>(
      '/api/workspace/$cleanOldPath',
      queryParameters: queryParams,
      data: {'newPath': cleanNewPath},
    );
    if (response is Map<String, dynamic>) {
      return WorkspaceFile.fromJson(response);
    }
    return WorkspaceFile(path: cleanNewPath, name: cleanNewPath.split('/').last);
  }

  Future<void> deleteFile({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    await _apiClient.delete<dynamic>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
    );
  }

  Future<WorkspaceFile> saveFile({
    required String entityType,
    required String entityId,
    required String path,
    required String content,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    final response = await _apiClient.put<dynamic>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
      data: {'type': 'file', 'content': content},
    );
    if (response is Map<String, dynamic>) {
      return WorkspaceFile.fromJson(response);
    }
    return WorkspaceFile(path: cleanPath, name: cleanPath.split('/').last);
  }

  Future<List<WorkspaceFile>> listChildren({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    final response = await _apiClient.get<dynamic>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
    );
    return _parseFilesFromResponse(response);
  }

  Future<List<int>> downloadFileBytes({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    final cleanPath = path.replaceAll(RegExp(r'^[/\\]+'), '');
    final queryParams = _buildScopeParams(entityType, entityId);
    queryParams['download'] = 'true';
    final response = await _apiClient.dio.get<List<int>>(
      '/api/workspace/$cleanPath',
      queryParameters: queryParams,
      options: Options(responseType: ResponseType.bytes),
    );
    return response.data ?? [];
  }

  Future<String?> getAuthToken() async {
    return _storage.secureRead(StorageKey.authToken);
  }
}

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(appStorageProvider);
  return WorkspaceRepository(apiClient: apiClient, storage: storage);
});
