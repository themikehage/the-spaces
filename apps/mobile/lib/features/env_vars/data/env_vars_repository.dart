import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/env_var.dart';

class EnvVarsRepository {
  final ApiClient _apiClient;

  EnvVarsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<EnvVar>> getEnvVars() async {
    final response = await _apiClient.get<dynamic>('/api/env');

    if (response is Map<String, dynamic>) {
      if (response['env'] is List) {
        return (response['env'] as List)
            .map((item) => EnvVar.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      } else if (response['variables'] is Map) {
        return (response['variables'] as Map<String, dynamic>)
            .entries
            .map((e) => EnvVar(key: e.key, value: e.value?.toString() ?? '••••••••'))
            .toList();
      } else {
        return response.entries
            .where((e) => e.key != 'success')
            .map((e) => EnvVar(key: e.key, value: e.value?.toString() ?? '••••••••'))
            .toList();
      }
    } else if (response is List) {
      return response
          .map((item) => EnvVar.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    }

    return [];
  }

  Future<String> revealEnvVar(String key) async {
    final response = await _apiClient.get<dynamic>('/api/env/reveal/$key');
    if (response is Map<String, dynamic>) {
      return response['value'] as String? ?? '';
    }
    return '';
  }

  Future<void> addEnvVar({required String key, required String value}) async {
    await _apiClient.post<dynamic>(
      '/api/env',
      data: {
        'key': key.trim(),
        'value': value,
      },
    );
  }

  Future<void> deleteEnvVar(String key) async {
    await _apiClient.delete<dynamic>('/api/env/$key');
  }

  Future<void> bulkSaveEnvVars(Map<String, String> variables) async {
    await _apiClient.put<dynamic>(
      '/api/env',
      data: {
        'variables': variables,
      },
    );
  }
}

final envVarsRepositoryProvider = Provider<EnvVarsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return EnvVarsRepository(apiClient: apiClient);
});
