import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';

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
  late SessionsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = SessionsRepository(apiClient: apiClient);
  });

  group('SessionsRepository Tests', () {
    test('getSessions returns PaginatedSessions on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'sessions': [
            {
              'id': 'sess-1',
              'name': 'Refactor Navigation',
              'status': 'active',
              'agentId': 'agent-1',
              'projectId': 'proj-1',
              'createdAt': '2026-08-20T10:00:00Z',
              'updatedAt': '2026-08-20T12:00:00Z',
              'messageCount': 10,
            },
            {
              'id': 'sess-2',
              'title': 'Add Tests',
              'status': 'idle',
              'createdAt': '2026-08-21T09:00:00Z',
              'updatedAt': '2026-08-21T09:30:00Z',
              'messageCount': 3,
            }
          ],
          'total': 25,
          'page': 1,
          'perPage': 2,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await repository.getSessions(page: 1, limit: 2, status: 'all', search: 'test');

      expect(result.items.length, equals(2));
      expect(result.items[0].id, equals('sess-1'));
      expect(result.items[0].title, equals('Refactor Navigation'));
      expect(result.items[1].title, equals('Add Tests'));
      expect(result.total, equals(25));
      expect(result.page, equals(1));
      expect(result.hasMore, isTrue);
      expect(mockAdapter.lastRequestOptions?.queryParameters['page'], equals(1));
      expect(mockAdapter.lastRequestOptions?.queryParameters['perPage'], equals(2));
      expect(mockAdapter.lastRequestOptions?.queryParameters['search'], equals('test'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['status'], isNull);
    });

    test('createSession posts data and returns created Session', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'sess-new',
          'name': 'New Session Mobile',
          'status': 'active',
          'agentId': 'agent-lead',
          'projectId': 'proj-main',
          'createdAt': '2026-08-21T21:00:00Z',
          'updatedAt': '2026-08-21T21:00:00Z',
          'messageCount': 0,
        }),
        201,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      const input = CreateSessionInput(
        title: 'New Session Mobile',
        agentId: 'agent-lead',
        projectId: 'proj-main',
      );

      final created = await repository.createSession(input);

      expect(created.id, equals('sess-new'));
      expect(created.title, equals('New Session Mobile'));
      expect(created.agentId, equals('agent-lead'));
      expect(created.projectId, equals('proj-main'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/sessions'));
    });

    test('deleteSession sends DELETE request to /api/sessions/:id', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.deleteSession('sess-to-delete');

      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/sessions/sess-to-delete'));
    });

    test('archiveSession sends PATCH request with archived: true', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.archiveSession('sess-to-archive');

      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/sessions/sess-to-archive'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'archived': true}));
    });

    test('unarchiveSession sends PATCH request with archived: false', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.unarchiveSession('sess-to-unarchive');

      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/sessions/sess-to-unarchive'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'archived': false}));
    });

    test('getSessions with archived: true sets query parameter', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'sessions': [],
          'total': 0,
          'page': 1,
          'perPage': 20,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.getSessions(archived: true);

      expect(mockAdapter.lastRequestOptions?.queryParameters['archived'], equals(true));
    });
  });
}
