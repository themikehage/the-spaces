import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow_run.dart';
import 'package:spaces_mobile/features/workflows/data/workflows_repository.dart';
import 'package:spaces_mobile/features/workflows/ui/workflows_screen.dart';

class MockWorkflowsRepository implements WorkflowsRepository {
  List<Workflow> workflows = [
    const Workflow(
      id: 'wf-deploy',
      name: 'Deploy Production',
      description: 'Build and deploy to prod',
      lastRunStatus: 'success',
      steps: [
        WorkflowStep(id: 'step_1', type: 'agent', label: 'Build app'),
      ],
    ),
    const Workflow(
      id: 'wf-test',
      name: 'E2E Testing Suite',
      description: 'Run integration test matrix',
      lastRunStatus: 'running',
      steps: [
        WorkflowStep(id: 'step_test', type: 'agent', label: 'Test app'),
      ],
    ),
  ];

  @override
  Future<List<Workflow>> getWorkflows({
    String? scopeType,
    String? entityId,
  }) async =>
      List.from(workflows);

  @override
  Future<Workflow> getWorkflow(String id) async => workflows.firstWhere(
        (w) => w.id == id,
        orElse: () => Workflow(id: id, name: id),
      );

  @override
  Future<WorkflowRun> runWorkflow(
    String id, {
    Map<String, dynamic>? inputs,
    String? parentSessionId,
    bool? dryRun,
  }) async =>
      WorkflowRun(id: 'run-$id', workflowId: id);

  @override
  Future<List<WorkflowRun>> getWorkflowRuns(String workflowId) async => [];

  @override
  Future<WorkflowRun> getWorkflowRun(String runId) async =>
      WorkflowRun(id: runId, workflowId: '');

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
    return ProviderScope(
      overrides: [
        workflowsRepositoryProvider.overrideWithValue(mockRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: WorkflowsScreen(),
      ),
    );
  }

  group('WorkflowsScreen Widget Tests', () {
    testWidgets('renders list of workflows and status badges', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Workflows'), findsOneWidget);
      expect(find.byKey(const Key('workflows_search_input')), findsOneWidget);
      expect(find.text('Deploy Production'), findsOneWidget);
      expect(find.text('E2E Testing Suite'), findsOneWidget);
      expect(find.text('SUCCESS'), findsOneWidget);
      expect(find.text('RUNNING'), findsOneWidget);
      expect(find.text('1 steps'), findsWidgets);
    });

    testWidgets('search input filters workflows list', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final searchInput = find.byKey(const Key('workflows_search_input'));
      await tester.enterText(searchInput, 'e2e');
      await tester.pumpAndSettle();

      expect(find.text('E2E Testing Suite'), findsOneWidget);
      expect(find.text('Deploy Production'), findsNothing);
    });
  });
}
