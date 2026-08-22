import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/api/api_exception.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/attention/data/attention_repository.dart';

import '../../helpers/fake_secure_storage.dart';

class MockHttpAdapter implements HttpClientAdapter {
  String Function(RequestOptions options)? responseBuilder;
  int statusCode = 200;
  DioException? exceptionToThrow;
  RequestOptions? lastRequestOptions;
  dynamic lastData;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequestOptions = options;
    lastData = options.data;
    if (exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    final content = responseBuilder != null
        ? responseBuilder!(options)
        : jsonEncode({'success': true});

    return ResponseBody.fromString(
      content,
      statusCode,
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
  late AttentionRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = AttentionRepositoryImpl(apiClient: apiClient);
  });

  group('AttentionRepository Tests', () {
    test('getPending returns typed list of AttentionItem on 200 OK', () async {
      mockAdapter.responseBuilder = (_) => jsonEncode({
          'pending': [
            {
              'approvalId': 'appr-1',
              'sessionId': 'sess-1',
              'toolName': 'bash',
              'kind': 'approval',
              'args': {'command': 'rm -rf node_modules'},
              'reason': 'Delete dependencies',
              'status': 'pending',
            },
            {
              'approvalId': 'q-1',
              'sessionId': 'sess-2',
              'toolName': 'ask_question',
              'kind': 'question',
              'args': {
                'question': 'Which database to use?',
                'options': ['PostgreSQL', 'SQLite'],
                'isMultiSelect': false,
              },
              'reason': 'Database choice',
              'status': 'pending',
            },
          ],
        });

      final items = await repository.getPending();

      expect(items.length, equals(2));
      expect(items[0].approvalId, equals('appr-1'));
      expect(items[0].isApproval, isTrue);
      expect(items[0].isQuestion, isFalse);
      expect(items[0].commandPreview, equals('rm -rf node_modules'));

      expect(items[1].approvalId, equals('q-1'));
      expect(items[1].isQuestion, isTrue);
      expect(items[1].questionText, equals('Which database to use?'));
      expect(items[1].optionsList, equals(['PostgreSQL', 'SQLite']));
      expect(items[1].isMultiSelect, isFalse);

      expect(mockAdapter.lastRequestOptions?.path, equals('/api/approvals'));
    });

    test('getPending throws ApiException on server error', () async {
      mockAdapter.statusCode = 500;
      mockAdapter.responseBuilder = (_) => jsonEncode({'error': 'Server error'});

      expect(
        () => repository.getPending(),
        throwsA(isA<ServerException>()),
      );
    });

    test('respondToQuestion sends submit action and payload', () async {
      mockAdapter.statusCode = 200;
      mockAdapter.responseBuilder = (_) => jsonEncode({'success': true});

      final result = await repository.respondToQuestion(
        'q-1',
        selectedOptions: ['PostgreSQL'],
        customAnswer: 'With Neon extension',
      );

      expect(result, isTrue);
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/approvals/q-1'));
      expect(mockAdapter.lastData, isA<Map<String, dynamic>>());
      final data = mockAdapter.lastData as Map<String, dynamic>;
      expect(data['action'], equals('submit'));
      expect(data['payload'], isA<Map<String, dynamic>>());
      expect(data['payload']['selectedOptions'], equals(['PostgreSQL']));
      expect(data['payload']['customAnswer'], equals('With Neon extension'));
    });

    test('respondToApproval sends approve/deny action', () async {
      mockAdapter.statusCode = 200;
      mockAdapter.responseBuilder = (_) => jsonEncode({'success': true});

      final approveResult = await repository.respondToApproval(
        'appr-1',
        approved: true,
      );
      expect(approveResult, isTrue);
      expect(mockAdapter.lastData['action'], equals('approve'));

      final denyResult = await repository.respondToApproval(
        'appr-2',
        approved: false,
      );
      expect(denyResult, isTrue);
      expect(mockAdapter.lastData['action'], equals('deny'));
    });
  });
}
