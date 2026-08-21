import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/ui/auth_notifier.dart';
import 'dashboard_notifier.dart';
import 'widgets/dashboard_skeleton.dart';
import 'widgets/project_card.dart';
import 'widgets/session_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardNotifierProvider);
    final authState = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('dashboard_drawer_button'),
          icon: const Icon(Icons.menu),
          tooltip: 'Open menu',
          onPressed: () {
            Scaffold.maybeOf(context)?.openDrawer();
          },
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: AppColors.primary,
                size: 18,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            const Text('Spaces', style: AppTypography.titleLarge),
          ],
        ),
        actions: [
          IconButton(
            key: const Key('dashboard_logout_button'),
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () {
              ref.read(authNotifierProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        key: const Key('dashboard_refresh_indicator'),
        onRefresh: () async {
          await ref.read(dashboardNotifierProvider.notifier).refresh();
        },
        color: AppColors.primary,
        backgroundColor: AppColors.darkCard,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Greeting Banner
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.md,
                  AppSpacing.lg,
                  AppSpacing.sm,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authState.username != null && authState.username!.isNotEmpty
                          ? 'Welcome back, ${authState.username}!'
                          : 'Welcome to Spaces',
                      style: AppTypography.headlineMedium.copyWith(
                        color: AppColors.darkForeground,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'AI-Assisted Cloud Workspace',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Error Banner (if error occurred)
            if (dashboardState.isError)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.sm,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.destructive.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(
                        color: AppColors.destructive.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: AppColors.destructive,
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            dashboardState.error ?? 'An unexpected error occurred',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.destructiveForeground,
                            ),
                          ),
                        ),
                        TextButton(
                          key: const Key('dashboard_retry_button'),
                          onPressed: () {
                            ref.read(dashboardNotifierProvider.notifier).load();
                          },
                          child: Text(
                            'Retry',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Main Content: Skeleton vs Loaded Content
            if (dashboardState.isLoading && dashboardState.sessions.isEmpty && dashboardState.projects.isEmpty)
              const SliverToBoxAdapter(
                child: DashboardSkeleton(),
              )
            else ...[
              // Active Sessions Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.lg,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      Text(
                        'Active Sessions',
                        style: AppTypography.titleLarge.copyWith(
                          color: AppColors.darkForeground,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: dashboardState.hasActiveSessions
                              ? AppColors.success.withValues(alpha: 0.15)
                              : AppColors.darkSurface,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Text(
                          '${dashboardState.sessions.length}',
                          style: AppTypography.labelSmall.copyWith(
                            color: dashboardState.hasActiveSessions
                                ? AppColors.success
                                : AppColors.mutedForeground,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => context.push('/sessions'),
                        child: Text(
                          'View all',
                          style: AppTypography.labelSmall.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Active Sessions Content
              if (!dashboardState.hasActiveSessions)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm,
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      decoration: BoxDecoration(
                        color: AppColors.darkCard,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                        border: Border.all(color: AppColors.darkBorder),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              Icons.play_circle_outline,
                              size: 32,
                              color: AppColors.mutedForeground.withValues(alpha: 0.6),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'No active sessions running',
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final session = dashboardState.sessions[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: SessionCard(session: session),
                        );
                      },
                      childCount: dashboardState.sessions.length,
                    ),
                  ),
                ),

              // Recent Projects Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.xl,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      Text(
                        'Recent Projects',
                        style: AppTypography.titleLarge.copyWith(
                          color: AppColors.darkForeground,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.darkSurface,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Text(
                          '${dashboardState.projects.length}',
                          style: AppTypography.labelSmall.copyWith(
                            color: AppColors.mutedForeground,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => context.push('/projects'),
                        child: Text(
                          'View all',
                          style: AppTypography.labelSmall.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Recent Projects Content
              if (!dashboardState.hasProjects)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm,
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      decoration: BoxDecoration(
                        color: AppColors.darkCard,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                        border: Border.all(color: AppColors.darkBorder),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              Icons.folder_open_outlined,
                              size: 32,
                              color: AppColors.mutedForeground.withValues(alpha: 0.6),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'No projects found in workspace',
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final project = dashboardState.projects[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: ProjectCard(project: project),
                        );
                      },
                      childCount: dashboardState.projects.length,
                    ),
                  ),
                ),

              // Quick Actions Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.xl,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  child: Text(
                    'Quick Actions',
                    style: AppTypography.titleLarge.copyWith(
                      color: AppColors.darkForeground,
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.xxl,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          key: const Key('dashboard_new_session_action'),
                          onPressed: () => context.push('/sessions'),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('New Session'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.md,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: OutlinedButton.icon(
                          key: const Key('dashboard_explore_projects_action'),
                          onPressed: () => context.push('/projects'),
                          icon: const Icon(Icons.explore_outlined, size: 18),
                          label: const Text('Projects'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.darkForeground,
                            side: const BorderSide(color: AppColors.darkBorder),
                            padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.md,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
