import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/projects/data/projects_repository.dart';

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
  late ProjectsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = ProjectsRepository(apiClient: apiClient);
  });

  group('ProjectsRepository Tests', () {
    test('getProjects returns list of projects on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'projects': [
            {
              'id': 'proj-1',
              'name': 'Spaces Mobile',
              'description': 'Mobile client in Flutter',
              'status': 'active',
              'tag': 'mobile',
              'createdAt': '2026-08-20T10:00:00Z',
              'updatedAt': '2026-08-21T10:00:00Z',
              'sessionCount': 5,
            },
            {
              'id': 'proj-2',
              'name': 'Spaces Server',
              'description': 'Backend server in Bun',
              'status': 'planning',
              'createdAt': '2026-08-19T10:00:00Z',
            }
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await repository.getProjects();

      expect(result.length, equals(2));
      expect(result[0].id, equals('proj-1'));
      expect(result[0].name, equals('Spaces Mobile'));
      expect(result[0].tag, equals('mobile'));
      expect(result[0].sessionCount, equals(5));
      expect(result[1].name, equals('Spaces Server'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace-projects'));
    });

    test('createProject posts data and returns created Project', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'new-project',
          'name': 'New Project',
          'description': 'Brand new project',
          'cloneUrl': 'https://github.com/org/repo.git',
          'status': 'planning',
          'createdAt': '2026-08-21T12:00:00Z',
        }),
        201,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final created = await repository.createProject(
        name: 'New Project',
        description: 'Brand new project',
        cloneUrl: 'https://github.com/org/repo.git',
      );

      expect(created.id, equals('new-project'));
      expect(created.name, equals('New Project'));
      expect(created.cloneUrl, equals('https://github.com/org/repo.git'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace-projects'));
    });

    test('updateProject patches project data', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'proj-1',
          'name': 'Updated Spaces Mobile',
          'description': 'Updated description',
          'status': 'active',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final updated = await repository.updateProject(
        'proj-1',
        {'name': 'Updated Spaces Mobile', 'description': 'Updated description'},
      );

      expect(updated.id, equals('proj-1'));
      expect(updated.name, equals('Updated Spaces Mobile'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace-projects/proj-1'));
    });

    test('deleteProject sends DELETE request', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'ok': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.deleteProject('proj-1');

      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace-projects/proj-1'));
    });
  });
}
