import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/markdown_block.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/system_message_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tool_call_card.dart';

void main() {
  group('ChatMessage model parsing', () {
    test('parses simple text message correctly', () {
      final json = {
        'id': 'msg-1',
        'role': 'user',
        'content': 'Hello, agent!',
        'timestamp': 1700000000000,
      };

      final message = ChatMessage.fromJson(json);
      expect(message.id, 'msg-1');
      expect(message.role, 'user');
      expect(message.isUser, true);
      expect(message.content, 'Hello, agent!');
      expect(message.toolCalls, isEmpty);
    });

    test('parses complex assistant message with content blocks and tool calls', () {
      final json = {
        'id': 'msg-2',
        'role': 'assistant',
        'content': [
          {'type': 'text', 'text': 'I will execute the bash command.'},
          {
            'type': 'tool_use',
            'id': 'call_1',
            'name': 'bash',
            'input': {'command': 'ls -la'},
            'result': 'file1.dart\nfile2.dart',
            'status': 'done',
          }
        ],
      };

      final message = ChatMessage.fromJson(json);
      expect(message.id, 'msg-2');
      expect(message.isAssistant, true);
      expect(message.content, 'I will execute the bash command.');
      expect(message.toolCalls.length, 1);
      expect(message.toolCalls.first.name, 'bash');
      expect(message.toolCalls.first.arguments['command'], 'ls -la');
      expect(message.toolCalls.first.result, 'file1.dart\nfile2.dart');
      expect(message.toolCalls.first.isDone, true);
    });

    test('parses system message', () {
      final json = {
        'id': 'msg-sys',
        'role': 'system',
        'content': 'Session initialized with Model: gpt-4o',
      };

      final message = ChatMessage.fromJson(json);
      expect(message.isSystem, true);
      expect(message.content, 'Session initialized with Model: gpt-4o');
    });
  });

  group('Message rendering widgets', () {
    testWidgets('renders MarkdownBlock with formatted elements', (tester) async {
      const markdownData = '''
# Heading 1
This is **bold** text and `inline code`.

- Item 1
- Item 2
''';

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MarkdownBlock(data: markdownData),
          ),
        ),
      );

      expect(find.text('Heading 1', findRichText: true), findsOneWidget);
      expect(find.textContaining('This is', findRichText: true), findsOneWidget);
    });

    testWidgets('renders User MessageBubble right-aligned', (tester) async {
      const userMessage = ChatMessage(
        id: 'u1',
        role: 'user',
        content: 'Hi Spaces!',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageBubble(message: userMessage),
          ),
        ),
      );

      expect(find.text('Hi Spaces!', findRichText: true), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome), findsNothing);
    });

    testWidgets('renders Assistant MessageBubble with avatar and tool calls', (tester) async {
      const assistantMessage = ChatMessage(
        id: 'a1',
        role: 'assistant',
        content: 'Here is your analysis:',
        toolCalls: [
          ToolCall(
            id: 'tc1',
            name: 'read_file',
            arguments: {'path': 'lib/main.dart'},
            result: 'void main() {}',
            status: 'done',
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: MessageBubble(message: assistantMessage),
            ),
          ),
        ),
      );

      expect(find.text('Here is your analysis:', findRichText: true), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome), findsOneWidget);
      expect(find.byType(ToolCallCard), findsOneWidget);
      expect(find.text('read_file'), findsOneWidget);
    });

    testWidgets('renders SystemMessageCard', (tester) async {
      const sysMessage = ChatMessage(
        id: 's1',
        role: 'system',
        content: 'Session connected.',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SystemMessageCard(message: sysMessage),
          ),
        ),
      );

      expect(find.text('Session connected.'), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });
  });
}
