import '../data/models/attention_item.dart';

class AttentionState {
  final List<AttentionItem> items;
  final int pendingCount;
  final bool isLoading;
  final String? error;

  const AttentionState({
    this.items = const [],
    this.pendingCount = 0,
    this.isLoading = false,
    this.error,
  });

  bool get hasPending => pendingCount > 0;

  AttentionState copyWith({
    List<AttentionItem>? items,
    int? pendingCount,
    bool? isLoading,
    String? error,
  }) {
    final newItems = items ?? this.items;
    return AttentionState(
      items: newItems,
      pendingCount: pendingCount ?? newItems.length,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AttentionState &&
        other.pendingCount == pendingCount &&
        other.isLoading == isLoading &&
        other.error == error &&
        _listEquals(other.items, items);
  }

  @override
  int get hashCode =>
      pendingCount.hashCode ^
      isLoading.hashCode ^
      error.hashCode ^
      items.length.hashCode;

  static bool _listEquals(List<AttentionItem> a, List<AttentionItem> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i].approvalId != b[i].approvalId) return false;
    }
    return true;
  }
}
