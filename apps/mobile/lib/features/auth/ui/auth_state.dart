enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}

class AuthState {
  final AuthStatus status;
  final String? username;
  final String? userId;
  final String? errorMessage;

  const AuthState._({
    required this.status,
    this.username,
    this.userId,
    this.errorMessage,
  });

  const AuthState.initial() : this._(status: AuthStatus.initial);

  const AuthState.loading() : this._(status: AuthStatus.loading);

  const AuthState.authenticated({
    required String username,
    String? userId,
  }) : this._(
          status: AuthStatus.authenticated,
          username: username,
          userId: userId,
        );

  const AuthState.unauthenticated()
      : this._(status: AuthStatus.unauthenticated);

  const AuthState.error(String message)
      : this._(
          status: AuthStatus.error,
          errorMessage: message,
        );

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isUnauthenticated => status == AuthStatus.unauthenticated;
  bool get isError => status == AuthStatus.error;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuthState &&
        other.status == status &&
        other.username == username &&
        other.userId == userId &&
        other.errorMessage == errorMessage;
  }

  @override
  int get hashCode => Object.hash(status, username, userId, errorMessage);
}
