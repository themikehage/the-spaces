import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import 'workflows_notifier.dart';

class WorkflowsScreen extends ConsumerStatefulWidget {
  const WorkflowsScreen({super.key});

  @override
  ConsumerState<WorkflowsScreen> createState() => _WorkflowsScreenState();
}

class _WorkflowsScreenState extends ConsumerState<WorkflowsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return AppColors.success;
      case 'running':
      case 'active':
        return AppColors.primary;
      case 'error':
      case 'failed':
        return AppColors.destructive;
      case 'cancelled':
      case 'aborted':
        return AppColors.warning;
      default:
        return AppColors.mutedForeground;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workflowsNotifierProvider);
    final workflows = state.filteredWorkflows;
    final canPop = ModalRoute.of(context)?.canPop == true;

    return Scaffold(
      appBar: AppBar(
        leading: canPop
            ? const BackButton()
            : IconButton(
                key: const Key('workflows_drawer_button'),
                icon: const Icon(Icons.menu),
                tooltip: 'Open menu',
                onPressed: () => Scaffold.maybeOf(context)?.openDrawer(),
              ),
        title: const Text('Workflows'),
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              key: const Key('workflows_search_input'),
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search workflows by name or ID...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref
                              .read(workflowsNotifierProvider.notifier)
                              .search('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.darkCard,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: const BorderSide(color: AppColors.darkBorder),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
              ),
              onChanged: (val) {
                ref.read(workflowsNotifierProvider.notifier).search(val);
                setState(() {});
              },
            ),
          ),

          // Content Area
          Expanded(
            child: state.isLoading && workflows.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : state.error != null && workflows.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              state.error!,
                              style: AppTypography.bodyMedium
                                  .copyWith(color: AppColors.destructive),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ElevatedButton(
                              onPressed: () => ref
                                  .read(workflowsNotifierProvider.notifier)
                                  .load(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : workflows.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.account_tree_outlined,
                                  size: 48,
                                  color: AppColors.mutedForeground,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'No workflows found',
                                  style: AppTypography.titleMedium.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Create workflow definitions on the web client',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => ref
                                .read(workflowsNotifierProvider.notifier)
                                .load(),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              itemCount: workflows.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final wf = workflows[index];
                                final statusColor =
                                    _getStatusColor(wf.lastRunStatus);

                                return InkWell(
                                  key: Key('workflow_item_${wf.id}'),
                                  onTap: () {
                                    context.push('/workflows/${wf.id}');
                                  },
                                  borderRadius: BorderRadius.circular(
                                      AppSpacing.radiusLg),
                                  child: Container(
                                    padding:
                                        const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: AppColors.darkCard,
                                      borderRadius: BorderRadius.circular(
                                          AppSpacing.radiusLg),
                                      border: Border.all(
                                          color: AppColors.darkBorder),
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(
                                              AppSpacing.sm),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary
                                                .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.circular(
                                                    AppSpacing.radiusMd),
                                          ),
                                          child: const Icon(
                                            Icons.account_tree_outlined,
                                            color: AppColors.primary,
                                            size: 24,
                                          ),
                                        ),
                                        const SizedBox(width: AppSpacing.md),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      wf.name,
                                                      style: AppTypography
                                                          .titleSmall
                                                          .copyWith(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        color: AppColors
                                                            .darkForeground,
                                                      ),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  if (wf.lastRunStatus !=
                                                      null) ...[
                                                    Container(
                                                      padding: const EdgeInsets
                                                          .symmetric(
                                                        horizontal: 6,
                                                        vertical: 2,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color: statusColor
                                                            .withValues(
                                                                alpha: 0.15),
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(
                                                                    AppSpacing
                                                                        .radiusFull),
                                                        border: Border.all(
                                                          color: statusColor
                                                              .withValues(
                                                                  alpha: 0.3),
                                                        ),
                                                      ),
                                                      child: Text(
                                                        wf.lastRunStatus!
                                                            .toUpperCase(),
                                                        style: AppTypography
                                                            .bodySmall
                                                            .copyWith(
                                                          fontSize: 9,
                                                          color: statusColor,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              if (wf.description != null &&
                                                  wf.description!.isNotEmpty) ...[
                                                const SizedBox(
                                                    height: AppSpacing.xs),
                                                Text(
                                                  wf.description!,
                                                  style: AppTypography
                                                      .bodySmall
                                                      .copyWith(
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  maxLines: 2,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ],
                                              const SizedBox(
                                                  height: AppSpacing.sm),
                                              Row(
                                                children: [
                                                  const Icon(
                                                    Icons.linear_scale,
                                                    size: 14,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    '${wf.steps.length} steps',
                                                    style: AppTypography
                                                        .bodySmall
                                                        .copyWith(
                                                      fontSize: 11,
                                                      color: AppColors
                                                          .mutedForeground,
                                                    ),
                                                  ),
                                                  const SizedBox(
                                                      width: AppSpacing.md),
                                                  const Icon(
                                                    Icons.error_outline,
                                                    size: 14,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    'On error: ${wf.onError}',
                                                    style: AppTypography
                                                        .bodySmall
                                                        .copyWith(
                                                      fontSize: 11,
                                                      color: AppColors
                                                          .mutedForeground,
                                                    ),
                                                  ),
                                                  const Spacer(),
                                                  const Icon(
                                                    Icons.chevron_right,
                                                    size: 18,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
