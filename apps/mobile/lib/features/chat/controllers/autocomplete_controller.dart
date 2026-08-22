import 'package:flutter/foundation.dart';

import '../models/autocomplete_item.dart';

class AutocompleteSelectionResult {
  final String text;
  final int selectionOffset;

  const AutocompleteSelectionResult({
    required this.text,
    required this.selectionOffset,
  });
}

class AutocompleteController extends ChangeNotifier {
  List<AutocompleteItem> _availableItems = const [];
  List<AutocompleteItem> _filteredItems = const [];
  bool _isVisible = false;
  String _triggerChar = '';
  String _query = '';
  int _selectedIndex = 0;
  int _triggerStartPos = -1;

  List<AutocompleteItem> get items => _filteredItems;
  List<AutocompleteItem> get availableItems => _availableItems;
  bool get isVisible => _isVisible;
  String get triggerChar => _triggerChar;
  String get query => _query;
  int get selectedIndex => _selectedIndex;
  AutocompleteItem? get selectedItem =>
      _filteredItems.isNotEmpty && _selectedIndex >= 0 && _selectedIndex < _filteredItems.length
          ? _filteredItems[_selectedIndex]
          : null;

  void setAvailableItems(List<AutocompleteItem> items) {
    _availableItems = List.unmodifiable(items);
    if (_isVisible) {
      _filterItems();
      notifyListeners();
    }
  }

  void updateDataSources({
    List<Map<String, dynamic>>? skills,
    List<String>? tools,
    List<Map<String, dynamic>>? agents,
    List<Map<String, dynamic>>? projects,
  }) {
    final List<AutocompleteItem> newItems = [];

    if (tools != null) {
      for (final tool in tools) {
        newItems.add(
          AutocompleteItem(
            trigger: '/',
            value: tool,
            label: tool,
            description: 'Tool command',
            kind: AutocompleteKind.tool,
          ),
        );
      }
    }

    if (skills != null) {
      for (final skill in skills) {
        final name = skill['name']?.toString() ?? '';
        if (name.isNotEmpty) {
          newItems.add(
            AutocompleteItem(
              trigger: '/',
              value: name,
              label: name,
              description: skill['description']?.toString() ?? 'Skill command',
              kind: AutocompleteKind.skill,
            ),
          );
        }
      }
    }

    if (agents != null) {
      for (final agent in agents) {
        final name = agent['name']?.toString() ?? agent['id']?.toString() ?? '';
        final id = agent['id']?.toString() ?? name;
        if (name.isNotEmpty) {
          newItems.add(
            AutocompleteItem(
              trigger: '@',
              value: id,
              label: name,
              description: agent['description']?.toString() ?? 'Agent mention',
              kind: AutocompleteKind.agent,
            ),
          );
        }
      }
    }

    if (projects != null) {
      for (final project in projects) {
        final name = project['name']?.toString() ?? project['id']?.toString() ?? '';
        final id = project['id']?.toString() ?? name;
        if (name.isNotEmpty) {
          newItems.add(
            AutocompleteItem(
              trigger: '@',
              value: id,
              label: name,
              description: project['description']?.toString() ?? 'Project mention',
              kind: AutocompleteKind.project,
            ),
          );
        }
      }
    }

    setAvailableItems(newItems);
  }

  void onTextChanged(String text, int cursorPos) {
    if (cursorPos < 0 || cursorPos > text.length) {
      dismiss();
      return;
    }

    final textBeforeCursor = text.substring(0, cursorPos);
    final match = RegExp(r'(?:^|\s)([/@])([^\s/@]*)$').firstMatch(textBeforeCursor);

    if (match == null) {
      dismiss();
      return;
    }

    final fullMatch = match.group(0)!;
    final trigger = match.group(1)!;
    final queryText = match.group(2) ?? '';
    final leadingWhitespace = fullMatch.startsWith(RegExp(r'\s')) ? 1 : 0;

    _triggerStartPos = match.start + leadingWhitespace;
    _triggerChar = trigger;
    _query = queryText;

    _filterItems();

    if (_filteredItems.isEmpty) {
      _isVisible = false;
    } else {
      _isVisible = true;
      _selectedIndex = 0;
    }

    notifyListeners();
  }

  void _filterItems() {
    final lowerQuery = _query.toLowerCase();
    _filteredItems = _availableItems.where((item) {
      if (item.trigger != _triggerChar) return false;
      if (lowerQuery.isEmpty) return true;
      final matchValue = item.value.toLowerCase().contains(lowerQuery);
      final matchLabel = item.label.toLowerCase().contains(lowerQuery);
      final matchDesc = item.description?.toLowerCase().contains(lowerQuery) ?? false;
      return matchValue || matchLabel || matchDesc;
    }).toList();
  }

  void moveSelection(int delta) {
    if (!_isVisible || _filteredItems.isEmpty) return;
    final newIndex = (_selectedIndex + delta).clamp(0, _filteredItems.length - 1);
    if (newIndex != _selectedIndex) {
      _selectedIndex = newIndex;
      notifyListeners();
    }
  }

  AutocompleteSelectionResult selectItem(
    AutocompleteItem item,
    String currentText,
    int cursorPos,
  ) {
    final safeCursor = cursorPos.clamp(0, currentText.length);
    final textBeforeTrigger = _triggerStartPos >= 0 && _triggerStartPos <= safeCursor
        ? currentText.substring(0, _triggerStartPos)
        : currentText.substring(0, safeCursor);
    final textAfterCursor = currentText.substring(safeCursor);

    final insertedToken = '${item.trigger}${item.value} ';
    final newText = '$textBeforeTrigger$insertedToken$textAfterCursor';
    final newOffset = textBeforeTrigger.length + insertedToken.length;

    dismiss();
    return AutocompleteSelectionResult(
      text: newText,
      selectionOffset: newOffset,
    );
  }

  AutocompleteSelectionResult? selectCurrent(String currentText, int cursorPos) {
    if (!_isVisible || _filteredItems.isEmpty) return null;
    final item = _filteredItems[_selectedIndex.clamp(0, _filteredItems.length - 1)];
    return selectItem(item, currentText, cursorPos);
  }

  void dismiss() {
    if (!_isVisible && _triggerChar.isEmpty && _query.isEmpty && _triggerStartPos == -1) {
      return;
    }
    _isVisible = false;
    _triggerChar = '';
    _query = '';
    _triggerStartPos = -1;
    _selectedIndex = 0;
    _filteredItems = const [];
    notifyListeners();
  }
}
