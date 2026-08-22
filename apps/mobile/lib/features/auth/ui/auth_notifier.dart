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
      if (!mounted) return;
      if (isAuth) {
        final username = await _repository.getUsername() ?? 'User';
        final userId = await _repository.getUserId();
        final token = await _repository.getToken();
        if (!mounted) return;
        state = AuthState.authenticated(
          username: username,
          userId: userId,
          token: token,
        );
      } else {
        state = const AuthState.unauthenticated();
      }
    } catch (_) {
      if (mounted) {
        state = const AuthState.unauthenticated();
      }
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
      if (!mounted) return true;
      state = AuthState.authenticated(
        username: response.user.username,
        userId: response.user.id,
        token: response.token,
      );
      return true;
    } on ApiException catch (e) {
      if (mounted) {
        state = AuthState.error(e.message);
      }
      return false;
    } catch (_) {
      if (mounted) {
        state = const AuthState.error('An unexpected error occurred during login.');
      }
      return false;
    }
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    await _repository.logout();
    if (mounted) {
      state = const AuthState.unauthenticated();
    }
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

final authTokenProvider = Provider<String?>((ref) {
  try {
    final authState = ref.watch(authNotifierProvider);
    return authState.token;
  } catch (_) {
    return null;
  }
});
