import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/navigation_notifier.dart';
import '../../core/theme/app_theme.dart';
import '../../features/auth/ui/auth_notifier.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  void _navigateTo(BuildContext context, WidgetRef ref, String path) {
    ref.read(navigationNotifierProvider.notifier).closeDrawer();
    Scaffold.maybeOf(context)?.closeDrawer();
    context.push(path);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);

    return Drawer(
      backgroundColor: AppColors.darkBackground,
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppColors.darkBorder),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Spaces',
                          style: AppTypography.titleMedium,
                        ),
                        Text(
                          authState.username ?? 'Workspace',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Secondary navigation items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.md,
                ),
                children: [
                  _DrawerItem(
                    key: const Key('drawer_teams_item'),
                    icon: Icons.groups_outlined,
                    label: 'Teams',
                    onTap: () => _navigateTo(context, ref, '/teams'),
                  ),
                  _DrawerItem(
                    key: const Key('drawer_workflows_item'),
                    icon: Icons.account_tree_outlined,
                    label: 'Workflows',
                    onTap: () => _navigateTo(context, ref, '/workflows'),
                  ),
                  _DrawerItem(
                    key: const Key('drawer_skills_item'),
                    icon: Icons.psychology_outlined,
                    label: 'Skills',
                    onTap: () => _navigateTo(context, ref, '/skills'),
                  ),
                  _DrawerItem(
                    key: const Key('drawer_mcp_item'),
                    icon: Icons.extension_outlined,
                    label: 'MCP Servers',
                    onTap: () => _navigateTo(context, ref, '/mcp'),
                  ),
                  _DrawerItem(
                    key: const Key('drawer_schedules_item'),
                    icon: Icons.schedule_outlined,
                    label: 'Schedules',
                    onTap: () => _navigateTo(context, ref, '/schedules'),
                  ),
                  _DrawerItem(
                    key: const Key('drawer_logs_item'),
                    icon: Icons.receipt_long_outlined,
                    label: 'Logs',
                    onTap: () => _navigateTo(context, ref, '/logs'),
                  ),
                ],
              ),
            ),

            // Footer / Logout
            const Divider(color: AppColors.darkBorder, height: 1),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: ListTile(
                key: const Key('drawer_logout_item'),
                leading: const Icon(
                  Icons.logout,
                  color: AppColors.mutedForeground,
                  size: 20,
                ),
                title: Text(
                  'Sign Out',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                onTap: () {
                  ref.read(navigationNotifierProvider.notifier).closeDrawer();
                  Scaffold.maybeOf(context)?.closeDrawer();
                  ref.read(authNotifierProvider.notifier).logout();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _DrawerItem({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: AppColors.darkForeground,
        size: 20,
      ),
      title: Text(
        label,
        style: AppTypography.bodyMedium.copyWith(
          color: AppColors.darkForeground,
        ),
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      ),
      hoverColor: AppColors.darkSurfaceHover,
      onTap: onTap,
    );
  }
}
