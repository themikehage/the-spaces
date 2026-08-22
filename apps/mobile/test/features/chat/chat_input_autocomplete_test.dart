import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/controllers/autocomplete_controller.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/chat_input_bar.dart';

void main() {
  group('ChatInputBar Autocomplete integration', () {
    late AutocompleteController autocompleteController;
    late TextEditingController textController;

    setUp(() {
      textController = TextEditingController();
      autocompleteController = AutocompleteController();
      autocompleteController.updateDataSources(
        tools: ['read_file', 'write_to_file'],
        skills: [
          {'name': 'frontend-design', 'description': 'UI Design Assistant'},
        ],
        agents: [
          {'id': 'coder', 'name': 'Coder Agent', 'description': 'Full stack developer'},
        ],
      );
    });

    tearDown(() {
      textController.dispose();
      autocompleteController.dispose();
    });

    testWidgets('typing slash opens popover and selecting inserts command', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              controller: textController,
              autocompleteController: autocompleteController,
              onSend: (_) {},
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

      await tester.enterText(textField, '/');
      await tester.pump();

      expect(autocompleteController.isVisible, isTrue);
      expect(find.text('/read_file'), findsOneWidget);
      expect(find.text('/frontend-design'), findsOneWidget);

      // Tap on frontend-design
      await tester.tap(find.text('/frontend-design'));
      await tester.pump();

      expect(autocompleteController.isVisible, isFalse);
      expect(textController.text, '/frontend-design ');
    });

    testWidgets('typing @ opens mention popover and selecting inserts mention', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              controller: textController,
              autocompleteController: autocompleteController,
              onSend: (_) {},
              onStop: () {},
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
            ),
          ),
        ),
      );

      final textField = find.byType(TextField);
      await tester.enterText(textField, 'Hey @');
      await tester.pump();

      expect(autocompleteController.isVisible, isTrue);
      expect(find.text('@Coder Agent'), findsOneWidget);

      await tester.tap(find.text('@Coder Agent'));
      await tester.pump();

      expect(autocompleteController.isVisible, isFalse);
      expect(textController.text, 'Hey @coder ');
    });
  });
}
