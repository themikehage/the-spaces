import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../data/auth_repository.dart';
import 'auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier({
    required AuthRepository repository,
  })  : _repository = repository,
        super(const AuthState.initial()) {
    checkAuth();
  }

  Future<void> checkAuth() async {
    state = const AuthState.loading();
    try {
      final isAuth = await _repository.isAuthenticated();
      if (isAuth) {
        final username = await _repository.getUsername() ?? 'User';
        final userId = await _repository.getUserId();
        state = AuthState.authenticated(username: username, userId: userId);
      } else {
        state = const AuthState.unauthenticated();
      }
    } catch (_) {
      state = const AuthState.unauthenticated();
    }
  }

  Future<bool> login(String username, String password) async {
    final cleanUsername = username.trim();
    if (cleanUsername.isEmpty || password.isEmpty) {
      state = const AuthState.error('Please enter both username and password.');
      return false;
    }

    state = const AuthState.loading();
    try {
      final response = await _repository.login(cleanUsername, password);
      state = AuthState.authenticated(
        username: response.user.username,
        userId: response.user.id,
      );
      return true;
    } on ApiException catch (e) {
      state = AuthState.error(e.message);
      return false;
    } catch (_) {
      state = const AuthState.error('An unexpected error occurred during login.');
      return false;
    }
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }

  void resetError() {
    if (state.isError) {
      state = const AuthState.unauthenticated();
    }
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository: repository);
});
