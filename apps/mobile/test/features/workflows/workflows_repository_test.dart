import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/workflows/data/workflows_repository.dart';

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
  late WorkflowsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = WorkflowsRepository(apiClient: apiClient);
  });

  group('WorkflowsRepository Tests', () {
    test('getWorkflows returns list of workflows', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode([
          {
            'id': 'wf-deploy',
            'name': 'Deploy Workflow',
            'description': 'Automated build and deploy',
            'onError': 'stop',
            'steps': [
              {
                'id': 'step_build',
                'type': 'agent',
                'label': 'Build application',
              },
              {
                'id': 'step_test',
                'type': 'agent',
                'label': 'Run test suite',
                'dependsOn': ['step_build'],
              },
            ],
          },
        ]),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await repository.getWorkflows();

      expect(result.length, equals(1));
      expect(result[0].id, equals('wf-deploy'));
      expect(result[0].name, equals('Deploy Workflow'));
      expect(result[0].steps.length, equals(2));
      expect(result[0].steps[0].id, equals('step_build'));
      expect(result[0].steps[1].dependsOn, contains('step_build'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows'));
    });

    test('getWorkflow returns single workflow', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'wf-deploy',
          'name': 'Deploy Pipeline',
          'steps': [
            {'id': 'step_1', 'type': 'agent', 'label': 'Init'},
          ],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final wf = await repository.getWorkflow('wf-deploy');

      expect(wf.id, equals('wf-deploy'));
      expect(wf.name, equals('Deploy Pipeline'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows/wf-deploy'));
    });

    test('runWorkflow posts run request and returns WorkflowRun', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'run-123',
          'workflowId': 'wf-deploy',
          'workflowName': 'Deploy Pipeline',
          'status': 'running',
          'startedAt': '2026-08-22T08:00:00Z',
          'stepStates': {
            'step_1': {
              'stepId': 'step_1',
              'status': 'running',
              'startedAt': '2026-08-22T08:00:01Z',
            },
          },
        }),
        201,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final run = await repository.runWorkflow('wf-deploy');

      expect(run.id, equals('run-123'));
      expect(run.workflowId, equals('wf-deploy'));
      expect(run.status, equals('running'));
      expect(run.stepStates.containsKey('step_1'), isTrue);
      expect(run.stepStates['step_1']?.status, equals('running'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows/wf-deploy/run'));
    });

    test('getWorkflowRuns returns run list for a workflow', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode([
          {
            'id': 'run-1',
            'workflowId': 'wf-deploy',
            'status': 'success',
            'startedAt': '2026-08-22T07:00:00Z',
            'completedAt': '2026-08-22T07:05:00Z',
          },
        ]),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final runs = await repository.getWorkflowRuns('wf-deploy');

      expect(runs.length, equals(1));
      expect(runs[0].id, equals('run-1'));
      expect(runs[0].status, equals('success'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows/wf-deploy/runs'));
    });

    test('getWorkflowRun returns details for a single run', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'run-123',
          'workflowId': 'wf-deploy',
          'status': 'running',
          'startedAt': '2026-08-22T08:00:00Z',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final run = await repository.getWorkflowRun('run-123');

      expect(run.id, equals('run-123'));
      expect(run.status, equals('running'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows/runs/run-123'));
    });

    test('abortRun sends abort post', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'success': true}),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.abortRun('run-123');

      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/workflows/runs/run-123/abort'));
    });
  });
}
