import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow_run.dart';
import 'package:spaces_mobile/features/workflows/data/workflows_repository.dart';
import 'package:spaces_mobile/features/workflows/ui/workflow_run_detail_screen.dart';

class MockWorkflowsRepository implements WorkflowsRepository {
  final Workflow workflow = const Workflow(
    id: 'wf-deploy',
    name: 'Deploy Production',
    steps: [
      WorkflowStep(id: 'step_build', type: 'agent', label: 'Build application'),
      WorkflowStep(id: 'step_deploy', type: 'agent', label: 'Deploy to cloud'),
    ],
  );

  WorkflowRun run = const WorkflowRun(
    id: 'run-500',
    workflowId: 'wf-deploy',
    workflowName: 'Deploy Production',
    status: 'running',
    startedAt: '2026-08-22T08:00:00Z',
    stepStates: {
      'step_build': WorkflowStepState(
        stepId: 'step_build',
        status: 'success',
        outputs: {'artifact': 'app.tar.gz'},
      ),
      'step_deploy': WorkflowStepState(
        stepId: 'step_deploy',
        status: 'running',
      ),
    },
  );

  @override
  Future<List<Workflow>> getWorkflows({
    String? scopeType,
    String? entityId,
  }) async =>
      [workflow];

  @override
  Future<Workflow> getWorkflow(String id) async => workflow;

  @override
  Future<WorkflowRun> runWorkflow(
    String id, {
    Map<String, dynamic>? inputs,
    String? parentSessionId,
    bool? dryRun,
  }) async =>
      run;

  @override
  Future<List<WorkflowRun>> getWorkflowRuns(String workflowId) async => [run];

  @override
  Future<WorkflowRun> getWorkflowRun(String runId) async => run;

  @override
  Future<void> abortRun(String runId) async {
    run = run.copyWith(status: 'cancelled');
  }
}

class FakeWsClient extends WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockWorkflowsRepository mockRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockRepo = MockWorkflowsRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        workflowsRepositoryProvider.overrideWithValue(mockRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: WorkflowRunDetailScreen(
          workflowId: 'wf-deploy',
          runId: 'run-500',
        ),
      ),
    );
  }

  group('WorkflowRunDetailScreen Widget Tests', () {
    testWidgets('renders run overview and step execution status',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Deploy Production'), findsOneWidget);
      expect(find.text('Run Status: RUNNING'), findsOneWidget);
      expect(find.text('Run ID: run-500'), findsOneWidget);
      expect(find.text('Started: 2026-08-22T08:00:00Z'), findsOneWidget);

      // Steps
      expect(find.text('Build application'), findsOneWidget);
      expect(find.text('Deploy to cloud'), findsOneWidget);
      expect(find.text('Output:'), findsOneWidget);

      // Abort button for running workflow
      expect(find.byKey(const Key('abort_workflow_button')), findsOneWidget);
    });

    testWidgets('tapping abort opens confirmation dialog and aborts run',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final abortBtn = find.byKey(const Key('abort_workflow_button'));
      await tester.tap(abortBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Abort Workflow Run'), findsOneWidget);

      final confirmBtn = find.byKey(const Key('abort_workflow_confirm_button'));
      await tester.tap(confirmBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Run Status: CANCELLED'), findsOneWidget);
    });
  });
}
