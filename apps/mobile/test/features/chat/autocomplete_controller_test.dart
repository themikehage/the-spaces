import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/chat/controllers/autocomplete_controller.dart';
import 'package:spaces_mobile/features/chat/models/autocomplete_item.dart';

void main() {
  group('AutocompleteController', () {
    late AutocompleteController controller;

    setUp(() {
      controller = AutocompleteController();
      controller.updateDataSources(
        tools: ['read_file', 'write_to_file', 'grep_search', 'run_command'],
        skills: [
          {'name': 'frontend-design', 'description': 'UI Design Assistant'},
          {'name': 'git-workflow', 'description': 'Git PR workflows'},
        ],
        agents: [
          {'id': 'coder-1', 'name': 'Coder Agent', 'description': 'Full-stack developer'},
          {'id': 'reviewer-1', 'name': 'Code Reviewer', 'description': 'Security and QA'},
        ],
        projects: [
          {'id': 'proj-mobile', 'name': 'The Spaces Mobile', 'description': 'Mobile Flutter App'},
        ],
      );
    });

    test('initial state is dismissed and not visible', () {
      expect(controller.isVisible, isFalse);
      expect(controller.triggerChar, isEmpty);
      expect(controller.items, isEmpty);
      expect(controller.selectedIndex, 0);
    });

    test('detects slash trigger at the start of input', () {
      controller.onTextChanged('/', 1);

      expect(controller.isVisible, isTrue);
      expect(controller.triggerChar, '/');
      expect(controller.query, '');
      expect(controller.items.length, 6); // 4 tools + 2 skills
    });

    test('filters slash items by query', () {
      controller.onTextChanged('/read', 5);

      expect(controller.isVisible, isTrue);
      expect(controller.triggerChar, '/');
      expect(controller.query, 'read');
      expect(controller.items.length, 1);
      expect(controller.items.first.value, 'read_file');
    });

    test('detects mention trigger after whitespace', () {
      controller.onTextChanged('Hello @rev', 10);

      expect(controller.isVisible, isTrue);
      expect(controller.triggerChar, '@');
      expect(controller.query, 'rev');
      expect(controller.items.length, 1);
      expect(controller.items.first.value, 'reviewer-1');
      expect(controller.items.first.kind, AutocompleteKind.agent);
    });

    test('dismisses when trigger is removed or not at word boundary', () {
      controller.onTextChanged('user@domain.com', 15);
      expect(controller.isVisible, isFalse);

      controller.onTextChanged('/test', 5);
      expect(controller.isVisible, isFalse); // no items match /test
    });

    test('navigates selection with moveSelection', () {
      controller.onTextChanged('/', 1);
      expect(controller.selectedIndex, 0);

      controller.moveSelection(1);
      expect(controller.selectedIndex, 1);

      controller.moveSelection(10);
      expect(controller.selectedIndex, controller.items.length - 1);

      controller.moveSelection(-1);
      expect(controller.selectedIndex, controller.items.length - 2);
    });

    test('selectItem replaces trigger token with value and trailing space', () {
      final input = 'Please run /wr for me';
      final cursor = 14; // after /wr
      controller.onTextChanged(input, cursor);

      final item = controller.items.firstWhere((i) => i.value == 'write_to_file');
      final result = controller.selectItem(item, input, cursor);

      expect(result.text, 'Please run /write_to_file  for me');
      expect(result.selectionOffset, 'Please run /write_to_file '.length);
      expect(controller.isVisible, isFalse);
    });

    test('selectCurrent uses selected index', () {
      controller.onTextChanged('/front', 6);
      expect(controller.isVisible, isTrue);

      final result = controller.selectCurrent('/front', 6);
      expect(result, isNotNull);
      expect(result!.text, '/frontend-design ');
      expect(controller.isVisible, isFalse);
    });

    test('dismiss explicitly clears state', () {
      controller.onTextChanged('/', 1);
      expect(controller.isVisible, isTrue);

      controller.dismiss();
      expect(controller.isVisible, isFalse);
      expect(controller.triggerChar, isEmpty);
      expect(controller.items, isEmpty);
    });
  });
}
