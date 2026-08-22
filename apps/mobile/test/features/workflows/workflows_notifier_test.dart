import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow.dart';
import 'package:spaces_mobile/features/workflows/data/models/workflow_run.dart';
import 'package:spaces_mobile/features/workflows/data/workflows_repository.dart';
import 'package:spaces_mobile/features/workflows/ui/workflows_notifier.dart';

class MockWorkflowsRepository implements WorkflowsRepository {
  List<Workflow> workflows = [];
  Map<String, List<WorkflowRun>> runsMap = {};
  Map<String, WorkflowRun> runDetails = {};
  bool shouldThrow = false;

  @override
  Future<List<Workflow>> getWorkflows({
    String? scopeType,
    String? entityId,
  }) async {
    if (shouldThrow) throw Exception('Failed to load workflows');
    return workflows;
  }

  @override
  Future<Workflow> getWorkflow(String id) async {
    if (shouldThrow) throw Exception('Failed to load workflow');
    return workflows.firstWhere(
      (w) => w.id == id,
      orElse: () => Workflow(id: id, name: id),
    );
  }

  @override
  Future<WorkflowRun> runWorkflow(
    String id, {
    Map<String, dynamic>? inputs,
    String? parentSessionId,
    bool? dryRun,
  }) async {
    if (shouldThrow) throw Exception('Failed to run workflow');
    final run = WorkflowRun(
      id: 'run-$id-1',
      workflowId: id,
      status: 'running',
      startedAt: DateTime.now().toIso8601String(),
    );
    final list = runsMap[id] ?? [];
    runsMap[id] = [run, ...list];
    runDetails[run.id] = run;
    return run;
  }

  @override
  Future<List<WorkflowRun>> getWorkflowRuns(String workflowId) async {
    if (shouldThrow) throw Exception('Failed to get runs');
    return runsMap[workflowId] ?? [];
  }

  @override
  Future<WorkflowRun> getWorkflowRun(String runId) async {
    if (shouldThrow) throw Exception('Failed to get run');
    return runDetails[runId] ?? WorkflowRun(id: runId, workflowId: '');
  }

  @override
  Future<void> abortRun(String runId) async {
    if (shouldThrow) throw Exception('Failed to abort run');
    final existing = runDetails[runId];
    if (existing != null) {
      runDetails[runId] = existing.copyWith(status: 'cancelled');
    }
  }
}

class MockWsClient implements WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  void emit(Map<String, dynamic> event) => _controller.add(event);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockWorkflowsRepository repository;
  late MockWsClient wsClient;
  late WorkflowsNotifier notifier;

  setUp(() {
    repository = MockWorkflowsRepository();
    repository.workflows = [
      const Workflow(
        id: 'wf-ci',
        name: 'CI/CD Pipeline',
        description: 'Test and deploy pipeline',
        steps: [
          WorkflowStep(id: 'step-lint', type: 'agent', label: 'Lint code'),
          WorkflowStep(id: 'step-test', type: 'agent', label: 'Run tests'),
        ],
      ),
      const Workflow(
        id: 'wf-report',
        name: 'Daily Summary Report',
        description: 'Aggregate activities',
      ),
    ];
    wsClient = MockWsClient();
    notifier = WorkflowsNotifier(repository: repository, wsClient: wsClient);
  });

  tearDown(() {
    notifier.dispose();
  });

  group('WorkflowsNotifier Tests', () {
    test('initial state loads workflows from repository', () async {
      await Future<void>.delayed(Duration.zero);

      expect(notifier.state.workflows.length, equals(2));
      expect(notifier.state.workflows[0].id, equals('wf-ci'));
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('search filters workflows list', () async {
      await Future<void>.delayed(Duration.zero);

      notifier.search('daily');
      expect(notifier.state.searchQuery, equals('daily'));
      expect(notifier.state.filteredWorkflows.length, equals(1));
      expect(
        notifier.state.filteredWorkflows[0].name,
        equals('Daily Summary Report'),
      );

      notifier.search('');
      expect(notifier.state.filteredWorkflows.length, equals(2));
    });

    test('runWorkflow initiates execution and updates activeRun', () async {
      await Future<void>.delayed(Duration.zero);

      final run = await notifier.runWorkflow('wf-ci');

      expect(run, isNotNull);
      expect(run?.workflowId, equals('wf-ci'));
      expect(run?.status, equals('running'));
      expect(notifier.state.activeRun?.id, equals(run?.id));
      expect(notifier.state.runsByWorkflowId['wf-ci']?.length, equals(1));
    });

    test('loadRunsForWorkflow updates runs history in state', () async {
      await Future<void>.delayed(Duration.zero);

      repository.runsMap['wf-ci'] = [
        const WorkflowRun(
          id: 'run-prev-1',
          workflowId: 'wf-ci',
          status: 'success',
        ),
      ];

      await notifier.loadRunsForWorkflow('wf-ci');

      expect(notifier.state.runsByWorkflowId['wf-ci']?.length, equals(1));
      expect(
        notifier.state.runsByWorkflowId['wf-ci']?[0].id,
        equals('run-prev-1'),
      );
    });

    test('abortRun cancels the active run', () async {
      await Future<void>.delayed(Duration.zero);

      final run = await notifier.runWorkflow('wf-ci');
      expect(run, isNotNull);

      final aborted = await notifier.abortRun(run!.id);
      expect(aborted, isTrue);
      expect(notifier.state.activeRun?.status, equals('cancelled'));
    });

    test('WS workflow events trigger reload and updates', () async {
      await Future<void>.delayed(Duration.zero);

      repository.workflows = [
        ...repository.workflows,
        const Workflow(id: 'wf-new', name: 'Newly Added Workflow'),
      ];

      wsClient.emit({'type': 'workflow_run_started', 'workflowId': 'wf-new'});
      await Future<void>.delayed(Duration.zero);

      expect(notifier.state.workflows.length, equals(3));
      expect(notifier.state.workflows.any((w) => w.id == 'wf-new'), isTrue);
    });
  });
}
