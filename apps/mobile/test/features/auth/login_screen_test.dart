import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/auth/ui/login_screen.dart';

class FakeAuthRepository implements AuthRepository {
  bool isAuth = false;
  String? username;
  String? userId;
  String? token;
  ApiException? errorToThrow;
  int loginCalls = 0;

  @override
  Future<AuthResponse> login(String username, String password) async {
    loginCalls++;
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
    this.username = username;
    token = 'fake-jwt';
    isAuth = true;
    return AuthResponse(
      user: AuthUser(username: username, id: 'u1'),
      token: token,
    );
  }

  @override
  Future<void> logout() async {
    isAuth = false;
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

Widget createTestWidget({
  required FakeAuthRepository repository,
}) {
  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
    ],
    child: MaterialApp(
      theme: AppTheme.dark(),
      home: const LoginScreen(),
    ),
  );
}

void main() {
  late FakeAuthRepository fakeRepository;

  setUp(() {
    fakeRepository = FakeAuthRepository();
  });

  group('LoginScreen Widget Tests', () {
    testWidgets('renders all login elements correctly', (tester) async {
      await tester.pumpWidget(createTestWidget(repository: fakeRepository));
      await tester.pumpAndSettle();

      expect(find.text('Welcome to Spaces'), findsOneWidget);
      expect(find.byKey(const Key('login_username_field')), findsOneWidget);
      expect(find.byKey(const Key('login_password_field')), findsOneWidget);
      expect(find.byKey(const Key('login_submit_button')), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('shows validation errors when submitted empty', (tester) async {
      await tester.pumpWidget(createTestWidget(repository: fakeRepository));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Please enter your username'), findsOneWidget);
      expect(find.text('Please enter your password'), findsOneWidget);
      expect(fakeRepository.loginCalls, equals(0));
    });

    testWidgets('successful submit calls login with entered credentials', (tester) async {
      await tester.pumpWidget(createTestWidget(repository: fakeRepository));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('login_username_field')),
        'admin',
      );
      await tester.enterText(
        find.byKey(const Key('login_password_field')),
        'password123',
      );

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(fakeRepository.loginCalls, equals(1));
      expect(fakeRepository.username, equals('admin'));
    });

    testWidgets('displays error message when login fails', (tester) async {
      fakeRepository.errorToThrow = const UnauthorizedException(
        message: 'Invalid username or password',
      );

      await tester.pumpWidget(createTestWidget(repository: fakeRepository));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('login_username_field')),
        'admin',
      );
      await tester.enterText(
        find.byKey(const Key('login_password_field')),
        'wrong',
      );

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Invalid username or password'), findsOneWidget);
    });
  });
}
