enum AutocompleteKind {
  tool,
  skill,
  agent,
  project,
}

class AutocompleteItem {
  final String trigger; // '/' or '@'
  final String value;
  final String label;
  final String? description;
  final AutocompleteKind kind;
  final String? icon;

  const AutocompleteItem({
    required this.trigger,
    required this.value,
    required this.label,
    this.description,
    this.kind = AutocompleteKind.tool,
    this.icon,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AutocompleteItem &&
          runtimeType == other.runtimeType &&
          trigger == other.trigger &&
          value == other.value &&
          kind == other.kind;

  @override
  int get hashCode => trigger.hashCode ^ value.hashCode ^ kind.hashCode;

  @override
  String toString() =>
      'AutocompleteItem(trigger: $trigger, value: $value, label: $label, kind: $kind)';
}
