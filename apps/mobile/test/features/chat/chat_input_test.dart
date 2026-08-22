import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/chat_input_bar.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/model_selector_sheet.dart';

void main() {
  group('ChatInputBar widget', () {
    testWidgets('typing text enables send button and sends message', (tester) async {
      String? sentText;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              onSend: (text) => sentText = text,
              onStop: () {},
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
            ),
          ),
        ),
      );

      final textField = find.byType(TextField);
      expect(textField, findsOneWidget);

      await tester.enterText(textField, 'Create a Flutter widget');
      await tester.pump();

      final sendButton = find.byKey(const Key('send_message_button'));
      expect(sendButton, findsOneWidget);

      await tester.tap(sendButton);
      await tester.pump();

      expect(sentText, 'Create a Flutter widget');
    });

    testWidgets('renders floating card structure with bottom toolbar controls', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              currentModelName: 'Claude 3.5',
              contextUsed: 500,
              contextLimit: 1000,
              onSend: (_) {},
              onStop: () {},
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
              onOpenSkillsSelector: () {},
              onOpenToolsSelector: () {},
            ),
          ),
        ),
      );

      // Check model name in bottom toolbar pill
      expect(find.text('Claude 3.5'), findsOneWidget);
      expect(find.byKey(const Key('chat_attachment_button')), findsOneWidget);
      expect(find.byKey(const Key('chat_model_selector_button')), findsOneWidget);
      expect(find.byKey(const Key('chat_skills_selector_button')), findsOneWidget);
      expect(find.byKey(const Key('chat_tools_selector_button')), findsOneWidget);
      expect(find.byKey(const Key('send_message_button')), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('shows Stop button during streaming and triggers onStop', (tester) async {
      bool stopTriggered = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: true,
              onSend: (_) {},
              onStop: () => stopTriggered = true,
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
            ),
          ),
        ),
      );

      final stopButton = find.byKey(const Key('stop_streaming_button'));
      expect(stopButton, findsOneWidget);

      await tester.tap(stopButton);
      await tester.pump();

      expect(stopTriggered, true);
    });
  });

  group('ModelSelectorSheet widget', () {
    testWidgets('renders available models and triggers selection', (tester) async {
      AiModel? selectedModel;

      final models = [
        const AiModel(id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', reasoning: true),
        const AiModel(id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic'),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ModelSelectorSheet(
              models: models,
              currentModelId: 'gpt-4o',
              onSelectModel: (m) => selectedModel = m,
            ),
          ),
        ),
      );

      expect(find.text('Select AI Model'), findsOneWidget);
      expect(find.text('GPT-4o'), findsOneWidget);
      expect(find.text('Claude 3.5 Sonnet'), findsOneWidget);
      expect(find.text('REASONING'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);

      await tester.tap(find.text('Claude 3.5 Sonnet'));
      await tester.pump();

      expect(selectedModel?.id, 'claude-3-5-sonnet');
    });
  });
}
