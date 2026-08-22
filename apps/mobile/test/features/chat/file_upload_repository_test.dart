import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/chat/data/file_upload_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/uploaded_file.dart';

import '../../helpers/fake_secure_storage.dart';

class MockUploadHttpAdapter implements HttpClientAdapter {
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
          jsonEncode({
            'name': 'uploaded_test.png',
            'path': 'assets/uploads/uploaded_test.png',
            'size': 2048,
            'mimeType': 'image/png',
          }),
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
  late MockUploadHttpAdapter mockAdapter;
  late Dio dio;
  late ApiClient apiClient;
  late FileUploadRepository repository;
  late Directory tempDir;
  late File sampleFile;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockUploadHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = FileUploadRepository(apiClient: apiClient);

    tempDir = await Directory.systemTemp.createTemp('upload_repo_test_');
    sampleFile = File('${tempDir.path}/test_file.txt');
    await sampleFile.writeAsString('Test upload payload content');
  });

  tearDown(() async {
    try {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    } catch (_) {}
  });

  group('UploadedFile Model Tests', () {
    test('parses from JSON and formats size correctly', () {
      final json = {
        'name': 'document.pdf',
        'path': 'assets/uploads/document.pdf',
        'size': 150000,
        'mimeType': 'application/pdf',
      };

      final model = UploadedFile.fromJson(json);
      expect(model.name, equals('document.pdf'));
      expect(model.path, equals('assets/uploads/document.pdf'));
      expect(model.extension, equals('pdf'));
      expect(model.sizeBytes, equals(150000));
      expect(model.formattedSize, equals('146.5 KB'));
      expect(model.isImage, isFalse);
    });

    test('identifies image extensions properly', () {
      const pngFile = UploadedFile(
        path: 'assets/uploads/img.png',
        url: 'http://localhost/assets/uploads/img.png',
        sizeBytes: 1024,
        name: 'img.png',
        extension: 'png',
      );
      expect(pngFile.isImage, isTrue);

      const zipFile = UploadedFile(
        path: 'assets/uploads/archive.zip',
        url: 'http://localhost/assets/uploads/archive.zip',
        sizeBytes: 1024 * 1024 * 2,
        name: 'archive.zip',
        extension: 'zip',
      );
      expect(zipFile.isImage, isFalse);
      expect(zipFile.formattedSize, equals('2.0 MB'));
    });
  });

  group('FileUploadRepository Tests', () {
    test('uploadFile sends multipart POST to /api/workspace/assets/uploads with scope query params', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'name': 'test_file.txt',
          'path': 'assets/uploads/test_file.txt',
          'size': 27,
          'mimeType': 'text/plain',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final uploaded = await repository.uploadFile(
        filePath: sampleFile.path,
        projectName: 'spaces-project',
        agentId: 'agent-42',
      );

      expect(uploaded.name, equals('test_file.txt'));
      expect(uploaded.path, equals('assets/uploads/test_file.txt'));
      expect(uploaded.sizeBytes, equals(27));

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workspace/assets/uploads'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['project'], equals('spaces-project'));
      expect(mockAdapter.lastRequestOptions?.queryParameters['agentId'], equals('agent-42'));
      expect(mockAdapter.lastRequestOptions?.data, isA<FormData>());
    });

    test('uploadFile throws BadRequestException if file does not exist', () async {
      expect(
        () => repository.uploadFile(filePath: '${tempDir.path}/non_existent_file.xyz'),
        throwsA(isA<BadRequestException>()),
      );
    });
  });
}
