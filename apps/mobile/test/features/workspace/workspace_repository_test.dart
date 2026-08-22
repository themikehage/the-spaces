import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/workspace/data/models/workspace_file.dart';
import 'package:spaces_mobile/features/workspace/data/workspace_repository.dart';

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
  late WorkspaceRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = WorkspaceRepository(apiClient: apiClient, storage: storage);
  });

  group('WorkspaceFile Model Tests', () {
    test('identifies text and image extensions properly', () {
      const mdFile = WorkspaceFile(path: 'README.md', name: 'README.md');
      expect(mdFile.isText, isTrue);
      expect(mdFile.isImage, isFalse);

      const dartFile = WorkspaceFile(path: 'lib/main.dart', name: 'main.dart');
      expect(dartFile.isText, isTrue);
      expect(dartFile.isImage, isFalse);

      const pngFile = WorkspaceFile(path: 'assets/logo.png', name: 'logo.png');
      expect(pngFile.isImage, isTrue);
      expect(pngFile.isText, isFalse);

      const binFile = WorkspaceFile(path: 'app.bin', name: 'app.bin');
      expect(binFile.isImage, isFalse);
      expect(binFile.isText, isFalse);
    });

    test('formats file sizes accurately', () {
      const bFile = WorkspaceFile(path: 'a.txt', name: 'a.txt', size: 512);
      expect(bFile.sizeFormatted, equals('512 B'));

      const kbFile = WorkspaceFile(path: 'b.txt', name: 'b.txt', size: 12 * 1024);
      expect(kbFile.sizeFormatted, equals('12 KB'));

      final mbFile = WorkspaceFile(path: 'c.png', name: 'c.png', size: (2.5 * 1024 * 1024).toInt());
      expect(mbFile.sizeFormatted, equals('2.5 MB'));
    });

    test('parses from JSON correctly', () {
      final json = {
        'name': 'config.json',
        'path': 'config.json',
        'size': 1024,
        'lastModified': '2026-08-22T10:00:00Z',
        'isDirectory': false,
      };

      final file = WorkspaceFile.fromJson(json);
      expect(file.name, equals('config.json'));
      expect(file.path, equals('config.json'));
      expect(file.size, equals(1024));
      expect(file.isText, isTrue);
      expect(file.isDirectory, isFalse);
    });
  });

  group('WorkspaceRepository Tests', () {
    test('getFiles queries /api/workspace with agentId for agent entity', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'workspace',
          'path': '',
          'isDirectory': true,
          'children': [
            {
              'name': 'notes.md',
              'path': 'notes.md',
              'size': 2048,
              'isDirectory': false,
              'lastModified': '2026-08-22T09:00:00Z',
            },
            {
              'name': 'preview.png',
              'path': 'preview.png',
              'size': 10240,
              'isDirectory': false,
              'lastModified': '2026-08-22T09:30:00Z',
            }
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final files = await repository.getFiles(
        entityType: 'agent',
        entityId: 'agent-123',
      );

      expect(files.length, equals(2));
      expect(files[0].name, equals('notes.md'));
      expect(files[0].isText, isTrue);
      expect(files[1].name, equals('preview.png'));
      expect(files[1].isImage, isTrue);

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['agentId'], equals('agent-123'));
    });

    test('getFiles queries /api/workspace with project for project entity', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'workspace',
          'path': '',
          'children': [
            {
              'name': 'pubspec.yaml',
              'path': 'pubspec.yaml',
              'size': 500,
              'isDirectory': false,
            }
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final files = await repository.getFiles(
        entityType: 'project',
        entityId: 'proj-456',
      );

      expect(files.length, equals(1));
      expect(files[0].name, equals('pubspec.yaml'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['project'], equals('proj-456'));
    });

    test('getFileContent decodes base64 content correctly', () async {
      final rawText = '# Hello World\nThis is a markdown file.';
      final base64Content = base64Encode(utf8.encode(rawText));

      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'README.md',
          'path': 'README.md',
          'content': base64Content,
          'mimeType': 'text/markdown',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final content = await repository.getFileContent(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'README.md',
      );

      expect(content, equals(rawText));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/README.md'));
    });

    test('getImageUrl builds raw image url properly', () {
      final url = repository.getImageUrl(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'assets/logo.png',
      );

      expect(url, contains('/api/workspace/assets/logo.png?agentId=agent-123&raw=true'));
    });
  });
}
