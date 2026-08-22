import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/shared/widgets/entity_config_editor.dart';

class MockAgentsRepository implements AgentsRepository {
  Map<String, dynamic> lastUpdatedConfig = {};
  bool updateConfigCalled = false;

  @override
  Future<List<Map<String, dynamic>>> getAvailableModels() async {
    return [
      {'id': 'claude-3-7-sonnet', 'name': 'Claude 3.7 Sonnet'},
      {'id': 'gemini-2.5-pro', 'name': 'Gemini 2.5 Pro'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async {
    return [
      {
        'name': 'web-search',
        'description': 'Search the live web',
        'scope': 'global',
      },
      {
        'name': 'code-review',
        'description': 'Perform automated code review',
        'scope': 'project',
      },
    ];
  }

  @override
  Future<Map<String, dynamic>> getEntityConfig(
    String entityType,
    String entityId,
  ) async {
    return {
      'defaultModel': 'claude-3-7-sonnet',
      'skills': ['web-search'],
      'toolOverrides': {
        'add': ['read_file', 'write_file'],
      },
    };
  }

  @override
  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async {
    return {
      'resolved': ['read_file', 'write_file'],
      'global': ['read_file', 'write_file', 'run_command'],
    };
  }

  @override
  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async {
    updateConfigCalled = true;
    lastUpdatedConfig = config;
    return {'success': true, 'config': config};
  }

  @override
  Future<Agent> getAgent(String id) async =>
      Agent(id: id, name: id, model: 'claude-3-7-sonnet');

  @override
  Future<List<Agent>> getAgents() async => [];

  @override
  Future<Agent> createAgent(Map<String, dynamic> definition) async =>
      const Agent(id: 'new', name: 'New');

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async =>
      Agent(id: id, name: id);

  @override
  Future<void> deleteAgent(String id) async {}

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockAgentsRepository mockRepo;

  setUp(() {
    mockRepo = MockAgentsRepository();
  });

  Widget buildTestWidget({VoidCallback? onSave}) {
    return ProviderScope(
      overrides: [
        agentsRepositoryProvider.overrideWithValue(mockRepo),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: EntityConfigEditor(
              entityType: 'project',
              entityId: 'proj-1',
              title: 'Project Config',
              onSave: onSave,
            ),
          ),
        ),
      ),
    );
  }

  group('EntityConfigEditor Widget Tests', () {
    testWidgets('loads and renders model, tools, and skills sections',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Project Config'), findsOneWidget);
      expect(find.text('Assigned Model'), findsOneWidget);
      expect(find.text('Tools Configuration'), findsOneWidget);
      expect(find.text('Skills Configuration'), findsOneWidget);
      expect(find.byKey(const Key('entity_config_save_button')), findsOneWidget);

      // Verify skills rendered
      expect(find.text('web-search'), findsOneWidget);
      expect(find.text('code-review'), findsOneWidget);
    });

    testWidgets('tapping save calls updateEntityConfig and triggers onSave callback',
        (tester) async {
      bool onSaveCalled = false;

      await tester.pumpWidget(buildTestWidget(
        onSave: () {
          onSaveCalled = true;
        },
      ));
      await tester.pumpAndSettle();

      // Tap on the code-review skill to toggle it on
      final skillCheckbox = find.byKey(const Key('entity_config_skill_code-review'));
      await tester.tap(skillCheckbox);
      await tester.pumpAndSettle();

      // Tap save
      final saveBtn = find.byKey(const Key('entity_config_save_button'));
      await tester.tap(saveBtn);
      await tester.pumpAndSettle();

      expect(mockRepo.updateConfigCalled, isTrue);
      expect(onSaveCalled, isTrue);
      expect(
        mockRepo.lastUpdatedConfig['skills'],
        containsAll(['web-search', 'code-review']),
      );
    });
  });
}
