import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/storage/app_storage.dart';
import 'models/app_settings.dart';
import 'models/provider_config.dart';

class SettingsRepository {
  final ApiClient _apiClient;
  final AppStorage _storage;

  SettingsRepository({
    required ApiClient apiClient,
    required AppStorage storage,
  })  : _apiClient = apiClient,
        _storage = storage;

  Future<AppSettings> getSettings() async {
    final responseData = await _apiClient.get<Map<String, dynamic>>('/api/settings');
    return AppSettings.fromJson(responseData);
  }

  Future<AppSettings> updateSettings(Map<String, dynamic> patch) async {
    final responseData = await _apiClient.patch<Map<String, dynamic>>(
      '/api/settings',
      data: patch,
    );
    if (responseData['settings'] is Map<String, dynamic>) {
      return AppSettings.fromJson(responseData['settings'] as Map<String, dynamic>);
    }
    return AppSettings.fromJson(responseData);
  }

  Future<List<ProviderConfig>> getProviders() async {
    final responseData = await _apiClient.get<Map<String, dynamic>>('/api/providers');
    final rawProviders = responseData['providers'];
    if (rawProviders is List) {
      return rawProviders
          .whereType<Map<String, dynamic>>()
          .map((json) => ProviderConfig.fromJson(json))
          .toList();
    }
    return [];
  }

  Future<void> saveProviderCredentials(String providerId, String apiKey) async {
    await _apiClient.post<Map<String, dynamic>>(
      '/api/providers/$providerId/key',
      data: {'apiKey': apiKey},
    );
    await _storage.setProviderApiKey(providerId, apiKey);
  }

  Future<void> clearProviderCredentials(String providerId) async {
    await _apiClient.delete<Map<String, dynamic>>(
      '/api/providers/$providerId/key',
    );
    await _storage.deleteProviderApiKey(providerId);
  }

  Future<String?> getSavedProviderApiKey(String providerId) async {
    return _storage.getProviderApiKey(providerId);
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(appStorageProvider);
  return SettingsRepository(apiClient: apiClient, storage: storage);
});
