import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/storage/app_storage.dart';
import 'models/auth_response.dart';

class AuthRepository {
  final ApiClient _apiClient;
  final AppStorage _storage;

  AuthRepository({
    required ApiClient apiClient,
    required AppStorage storage,
  })  : _apiClient = apiClient,
        _storage = storage;

  Future<AuthResponse> login(String username, String password) async {
    final responseData = await _apiClient.post<Map<String, dynamic>>(
      '/api/auth/login',
      data: {
        'username': username,
        'password': password,
      },
      headers: const {
        'X-Spaces-Return-Token': '1',
      },
    );

    final authResponse = AuthResponse.fromJson(responseData);

    if (authResponse.token != null && authResponse.token!.isNotEmpty) {
      await _storage.secureWrite(StorageKey.authToken, authResponse.token!);
    }
    await _storage.prefWrite(StorageKey.userName, authResponse.user.username);
    if (authResponse.user.email != null) {
      await _storage.prefWrite(StorageKey.userEmail, authResponse.user.email!);
    }
    if (authResponse.user.id != null) {
      await _storage.prefWrite(StorageKey.userId, authResponse.user.id!);
    }

    return authResponse;
  }

  Future<void> logout() async {
    try {
      await _apiClient.post<dynamic>('/api/auth/logout');
    } catch (_) {
      // Best-effort server notification
    } finally {
      await _storage.secureDelete(StorageKey.authToken);
      await _storage.prefRemove(StorageKey.userName);
      await _storage.prefRemove(StorageKey.userEmail);
      await _storage.prefRemove(StorageKey.userId);
    }
  }

  Future<String?> getToken() async {
    return _storage.secureRead(StorageKey.authToken);
  }

  Future<String?> getUsername() async {
    return _storage.prefRead(StorageKey.userName);
  }

  Future<String?> getUserId() async {
    return _storage.prefRead(StorageKey.userId);
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(appStorageProvider);
  return AuthRepository(apiClient: apiClient, storage: storage);
});
