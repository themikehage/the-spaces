import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/router/navigation_notifier.dart';
import 'package:spaces_mobile/core/router/navigation_state.dart';

void main() {
  group('NavigationNotifier Tests', () {
    test('initial state has branch 0 and drawer closed', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final state = container.read(navigationNotifierProvider);
      expect(state.currentBranch, 0);
      expect(state.isDrawerOpen, isFalse);
    });

    test('selectBranch updates currentBranch', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(navigationNotifierProvider.notifier);
      notifier.selectBranch(2);

      expect(container.read(navigationNotifierProvider).currentBranch, 2);
    });

    test('openDrawer and closeDrawer toggle isDrawerOpen state', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(navigationNotifierProvider.notifier);
      notifier.openDrawer();
      expect(container.read(navigationNotifierProvider).isDrawerOpen, isTrue);

      notifier.closeDrawer();
      expect(container.read(navigationNotifierProvider).isDrawerOpen, isFalse);
    });

    test('setDrawerOpen sets exact boolean state', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(navigationNotifierProvider.notifier);
      notifier.setDrawerOpen(true);
      expect(container.read(navigationNotifierProvider).isDrawerOpen, isTrue);

      notifier.setDrawerOpen(false);
      expect(container.read(navigationNotifierProvider).isDrawerOpen, isFalse);
    });

    test('NavigationState equality and copyWith works properly', () {
      const state1 = NavigationState(currentBranch: 1, isDrawerOpen: true);
      const state2 = NavigationState(currentBranch: 1, isDrawerOpen: true);
      const state3 = NavigationState(currentBranch: 2, isDrawerOpen: false);

      expect(state1, equals(state2));
      expect(state1.hashCode, equals(state2.hashCode));
      expect(state1, isNot(equals(state3)));

      final copied = state1.copyWith(currentBranch: 3);
      expect(copied.currentBranch, 3);
      expect(copied.isDrawerOpen, isTrue);
    });
  });
}
