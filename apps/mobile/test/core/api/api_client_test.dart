import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';

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
          jsonEncode({'status': 'ok'}),
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

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
  });

  group('ApiClient Tests', () {
    test('GET request successfully parses response', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'status': 'ok', 'version': '1.0.0'}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await apiClient.get<Map<String, dynamic>>('/api/health');

      expect(result['status'], equals('ok'));
      expect(result['version'], equals('1.0.0'));
    });

    test('Injects Authorization token when stored in storage', () async {
      await storage.secureWrite(StorageKey.authToken, 'secret-jwt-token');

      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'user': 'test'}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await apiClient.get<Map<String, dynamic>>('/api/user');

      expect(
        mockAdapter.lastRequestOptions?.headers['Authorization'],
        equals('Bearer secret-jwt-token'),
      );
    });

    test('Maps 401 response to UnauthorizedException', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'error': 'Invalid token', 'code': 'UNAUTHORIZED'}),
        401,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      expect(
        () => apiClient.get<Map<String, dynamic>>('/api/protected'),
        throwsA(isA<UnauthorizedException>()),
      );
    });

    test('Maps 404 response to NotFoundException', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'error': 'Session not found', 'code': 'NOT_FOUND'}),
        404,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      expect(
        () => apiClient.get<Map<String, dynamic>>('/api/sessions/unknown-id'),
        throwsA(isA<NotFoundException>()),
      );
    });
  });
}
