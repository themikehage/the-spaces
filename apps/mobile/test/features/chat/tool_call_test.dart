import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/attachment_preview.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tool_call_card.dart';

void main() {
  group('ToolCallCard widget', () {
    testWidgets('renders running tool call with spinner and name', (tester) async {
      const tc = ToolCall(
        id: 'tc-run',
        name: 'fetch_weather',
        arguments: {'city': 'Montevideo'},
        status: 'running',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ToolCallCard(toolCall: tc),
          ),
        ),
      );

      expect(find.text('fetch_weather'), findsOneWidget);
      expect(find.text('Running'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('collapsible behavior reveals arguments and result on tap', (tester) async {
      const tc = ToolCall(
        id: 'tc-done',
        name: 'query_database',
        arguments: {'table': 'users', 'limit': 5},
        result: {'count': 5, 'status': 'ok'},
        status: 'done',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolCallCard(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.text('query_database'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('ARGUMENTS'), findsNothing);

      // Tap to expand
      await tester.tap(find.text('query_database'));
      await tester.pumpAndSettle();

      expect(find.text('ARGUMENTS'), findsOneWidget);
      expect(find.text('RESULT'), findsOneWidget);
      expect(find.textContaining('users'), findsOneWidget);
      expect(find.textContaining('count'), findsOneWidget);
    });

    testWidgets('renders error tool call with Error badge', (tester) async {
      const tc = ToolCall(
        id: 'tc-err',
        name: 'write_file',
        arguments: {'path': '/root/secret.txt'},
        result: 'Permission denied',
        status: 'error',
        isError: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ToolCallCard(toolCall: tc),
          ),
        ),
      );

      expect(find.text('write_file'), findsOneWidget);
      expect(find.text('Error'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
    });
  });

  group('AttachmentPreview widget', () {
    testWidgets('renders preview items and triggers onRemove', (tester) async {
      int? removedIndex;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AttachmentPreview(
              imagePaths: const ['/mock/path/img1.png', '/mock/path/img2.jpg'],
              onRemove: (idx) => removedIndex = idx,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.close), findsNWidgets(2));

      await tester.tap(find.byIcon(Icons.close).first);
      await tester.pump();

      expect(removedIndex, 0);
    });
  });
}
