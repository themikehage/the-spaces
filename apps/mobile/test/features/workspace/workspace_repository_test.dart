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

    test('createFile sends PUT with type file and returns created WorkspaceFile', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'new_doc.md',
          'path': 'docs/new_doc.md',
          'size': 15,
          'isDirectory': false,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final file = await repository.createFile(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'docs/new_doc.md',
        content: '# Hello world',
      );

      expect(file.name, equals('new_doc.md'));
      expect(file.path, equals('docs/new_doc.md'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PUT'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/docs/new_doc.md'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'type': 'file', 'content': '# Hello world'}));
    });

    test('createFolder sends PUT with type folder and returns folder WorkspaceFile', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'components',
          'path': 'src/components',
          'isDirectory': true,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final folder = await repository.createFolder(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'src/components',
      );

      expect(folder.name, equals('components'));
      expect(folder.isDirectory, isTrue);
      expect(mockAdapter.lastRequestOptions?.method, equals('PUT'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/src/components'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'type': 'folder'}));
    });

    test('renameFile sends PATCH with newPath', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'renamed.md',
          'path': 'docs/renamed.md',
          'isDirectory': false,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final file = await repository.renameFile(
        entityType: 'agent',
        entityId: 'agent-123',
        oldPath: 'docs/old.md',
        newPath: 'docs/renamed.md',
      );

      expect(file.name, equals('renamed.md'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/docs/old.md'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'newPath': 'docs/renamed.md'}));
    });

    test('deleteFile sends DELETE to /api/workspace/:path', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.deleteFile(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'trash.txt',
      );

      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/trash.txt'));
    });

    test('saveFile sends PUT with file content', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'config.json',
          'path': 'config.json',
          'size': 25,
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final file = await repository.saveFile(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'config.json',
        content: '{"key":"value"}',
      );

      expect(file.name, equals('config.json'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PUT'));
      expect(mockAdapter.lastRequestOptions?.data, equals({'type': 'file', 'content': '{"key":"value"}'}));
    });

    test('listChildren queries /api/workspace/:path and parses children', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'src',
          'path': 'src',
          'isDirectory': true,
          'children': [
            {'name': 'app.dart', 'path': 'src/app.dart', 'isDirectory': false, 'size': 100},
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final children = await repository.listChildren(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'src',
      );

      expect(children.length, equals(1));
      expect(children[0].name, equals('app.dart'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/src'));
    });

    test('downloadFileBytes requests with download=true', () async {
      final bytes = utf8.encode('file contents');
      mockAdapter.responseBody = ResponseBody(
        Stream.value(Uint8List.fromList(bytes)),
        200,
        headers: {
          Headers.contentTypeHeader: ['application/octet-stream'],
        },
      );

      final downloaded = await repository.downloadFileBytes(
        entityType: 'agent',
        entityId: 'agent-123',
        path: 'data.bin',
      );

      expect(downloaded, isNotEmpty);
      expect(mockAdapter.lastRequestOptions?.queryParameters['download'], equals('true'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/data.bin'));
    });
  });
}
