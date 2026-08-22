import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/settings/data/settings_repository.dart';

import '../../helpers/fake_secure_storage.dart';

class MockHttpAdapter implements HttpClientAdapter {
  ResponseBody? responseBody;
  DioException? exceptionToThrow;
  RequestOptions? lastRequestOptions;
  dynamic lastRequestBody;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequestOptions = options;
    lastRequestBody = options.data;
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
  late SettingsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = SettingsRepository(apiClient: apiClient, storage: storage);
  });

  group('SettingsRepository Tests', () {
    test('getSettings parses AppSettings correctly', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'responseLanguage': 'es',
          'memoryEnabled': true,
          'memoryAutoStore': true,
          'defaultProvider': 'openai',
          'defaultModel': 'gpt-4o',
          'providerDefaults': {'openai': 'gpt-4o', 'anthropic': 'claude-3-5-sonnet'},
          'factoryName': 'Custom Spaces',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final settings = await repository.getSettings();

      expect(settings.responseLanguage, equals('es'));
      expect(settings.memoryEnabled, isTrue);
      expect(settings.memoryAutoStore, isTrue);
      expect(settings.defaultProvider, equals('openai'));
      expect(settings.defaultModel, equals('gpt-4o'));
      expect(settings.factoryName, equals('Custom Spaces'));
      expect(settings.providerDefaults['openai'], equals('gpt-4o'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/settings'));
      expect(mockAdapter.lastRequestOptions?.method, equals('GET'));
    });

    test('updateSettings sends PATCH and returns updated AppSettings', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'ok': true,
          'settings': {
            'responseLanguage': 'fr',
            'memoryEnabled': false,
            'memoryAutoStore': false,
            'defaultProvider': 'anthropic',
            'factoryName': 'Spaces AI',
          },
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final updated = await repository.updateSettings({
        'responseLanguage': 'fr',
        'memoryEnabled': false,
      });

      expect(updated.responseLanguage, equals('fr'));
      expect(updated.memoryEnabled, isFalse);
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/settings'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestBody, equals({
        'responseLanguage': 'fr',
        'memoryEnabled': false,
      }));
    });

    test('getProviders parses provider list with configured flags', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'providers': [
            {
              'id': 'openai',
              'name': 'OpenAI',
              'authStatus': {'configured': true},
              'models': [
                {'id': 'gpt-4o', 'name': 'GPT-4o'},
                {'id': 'gpt-4o-mini', 'name': 'GPT-4o Mini'},
              ],
            },
            {
              'id': 'anthropic',
              'name': 'Anthropic',
              'authStatus': {'configured': false},
              'models': [
                {'id': 'claude-3-5-sonnet', 'name': 'Claude 3.5 Sonnet'},
              ],
            },
          ],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final providers = await repository.getProviders();

      expect(providers.length, equals(2));
      expect(providers[0].id, equals('openai'));
      expect(providers[0].name, equals('OpenAI'));
      expect(providers[0].isConfigured, isTrue);
      expect(providers[0].models, contains('gpt-4o'));

      expect(providers[1].id, equals('anthropic'));
      expect(providers[1].isConfigured, isFalse);
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/providers'));
      expect(mockAdapter.lastRequestOptions?.method, equals('GET'));
    });

    test('saveProviderCredentials calls backend and writes to secure storage', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true, 'authStatus': {'configured': true}}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.saveProviderCredentials('openai', 'sk-test-secret-key');

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/providers/openai/key'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestBody, equals({'apiKey': 'sk-test-secret-key'}));

      // Verify saved in secure storage
      final storedKey = await repository.getSavedProviderApiKey('openai');
      expect(storedKey, equals('sk-test-secret-key'));
    });

    test('clearProviderCredentials deletes from backend and deletes from secure storage', () async {
      await storage.setProviderApiKey('openai', 'sk-test-secret-key');

      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true, 'authStatus': {'configured': false}}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.clearProviderCredentials('openai');

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/providers/openai/key'));
      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));

      final storedKey = await repository.getSavedProviderApiKey('openai');
      expect(storedKey, isNull);
    });
  });
}
