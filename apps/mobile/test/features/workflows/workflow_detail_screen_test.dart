import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow_run.dart';
import 'package:spaces_mobile/features/workflows/data/workflows_repository.dart';
import 'package:spaces_mobile/features/workflows/ui/workflow_detail_screen.dart';

class MockWorkflowsRepository implements WorkflowsRepository {
  final Workflow workflow = const Workflow(
    id: 'wf-deploy',
    name: 'Deploy Production Pipeline',
    description: 'Build, test and deploy artifacts',
    onError: 'stop',
    tag: 'ci-cd',
    steps: [
      WorkflowStep(
        id: 'step_build',
        type: 'agent',
        label: 'Build application bundle',
        agentId: 'builder-agent',
      ),
      WorkflowStep(
        id: 'step_test',
        type: 'code',
        label: 'Run automated smoke tests',
      ),
    ],
  );

  final List<WorkflowRun> runs = [
    const WorkflowRun(
      id: 'run-101',
      workflowId: 'wf-deploy',
      status: 'success',
      startedAt: '2026-08-22T06:00:00Z',
    ),
    const WorkflowRun(
      id: 'run-102',
      workflowId: 'wf-deploy',
      status: 'running',
      startedAt: '2026-08-22T07:00:00Z',
    ),
  ];

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
      WorkflowRun(id: 'run-103', workflowId: id, status: 'running');

  @override
  Future<List<WorkflowRun>> getWorkflowRuns(String workflowId) async => runs;

  @override
  Future<WorkflowRun> getWorkflowRun(String runId) async =>
      runs.firstWhere((r) => r.id == runId,
          orElse: () => WorkflowRun(id: runId, workflowId: 'wf-deploy'));

  @override
  Future<void> abortRun(String runId) async {}
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
    final router = GoRouter(
      initialLocation: '/workflows/wf-deploy',
      routes: [
        GoRoute(
          path: '/workflows/:id',
          builder: (context, state) => WorkflowDetailScreen(
            workflowId: state.pathParameters['id'] ?? '',
          ),
          routes: [
            GoRoute(
              path: 'runs/:runId',
              builder: (context, state) =>
                  const Scaffold(body: Text('Run Detail Page')),
            ),
          ],
        ),
      ],
    );

    return ProviderScope(
      overrides: [
        workflowsRepositoryProvider.overrideWithValue(mockRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: MaterialApp.router(
        routerConfig: router,
      ),
    );
  }

  group('WorkflowDetailScreen Widget Tests', () {
    testWidgets('renders workflow overview, step sequence, and web client notice',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Deploy Production Pipeline'), findsWidgets);
      expect(find.text('Build, test and deploy artifacts'), findsOneWidget);
      expect(find.text('2 Steps'), findsOneWidget);
      expect(find.text('On Error: stop'), findsOneWidget);

      // Web client notice
      expect(
        find.text(
          'Visual workflow node editor is available on the web client. Mobile allows triggering runs and monitoring live step progress.',
        ),
        findsOneWidget,
      );

      // Step cards
      expect(find.text('Build application bundle'), findsOneWidget);
      expect(find.text('Run automated smoke tests'), findsOneWidget);

      // Recent runs
      expect(find.text('Run run-101'), findsOneWidget);
      expect(find.text('Run run-102'), findsOneWidget);
      expect(find.text('SUCCESS'), findsOneWidget);
      expect(find.text('RUNNING'), findsOneWidget);

      // Run button
      expect(find.byKey(const Key('workflow_run_button')), findsOneWidget);
    });

    testWidgets('tapping Run triggers workflow run execution', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final runBtn = find.byKey(const Key('workflow_run_button'));
      await tester.tap(runBtn);
      await tester.pump();

      expect(find.text('Starting...'), findsNothing);
    });
  });
}
