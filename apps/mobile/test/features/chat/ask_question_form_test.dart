import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/ask_question_form.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';

void main() {
  group('AskQuestionForm widget', () {
    testWidgets('renders question with options and custom text field', (tester) async {
      const request = QuestionRequest(
        questionId: 'q-1',
        question: 'Which framework should we use?',
        options: ['Flutter', 'React Native', 'Kotlin Multiplatform'],
        isMultiSelect: false,
        allowCustom: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: AskQuestionForm(request: request),
            ),
          ),
        ),
      );

      expect(find.text('Which framework should we use?'), findsOneWidget);
      expect(find.text('Agent Question'), findsOneWidget);
      expect(find.text('Flutter'), findsOneWidget);
      expect(find.text('React Native'), findsOneWidget);
      expect(find.text('Kotlin Multiplatform'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Send Answer'), findsOneWidget);
    });

    testWidgets('allows selecting an option and submitting answer', (tester) async {
      List<String>? chosenOptions;
      String? customText;

      const request = QuestionRequest(
        questionId: 'q-2',
        question: 'Select the target database:',
        options: ['PostgreSQL', 'SQLite', 'MongoDB'],
        isMultiSelect: false,
        allowCustom: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: AskQuestionForm(
                request: request,
                onAnswer: (options, custom) {
                  chosenOptions = options;
                  customText = custom;
                },
              ),
            ),
          ),
        ),
      );

      // Select PostgreSQL chip
      await tester.tap(find.text('PostgreSQL'));
      await tester.pumpAndSettle();

      // Enter optional custom notes
      await tester.enterText(find.byType(TextField), 'with pgvector extension');
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.text('Send Answer'));
      await tester.pump();

      expect(chosenOptions, ['PostgreSQL']);
      expect(customText, 'with pgvector extension');
    });

    testWidgets('supports multi-select options when isMultiSelect is true', (tester) async {
      List<String>? chosenOptions;

      const request = QuestionRequest(
        questionId: 'q-3',
        question: 'Select features to enable:',
        options: ['Auth', 'Analytics', 'Push Notifications'],
        isMultiSelect: true,
        allowCustom: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: AskQuestionForm(
                request: request,
                onAnswer: (options, _) => chosenOptions = options,
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Auth'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Push Notifications'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Send Answer'));
      await tester.pump();

      expect(chosenOptions?.contains('Auth'), true);
      expect(chosenOptions?.contains('Push Notifications'), true);
      expect(chosenOptions?.contains('Analytics'), false);
    });

    testWidgets('renders resolved state with Answered badge and hides input form', (tester) async {
      const request = QuestionRequest(
        questionId: 'q-4',
        question: 'Selected deployment region:',
        options: ['us-east-1', 'eu-west-1'],
        selectedOptions: ['eu-west-1'],
        customAnswer: 'Primary staging region',
        resolved: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: AskQuestionForm(request: request),
            ),
          ),
        ),
      );

      expect(find.text('Answered'), findsOneWidget);
      expect(find.text('Send Answer'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Primary staging region'), findsOneWidget);
    });
  });

  group('MessageBubble inline AskQuestionForm integration', () {
    testWidgets('renders AskQuestionForm when message is question request', (tester) async {
      const msg = ChatMessage(
        id: 'msg_q_1',
        role: 'ask_question',
        questionRequest: QuestionRequest(
          questionId: 'q-test',
          question: 'What is your project name?',
          options: ['Spaces', 'Nova'],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: MessageBubble(message: msg),
            ),
          ),
        ),
      );

      expect(find.byType(AskQuestionForm), findsOneWidget);
      expect(find.text('What is your project name?'), findsOneWidget);
      expect(find.text('Spaces'), findsOneWidget);
      expect(find.text('Send Answer'), findsOneWidget);
    });
  });
}
