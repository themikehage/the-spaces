class EntitySessionState {
  final String? currentSessionId;
  final bool isLoading;
  final String? error;

  const EntitySessionState({
    this.currentSessionId,
    this.isLoading = false,
    this.error,
  });

  EntitySessionState copyWith({
    String? currentSessionId,
    bool? isLoading,
    String? error,
  }) {
    return EntitySessionState(
      currentSessionId: currentSessionId ?? this.currentSessionId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EntitySessionState &&
          runtimeType == other.runtimeType &&
          currentSessionId == other.currentSessionId &&
          isLoading == other.isLoading &&
          error == other.error;

  @override
  int get hashCode => Object.hash(currentSessionId, isLoading, error);
}
