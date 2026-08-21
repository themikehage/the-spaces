import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/navigation_notifier.dart';
import '../../core/theme/app_theme.dart';
import '../../features/attention/ui/attention_notifier.dart';
import 'app_drawer.dart';
import 'attention_badge.dart';

class AppShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const AppShell({
    super.key,
    required this.navigationShell,
  });

  void _onDestinationSelected(WidgetRef ref, int index) {
    ref.read(navigationNotifierProvider.notifier).selectBranch(index);
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attentionState = ref.watch(attentionNotifierProvider);

    return Scaffold(
      drawer: const AppDrawer(),
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AppColors.darkBorder, width: 1),
          ),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => _onDestinationSelected(ref, index),
          backgroundColor: AppColors.darkBackground,
          indicatorColor: AppColors.primary.withValues(alpha: 0.2),
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            const NavigationDestination(
              key: Key('shell_nav_dashboard'),
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard, color: AppColors.primary),
              label: 'Dashboard',
            ),
            NavigationDestination(
              key: const Key('shell_nav_sessions'),
              icon: AttentionBadge(
                count: attentionState.pendingCount,
                child: const Icon(Icons.chat_bubble_outline),
              ),
              selectedIcon: AttentionBadge(
                count: attentionState.pendingCount,
                child: const Icon(Icons.chat_bubble, color: AppColors.primary),
              ),
              label: 'Sessions',
            ),
            const NavigationDestination(
              key: Key('shell_nav_projects'),
              icon: Icon(Icons.folder_outlined),
              selectedIcon: Icon(Icons.folder, color: AppColors.primary),
              label: 'Projects',
            ),
            const NavigationDestination(
              key: Key('shell_nav_agents'),
              icon: Icon(Icons.smart_toy_outlined),
              selectedIcon: Icon(Icons.smart_toy, color: AppColors.primary),
              label: 'Agents',
            ),
            const NavigationDestination(
              key: Key('shell_nav_settings'),
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings, color: AppColors.primary),
              label: 'Settings',
            ),
          ],
        ),
      ),
    );
  }
}
