import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/controllers/autocomplete_controller.dart';
import 'package:spaces_mobile/features/chat/models/autocomplete_item.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/autocomplete_popover.dart';

void main() {
  group('AutocompletePopover widget', () {
    late AutocompleteController controller;

    setUp(() {
      controller = AutocompleteController();
      controller.setAvailableItems(const [
        AutocompleteItem(
          trigger: '/',
          value: 'read_file',
          label: 'read_file',
          description: 'Read file contents',
          kind: AutocompleteKind.tool,
        ),
        AutocompleteItem(
          trigger: '/',
          value: 'frontend-design',
          label: 'frontend-design',
          description: 'UI Design Assistant',
          kind: AutocompleteKind.skill,
        ),
        AutocompleteItem(
          trigger: '@',
          value: 'coder-agent',
          label: 'Coder Agent',
          description: 'Software Engineer',
          kind: AutocompleteKind.agent,
        ),
      ]);
    });

    testWidgets('renders nothing when not visible', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AutocompletePopover(
              controller: controller,
              onSelectItem: (_) {},
            ),
          ),
        ),
      );

      expect(find.byType(ListView), findsNothing);
    });

    testWidgets('renders items and handles tap when trigger activated', (tester) async {
      AutocompleteItem? selectedItem;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AutocompletePopover(
              controller: controller,
              onSelectItem: (item) => selectedItem = item,
            ),
          ),
        ),
      );

      controller.onTextChanged('/', 1);
      await tester.pump();

      expect(find.text('/read_file'), findsOneWidget);
      expect(find.text('/frontend-design'), findsOneWidget);
      expect(find.text('TOOL'), findsOneWidget);
      expect(find.text('SKILL'), findsOneWidget);

      await tester.tap(find.text('/read_file'));
      await tester.pump();

      expect(selectedItem, isNotNull);
      expect(selectedItem?.value, 'read_file');
    });

    testWidgets('renders mention items on @ trigger', (tester) async {
      AutocompleteItem? selectedItem;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AutocompletePopover(
              controller: controller,
              onSelectItem: (item) => selectedItem = item,
            ),
          ),
        ),
      );

      controller.onTextChanged('@', 1);
      await tester.pump();

      expect(find.text('@Coder Agent'), findsOneWidget);
      expect(find.text('AGENT'), findsOneWidget);

      await tester.tap(find.text('@Coder Agent'));
      await tester.pump();

      expect(selectedItem?.value, 'coder-agent');
    });
  });
}
