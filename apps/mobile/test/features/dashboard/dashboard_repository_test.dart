import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/dashboard/data/dashboard_repository.dart';

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
  late DashboardRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = DashboardRepository(apiClient: apiClient);
  });

  group('DashboardRepository Tests', () {
    test('getActiveSessions returns typed list of DashboardSession on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'sessions': [
            {
              'id': 'sess-1',
              'name': 'Refactor Auth Architecture',
              'status': 'running',
              'agentId': 'agent-core',
              'projectId': 'proj-1',
              'updatedAt': '2026-08-19T20:00:00Z',
              'messageCount': 12,
            },
            {
              'id': 'sess-2',
              'name': 'Design System Migration',
              'status': 'running',
              'agentId': 'agent-ui',
              'projectId': 'proj-2',
              'updatedAt': '2026-08-19T20:30:00Z',
              'messageCount': 5,
            },
          ],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final sessions = await repository.getActiveSessions();

      expect(sessions.length, equals(2));
      expect(sessions.first.id, equals('sess-1'));
      expect(sessions.first.title, equals('Refactor Auth Architecture'));
      expect(sessions.first.status, equals('running'));
      expect(sessions.first.isRunning, isTrue);
      expect(sessions.first.agentId, equals('agent-core'));
      expect(sessions.first.projectId, equals('proj-1'));
      expect(sessions.first.messageCount, equals(12));

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/sessions'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['status'], equals('running'));
    });

    test('getActiveSessions throws ApiException on 4xx/5xx HTTP errors', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'error': 'Unauthorized access', 'code': 'UNAUTHORIZED'}),
        401,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      expect(
        () => repository.getActiveSessions(),
        throwsA(isA<UnauthorizedException>()),
      );
    });

    test('getRecentProjects returns typed list of DashboardProject on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'projects': [
            {
              'id': 'proj-1',
              'name': 'the-spaces',
              'description': 'AI-assisted cloud workspace',
              'sessionCount': 8,
              'updatedAt': '2026-08-19T21:00:00Z',
            },
            {
              'id': 'proj-2',
              'name': 'mobile-app',
              'description': 'Flutter client',
              'sessionCount': 3,
              'lastModified': '2026-08-19T19:00:00Z',
            },
          ],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final projects = await repository.getRecentProjects(limit: 5);

      expect(projects.length, equals(2));
      expect(projects.first.id, equals('proj-1'));
      expect(projects.first.name, equals('the-spaces'));
      expect(projects.first.description, equals('AI-assisted cloud workspace'));
      expect(projects.first.sessionCount, equals(8));
      expect(projects.last.updatedAt, equals('2026-08-19T19:00:00Z'));

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace-projects'));
    });

    test('getRecentProjects respects limit parameter', () async {
      final list = List.generate(
        10,
        (i) => {
          'id': 'proj-$i',
          'name': 'Project $i',
          'sessionCount': i,
        },
      );

      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'projects': list}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final projects = await repository.getRecentProjects(limit: 3);

      expect(projects.length, equals(3));
      expect(projects.first.name, equals('Project 0'));
      expect(projects.last.name, equals('Project 2'));
    });

    test('getRecentProjects throws ApiException on server error', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'error': 'Internal Server Error'}),
        500,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      expect(
        () => repository.getRecentProjects(),
        throwsA(isA<ServerException>()),
      );
    });
  });
}
