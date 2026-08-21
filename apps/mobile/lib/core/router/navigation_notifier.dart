import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'navigation_state.dart';

class NavigationNotifier extends Notifier<NavigationState> {
  @override
  NavigationState build() {
    return const NavigationState();
  }

  void selectBranch(int index) {
    if (state.currentBranch != index) {
      state = state.copyWith(currentBranch: index);
    }
  }

  void openDrawer() {
    state = state.copyWith(isDrawerOpen: true);
  }

  void closeDrawer() {
    state = state.copyWith(isDrawerOpen: false);
  }

  void setDrawerOpen(bool isOpen) {
    state = state.copyWith(isDrawerOpen: isOpen);
  }
}

final navigationNotifierProvider =
    NotifierProvider<NavigationNotifier, NavigationState>(
  NavigationNotifier.new,
);
