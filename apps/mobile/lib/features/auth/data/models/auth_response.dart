class AuthUser {
  final String username;
  final String? email;
  final String? id;

  const AuthUser({
    required this.username,
    this.email,
    this.id,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      username: (json['username'] ?? json['name'] ?? '') as String,
      email: json['email'] as String?,
      id: (json['id'] ?? json['userId']) as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      if (email != null) 'email': email,
      if (id != null) 'id': id,
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuthUser &&
        other.username == username &&
        other.email == email &&
        other.id == id;
  }

  @override
  int get hashCode => Object.hash(username, email, id);
}

class AuthResponse {
  final AuthUser user;
  final String? token;

  const AuthResponse({
    required this.user,
    this.token,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final userData = json['user'];
    final user = userData is Map<String, dynamic>
        ? AuthUser.fromJson(userData)
        : AuthUser(username: (json['userId'] ?? json['username'] ?? '') as String);

    return AuthResponse(
      user: user,
      token: (json['token'] ?? json['sessionToken']) as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user': user.toJson(),
      if (token != null) 'token': token,
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuthResponse &&
        other.user == user &&
        other.token == token;
  }

  @override
  int get hashCode => Object.hash(user, token);
}
