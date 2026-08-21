class AttentionState {
  final int pendingCount;

  const AttentionState({
    this.pendingCount = 0,
  });

  bool get hasPending => pendingCount > 0;

  AttentionState copyWith({
    int? pendingCount,
  }) {
    return AttentionState(
      pendingCount: pendingCount ?? this.pendingCount,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AttentionState && other.pendingCount == pendingCount;
  }

  @override
  int get hashCode => pendingCount.hashCode;
}
