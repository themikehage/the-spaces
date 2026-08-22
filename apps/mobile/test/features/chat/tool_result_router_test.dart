import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/bash_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/edit_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/exa_result_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/find_result_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/generic_tool_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/grep_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/memory_result_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/read_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/share_file_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/task_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/tool_result_router.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/web_fetch_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/workflow_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/write_result_renderer.dart';

void main() {
  group('ToolResultRouter dispatching', () {
    testWidgets('dispatches bash tool to BashResultRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c1',
        name: 'bash',
        arguments: {'command': 'pnpm test'},
        result: {'output': 'Pass: 12\nFail: 0', 'exitCode': 0},
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ToolResultRouter(toolCall: tc),
          ),
        ),
      );

      expect(find.byType(BashResultRenderer), findsOneWidget);
      expect(find.text('pnpm test'), findsOneWidget);
      expect(find.text('OK'), findsOneWidget);
      expect(find.textContaining('Pass: 12'), findsOneWidget);
    });

    testWidgets('dispatches edit tool to EditResultRenderer with diff hunks', (tester) async {
      const diffContent = '''
@@ -1,3 +1,3 @@
-const oldVar = 1;
+const newVar = 2;
 const sameVar = 3;
''';
      const tc = ToolCall(
        id: 'c2',
        name: 'edit',
        arguments: {'path': 'lib/config.dart'},
        result: diffContent,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.byType(EditResultRenderer), findsOneWidget);
      expect(find.text('lib/config.dart'), findsOneWidget);
      expect(find.textContaining('-const oldVar = 1;'), findsOneWidget);
      expect(find.textContaining('+const newVar = 2;'), findsOneWidget);
    });

    testWidgets('dispatches read tool to ReadResultRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c3',
        name: 'read',
        arguments: {'path': 'lib/main.dart'},
        result: 'void main() => runApp(const MyApp());',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ToolResultRouter(toolCall: tc),
          ),
        ),
      );

      expect(find.byType(ReadResultRenderer), findsOneWidget);
      expect(find.text('lib/main.dart'), findsOneWidget);
      expect(find.textContaining('void main() => runApp'), findsOneWidget);
    });

    testWidgets('dispatches grep_search tool to GrepResultRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c4',
        name: 'grep_search',
        arguments: {'query': 'AppTheme'},
        result: ['lib/main.dart:12: theme: AppTheme.dark()', 'lib/app.dart:5: AppTheme'],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.byType(GrepResultRenderer), findsOneWidget);
      expect(find.text('AppTheme'), findsWidgets);
      expect(find.text('2 matches'), findsOneWidget);
    });

    testWidgets('dispatches write_to_file tool to WriteResultRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c5',
        name: 'write_to_file',
        arguments: {'TargetFile': 'lib/new_feature.dart', 'CodeContent': 'class NewFeature {}'},
        result: 'File created successfully',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.byType(WriteResultRenderer), findsOneWidget);
      expect(find.text('lib/new_feature.dart'), findsOneWidget);
      expect(find.text('Created'), findsOneWidget);
      expect(find.textContaining('class NewFeature {}'), findsOneWidget);
    });

    testWidgets('dispatches find and list_dir tools to FindResultCard', (tester) async {
      const tcFind = ToolCall(
        id: 'c_find',
        name: 'find',
        arguments: {'pattern': '*.dart'},
        result: 'lib/main.dart\nlib/app.dart\nlib/features/chat/\n',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcFind),
            ),
          ),
        ),
      );

      expect(find.byType(FindResultCard), findsOneWidget);
      expect(find.text('find (3)'), findsOneWidget);
      expect(find.text('lib/main.dart'), findsOneWidget);
      expect(find.text('lib/features/chat/'), findsOneWidget);
    });

    testWidgets('dispatches exa_search tool to ExaResultCard', (tester) async {
      const tcExa = ToolCall(
        id: 'c_exa',
        name: 'exa_search',
        arguments: {'query': 'Flutter Riverpod 2.6'},
        result: {
          'totalResults': 2,
          'searchType': 'neural',
          'costDollars': 0.0025,
          'results': [
            {
              'title': 'Riverpod Official Guide',
              'url': 'https://riverpod.dev/docs/introduction',
              'snippet': 'A reactive caching and state-management framework for Flutter.',
              'publishedDate': '2025-01-10',
            }
          ],
          'synthesizedOutput': 'Riverpod 2.6 is the recommended state management library.',
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcExa),
            ),
          ),
        ),
      );

      expect(find.byType(ExaResultCard), findsOneWidget);
      expect(find.text('Riverpod Official Guide'), findsOneWidget);
      expect(find.text('riverpod.dev'), findsOneWidget);
      expect(find.text('Synthesized Output'), findsOneWidget);
    });

    testWidgets('dispatches mem_save and mem_search tools to MemoryResultCard', (tester) async {
      const tcMemStore = ToolCall(
        id: 'c_mem_save',
        name: 'mem_save',
        arguments: {
          'type': 'procedural',
          'importance': 0.8,
          'content': 'Run flutter analyze before every commit',
          'tags': ['flutter', 'rules'],
        },
        result: {'status': 'saved'},
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcMemStore),
            ),
          ),
        ),
      );

      expect(find.byType(MemoryResultCard), findsOneWidget);
      expect(find.text('Memory Stored'), findsOneWidget);
      expect(find.text('procedural'), findsOneWidget);
      expect(find.text('Run flutter analyze before every commit'), findsOneWidget);
      expect(find.text('#flutter'), findsOneWidget);
    });

    testWidgets('dispatches web_fetch tool to WebFetchCard', (tester) async {
      const tcWeb = ToolCall(
        id: 'c_web',
        name: 'web_fetch',
        arguments: {'url': 'https://example.com/api', 'title': 'API Reference'},
        result: '{"status": "ok", "version": "1.0.0"}',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcWeb),
            ),
          ),
        ),
      );

      expect(find.byType(WebFetchCard), findsOneWidget);
      expect(find.text('API Reference'), findsOneWidget);
      expect(find.text('Open'), findsOneWidget);
      expect(find.textContaining('{"status": "ok"'), findsOneWidget);
    });

    testWidgets('dispatches manage_workflow tool to WorkflowCard', (tester) async {
      const tcWf = ToolCall(
        id: 'c_wf',
        name: 'manage_workflow',
        arguments: {'action': 'list'},
        result: [
          {
            'id': 'wf_build',
            'name': 'CI Build & Test',
            'description': 'Runs tests and builds artifacts',
            'steps': [
              {'id': 's1', 'label': 'Run Linter', 'type': 'bash'},
              {'id': 's2', 'label': 'Run Unit Tests', 'type': 'test'},
            ],
          }
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcWf),
            ),
          ),
        ),
      );

      expect(find.byType(WorkflowCard), findsOneWidget);
      expect(find.text('Workflows (1)'), findsOneWidget);
      expect(find.text('CI Build & Test'), findsOneWidget);
      expect(find.text('2 steps'), findsOneWidget);
      expect(find.text('Run Linter'), findsOneWidget);
    });

    testWidgets('dispatches task and decompose_tasks tools to TaskCard', (tester) async {
      const tcTask = ToolCall(
        id: 'c_task',
        name: 'decompose_tasks',
        arguments: {},
        result: {
          'objective': 'Implement Authentication',
          'mode': 'parallel',
          'totalTasks': 2,
          'tasks': [
            {'id': 't1', 'title': 'Create Auth Repository', 'status': 'done'},
            {'id': 't2', 'title': 'Create Login Screen', 'status': 'running', 'depends_on': ['t1']},
          ],
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcTask),
            ),
          ),
        ),
      );

      expect(find.byType(TaskCard), findsOneWidget);
      expect(find.text('Tasks Planned (2)'), findsOneWidget);
      expect(find.text('Implement Authentication'), findsOneWidget);
      expect(find.text('Create Auth Repository'), findsOneWidget);
      expect(find.text('DONE'), findsOneWidget);
      expect(find.text('Create Login Screen'), findsOneWidget);
      expect(find.text('RUNNING'), findsOneWidget);
    });

    testWidgets('dispatches share_file tool to ShareFileCard', (tester) async {
      const tcShare = ToolCall(
        id: 'c_share',
        name: 'share_file',
        arguments: {'filePath': 'reports/summary.pdf', 'title': 'Q4 Summary Report'},
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tcShare),
            ),
          ),
        ),
      );

      expect(find.byType(ShareFileCard), findsOneWidget);
      expect(find.text('Q4 Summary Report'), findsOneWidget);
      expect(find.text('reports/summary.pdf'), findsOneWidget);
      expect(find.text('PDF'), findsOneWidget);
    });

    testWidgets('dispatches unknown tool to GenericToolCard fallback', (tester) async {
      const tc = ToolCall(
        id: 'c6',
        name: 'custom_mcp_tool',
        arguments: {'param1': 'val1'},
        result: {'data': 'custom response'},
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.byType(GenericToolCard), findsOneWidget);
      expect(find.text('ARGUMENTS'), findsOneWidget);
      expect(find.text('RESULT'), findsOneWidget);
      expect(find.textContaining('param1'), findsOneWidget);
      expect(find.textContaining('custom response'), findsOneWidget);
    });

    testWidgets('dispatches render_images to CustomUiRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c7',
        name: 'render_images',
        arguments: {
          'images': [
            {'url': 'https://example.com/art.png', 'title': 'Concept Art'},
          ],
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.text('Concept Art'), findsOneWidget);
    });

    testWidgets('dispatches render_html to CustomUiRenderer', (tester) async {
      const tc = ToolCall(
        id: 'c8',
        name: 'render_html',
        arguments: {
          'html': '<div>Dashboard Preview Widget</div>',
          'title': 'Live Preview',
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolResultRouter(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.text('LIVE PREVIEW'), findsOneWidget);
      expect(find.textContaining('Dashboard Preview Widget'), findsOneWidget);
    });
  });
}
