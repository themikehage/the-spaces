class NavigationState {
  final int currentBranch;
  final bool isDrawerOpen;

  const NavigationState({
    this.currentBranch = 0,
    this.isDrawerOpen = false,
  });

  NavigationState copyWith({
    int? currentBranch,
    bool? isDrawerOpen,
  }) {
    return NavigationState(
      currentBranch: currentBranch ?? this.currentBranch,
      isDrawerOpen: isDrawerOpen ?? this.isDrawerOpen,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is NavigationState &&
        other.currentBranch == currentBranch &&
        other.isDrawerOpen == isDrawerOpen;
  }

  @override
  int get hashCode => Object.hash(currentBranch, isDrawerOpen);
}
