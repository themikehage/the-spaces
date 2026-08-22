import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/bash_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/edit_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/generic_tool_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/grep_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/read_result_renderer.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/tool_result_router.dart';
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
  });
}
