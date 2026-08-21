import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';

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
  late AgentsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = AgentsRepository(apiClient: apiClient);
  });

  group('AgentsRepository Tests', () {
    test('getAgents returns list of agents on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'agents': [
            {
              'id': 'agent-architect',
              'name': 'Architect',
              'description': 'Senior System Architect',
              'model': 'claude-3-7-sonnet',
              'status': 'ready',
              'tools': ['view_file', 'write_to_file'],
              'skills': ['architecture-rules'],
            },
            {
              'id': 'agent-coder',
              'name': 'Coder',
              'description': 'Feature Developer',
              'model': 'gpt-4o',
              'status': 'busy',
            }
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await repository.getAgents();

      expect(result.length, equals(2));
      expect(result[0].id, equals('agent-architect'));
      expect(result[0].name, equals('Architect'));
      expect(result[0].model, equals('claude-3-7-sonnet'));
      expect(result[0].tools, contains('view_file'));
      expect(result[0].skills, contains('architecture-rules'));
      expect(result[1].name, equals('Coder'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/agents'));
    });

    test('getAgent returns single agent', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'agent-lead',
          'name': 'Tech Lead',
          'status': 'ready',
          'definition': {
            'name': 'Tech Lead',
            'model': 'gemini-2.5-pro',
            'tools': ['bash', 'search'],
          }
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final agent = await repository.getAgent('agent-lead');

      expect(agent.id, equals('agent-lead'));
      expect(agent.name, equals('Tech Lead'));
      expect(agent.model, equals('gemini-2.5-pro'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/agents/agent-lead'));
    });

    test('createAgent posts definition', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'agent-new',
          'name': 'New Assistant',
          'status': 'ready',
        }),
        201,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final created = await repository.createAgent({
        'id': 'agent-new',
        'name': 'New Assistant',
        'model': 'gpt-4o',
      });

      expect(created.id, equals('agent-new'));
      expect(created.name, equals('New Assistant'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/agents'));
    });

    test('updateAgent patches agent', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'agent-lead',
          'name': 'Lead Architect',
          'status': 'ready',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final updated = await repository.updateAgent(
        'agent-lead',
        {'name': 'Lead Architect'},
      );

      expect(updated.id, equals('agent-lead'));
      expect(updated.name, equals('Lead Architect'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/agents/agent-lead'));
    });

    test('deleteAgent sends DELETE', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'ok': true}),
        204,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.deleteAgent('agent-to-delete');

      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/agents/agent-to-delete'));
    });

    test('getResolvedConfig fetches resolved agent config', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'defaultModel': 'claude-3-7-sonnet',
          'toolOverrides': {
            'add': ['search', 'bash'],
          },
          'skills': ['skill-1'],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final config = await repository.getResolvedConfig('agent-lead');

      expect(config['defaultModel'], equals('claude-3-7-sonnet'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/config/agent/agent-lead/resolved'));
    });

    test('updateEntityConfig puts updated config payload', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'success': true,
          'config': {'defaultModel': 'gemini-2.5-pro'},
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final res = await repository.updateEntityConfig(
        'agent',
        'agent-lead',
        {'defaultModel': 'gemini-2.5-pro'},
      );

      expect(res['success'], isTrue);
      expect(mockAdapter.lastRequestOptions?.method, equals('PUT'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/config/agent/agent-lead'));
    });
  });
}
