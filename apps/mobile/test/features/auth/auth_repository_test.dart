import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';

import '../../helpers/fake_secure_storage.dart';

class MockHttpAdapter implements HttpClientAdapter {
  ResponseBody? responseBody;
  DioException? exceptionToThrow;
  RequestOptions? lastRequestOptions;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequestOptions = options;
    if (exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return responseBody ??
        ResponseBody.fromString(
          jsonEncode({'ok': true}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late MockHttpAdapter mockAdapter;
  late Dio dio;
  late ApiClient apiClient;
  late AuthRepository authRepository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    authRepository = AuthRepository(apiClient: apiClient, storage: storage);
  });

  group('AuthRepository Tests', () {
    test('login with valid credentials persists token and user info', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'user': {'username': 'spacesadmin', 'email': 'admin@spaces.dev', 'id': 'u1'},
          'token': 'session-token-123',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final response = await authRepository.login('spacesadmin', 'secret123');

      expect(response.user.username, equals('spacesadmin'));
      expect(response.token, equals('session-token-123'));

      final storedToken = await storage.secureRead(StorageKey.authToken);
      expect(storedToken, equals('session-token-123'));

      final storedUsername = storage.prefRead(StorageKey.userName);
      expect(storedUsername, equals('spacesadmin'));

      final isAuth = await authRepository.isAuthenticated();
      expect(isAuth, isTrue);
    });

    test('login with invalid credentials throws UnauthorizedException', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'error': 'Invalid credentials', 'code': 'INVALID_CREDENTIALS'}),
        401,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      expect(
        () => authRepository.login('invalid_user', 'wrong_pass'),
        throwsA(isA<UnauthorizedException>()),
      );

      final storedToken = await storage.secureRead(StorageKey.authToken);
      expect(storedToken, isNull);

      final isAuth = await authRepository.isAuthenticated();
      expect(isAuth, isFalse);
    });

    test('logout deletes token and clears stored user info', () async {
      await storage.secureWrite(StorageKey.authToken, 'token-to-delete');
      await storage.prefWrite(StorageKey.userName, 'spacesadmin');

      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'ok': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await authRepository.logout();

      final storedToken = await storage.secureRead(StorageKey.authToken);
      expect(storedToken, isNull);

      final storedUsername = storage.prefRead(StorageKey.userName);
      expect(storedUsername, isNull);

      final isAuth = await authRepository.isAuthenticated();
      expect(isAuth, isFalse);
    });

    test('isAuthenticated returns false when no token exists', () async {
      final isAuth = await authRepository.isAuthenticated();
      expect(isAuth, isFalse);
    });
  });
}
