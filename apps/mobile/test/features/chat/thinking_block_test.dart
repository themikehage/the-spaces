import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/thinking_block.dart';

void main() {
  group('ThinkingBlock Widget', () {
    testWidgets('renders short content expanded by default', (tester) async {
      const shortThinking = 'Analyzing the database schema...';

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ThinkingBlock(content: shortThinking),
          ),
        ),
      );

      expect(find.text('Thinking'), findsOneWidget);
      expect(find.textContaining('Analyzing the database schema', findRichText: true), findsOneWidget);
      expect(find.byIcon(Icons.psychology_alt), findsOneWidget);
    });

    testWidgets('renders long content collapsed by default and expands on tap', (tester) async {
      final longThinking = 'Detailed reasoning step in progress. ' * 10; // > 200 chars

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: ThinkingBlock(content: longThinking),
            ),
          ),
        ),
      );

      expect(find.text('Thinking'), findsOneWidget);
      expect(find.textContaining('Detailed reasoning step', findRichText: true), findsNothing);

      // Tap header to expand
      await tester.tap(find.text('Thinking'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Detailed reasoning step', findRichText: true), findsOneWidget);

      // Tap header to collapse again
      await tester.tap(find.text('Thinking'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Detailed reasoning step', findRichText: true), findsNothing);
    });

    testWidgets('displays streaming state with Thinking... label and cursor', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ThinkingBlock(
              content: 'Streamed thought chunk',
              isStreaming: true,
              initiallyExpanded: true,
            ),
          ),
        ),
      );

      expect(find.text('Thinking...'), findsOneWidget);
      expect(find.textContaining('Streamed thought chunk', findRichText: true), findsOneWidget);
      expect(find.byType(FadeTransition), findsWidgets);
    });
  });

  group('MessageBubble with ThinkingBlock integration', () {
    testWidgets('renders ThinkingBlock above assistant message content', (tester) async {
      const message = ChatMessage(
        id: 'msg_think_1',
        role: 'assistant',
        thinking: 'I need to check the user authentication status first.',
        content: 'You are currently authenticated as admin.',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: MessageBubble(message: message),
            ),
          ),
        ),
      );

      expect(find.byType(ThinkingBlock), findsOneWidget);
      expect(find.text('Thinking'), findsOneWidget);
      expect(find.textContaining('I need to check the user authentication', findRichText: true), findsOneWidget);
      expect(find.textContaining('You are currently authenticated as admin', findRichText: true), findsOneWidget);
    });

    test('parses thinking block from JSON string with <thinking> tags', () {
      final json = {
        'id': 'msg-tags',
        'role': 'assistant',
        'content': '<thinking>\nPlanning steps 1, 2, 3\n</thinking>\nHere is the plan.',
      };

      final msg = ChatMessage.fromJson(json);
      expect(msg.thinking, 'Planning steps 1, 2, 3');
      expect(msg.content, 'Here is the plan.');
    });

    test('parses thinking block from structured content list', () {
      final json = {
        'id': 'msg-struct',
        'role': 'assistant',
        'content': [
          {'type': 'thinking', 'thinking': 'Internal mental model'},
          {'type': 'text', 'text': 'Public response'},
        ],
      };

      final msg = ChatMessage.fromJson(json);
      expect(msg.thinking, 'Internal mental model');
      expect(msg.content, 'Public response');
    });
  });
}
