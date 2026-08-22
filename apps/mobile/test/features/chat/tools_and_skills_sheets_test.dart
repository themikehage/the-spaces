import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/chat_input_bar.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/skills_selector_sheet.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools_selector_sheet.dart';

class FakeAgentsRepositoryForSkills implements AgentsRepository {
  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async {
    return [
      {
        'name': 'frontend-design',
        'description': 'Create distinctive UI interfaces with high design quality',
        'scope': 'global',
      },
      {
        'name': 'git-flow',
        'description': 'Handle feature branching and pull requests',
        'scope': 'workspace',
      },
    ];
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('ToolsSelectorSheet widget', () {
    testWidgets('renders execution modes and toggles tools', (tester) async {
      List<String>? updatedTools;
      ExecutionMode? updatedMode;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ToolsSelectorSheet(
              availableTools: const ['read_file', 'write_to_file', 'run_command'],
              activeTools: const ['read_file'],
              onToolsChanged: (tools) => updatedTools = tools,
              onExecutionModeChanged: (mode) => updatedMode = mode,
            ),
          ),
        ),
      );

      expect(find.text('Tools Configuration'), findsOneWidget);
      expect(find.text('Standard'), findsOneWidget);
      expect(find.text('Read-Only'), findsOneWidget);
      expect(find.text('Autonomous'), findsOneWidget);

      // Toggle tool
      final checkbox = find.byKey(const Key('tool_toggle_write_to_file'));
      expect(checkbox, findsOneWidget);
      await tester.tap(checkbox);
      await tester.pump();

      expect(updatedTools, isNotNull);

      // Select Read-Only mode
      await tester.tap(find.text('Read-Only'));
      await tester.pump();
      expect(updatedMode, ExecutionMode.readOnly);
    });
  });

  group('SkillsSelectorSheet widget', () {
    testWidgets('loads and renders available workspace skills with scope tabs', (tester) async {
      String? selectedSkillCommand;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            agentsRepositoryProvider.overrideWithValue(FakeAgentsRepositoryForSkills()),
          ],
          child: MaterialApp(
            theme: AppTheme.dark(),
            home: Scaffold(
              body: SkillsSelectorSheet(
                onSelectSkillCommand: (cmd) => selectedSkillCommand = cmd,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Workspace Skills'), findsOneWidget);
      expect(find.text('ALL'), findsOneWidget);
      expect(find.text('GLOBAL'), findsOneWidget);
      expect(find.text('WORKSPACE'), findsOneWidget);
      expect(find.text('frontend-design'), findsOneWidget);
      expect(find.text('git-flow'), findsOneWidget);

      // Filter by GLOBAL tab
      await tester.tap(find.text('GLOBAL'));
      await tester.pump();

      expect(find.text('frontend-design'), findsOneWidget);
      expect(find.text('git-flow'), findsNothing);

      // Filter by WORKSPACE tab
      await tester.tap(find.text('WORKSPACE'));
      await tester.pump();

      expect(find.text('frontend-design'), findsNothing);
      expect(find.text('git-flow'), findsOneWidget);

      // Back to ALL tab and tap skill to select command
      await tester.tap(find.text('ALL'));
      await tester.pump();

      await tester.tap(find.text('frontend-design'));
      await tester.pump();

      expect(selectedSkillCommand, equals('/frontend-design '));
    });
  });

  group('ChatInputBar selector buttons', () {
    testWidgets('triggers onOpenSkillsSelector and onOpenToolsSelector callbacks', (tester) async {
      bool skillsOpened = false;
      bool toolsOpened = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              onSend: (_) {},
              onStop: () {},
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
              onOpenSkillsSelector: () => skillsOpened = true,
              onOpenToolsSelector: () => toolsOpened = true,
            ),
          ),
        ),
      );

      final skillsBtn = find.byKey(const Key('chat_skills_selector_button'));
      expect(skillsBtn, findsOneWidget);
      await tester.tap(skillsBtn);
      await tester.pump();
      expect(skillsOpened, isTrue);

      final toolsBtn = find.byKey(const Key('chat_tools_selector_button'));
      expect(toolsBtn, findsOneWidget);
      await tester.tap(toolsBtn);
      await tester.pump();
      expect(toolsOpened, isTrue);
    });
  });
}
