import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/auth/ui/auth_notifier.dart';
import 'package:spaces_mobile/features/auth/ui/auth_state.dart';

class FakeAuthRepository implements AuthRepository {
  bool isAuth = false;
  String? username;
  String? userId;
  String? token;
  ApiException? errorToThrow;

  @override
  Future<AuthResponse> login(String username, String password) async {
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
    this.username = username;
    token = 'fake-token-123';
    isAuth = true;
    return AuthResponse(
      user: AuthUser(username: username, id: 'u-123'),
      token: token,
    );
  }

  @override
  Future<void> logout() async {
    isAuth = false;
    username = null;
    userId = null;
    token = null;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Future<String?> getUsername() async => username;

  @override
  Future<String?> getUserId() async => userId;

  @override
  Future<bool> isAuthenticated() async => isAuth;
}

void main() {
  late FakeAuthRepository fakeRepository;
  late AuthNotifier notifier;

  setUp(() {
    fakeRepository = FakeAuthRepository();
    notifier = AuthNotifier(repository: fakeRepository);
  });

  group('AuthNotifier Tests', () {
    test('initial state resolves to unauthenticated when no token exists', () async {
      await Future<void>.delayed(Duration.zero);
      expect(notifier.state.status, equals(AuthStatus.unauthenticated));
    });

    test('checkAuth transitions to authenticated if token exists', () async {
      fakeRepository.isAuth = true;
      fakeRepository.username = 'spacesadmin';
      fakeRepository.userId = 'u-123';

      final future = notifier.checkAuth();
      expect(notifier.state.status, equals(AuthStatus.loading));

      await future;

      expect(notifier.state.status, equals(AuthStatus.authenticated));
      expect(notifier.state.username, equals('spacesadmin'));
      expect(notifier.state.userId, equals('u-123'));
    });

    test('checkAuth transitions to unauthenticated if no token', () async {
      fakeRepository.isAuth = false;

      final future = notifier.checkAuth();
      expect(notifier.state.status, equals(AuthStatus.loading));

      await future;

      expect(notifier.state.status, equals(AuthStatus.unauthenticated));
    });

    test('login transitions to loading then authenticated on success', () async {
      final future = notifier.login('spacesadmin', 'secret123');
      expect(notifier.state.status, equals(AuthStatus.loading));

      final result = await future;

      expect(result, isTrue);
      expect(notifier.state.status, equals(AuthStatus.authenticated));
      expect(notifier.state.username, equals('spacesadmin'));
    });

    test('login transitions to error when repository throws ApiException', () async {
      fakeRepository.errorToThrow = const UnauthorizedException(
        message: 'Invalid credentials provided',
      );

      final future = notifier.login('invalid_user', 'wrong_pass');
      expect(notifier.state.status, equals(AuthStatus.loading));

      final result = await future;

      expect(result, isFalse);
      expect(notifier.state.status, equals(AuthStatus.error));
      expect(notifier.state.errorMessage, equals('Invalid credentials provided'));
    });

    test('login with empty credentials fails with error immediately', () async {
      final result = await notifier.login('', '');

      expect(result, isFalse);
      expect(notifier.state.status, equals(AuthStatus.error));
      expect(notifier.state.errorMessage, contains('Please enter both'));
    });

    test('logout transitions to unauthenticated', () async {
      fakeRepository.isAuth = true;
      fakeRepository.username = 'admin';
      await notifier.checkAuth();
      expect(notifier.state.isAuthenticated, isTrue);

      final future = notifier.logout();
      expect(notifier.state.status, equals(AuthStatus.loading));

      await future;

      expect(notifier.state.status, equals(AuthStatus.unauthenticated));
    });
  });
}
