import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../features/workspace/data/models/workspace_file.dart';
import '../../features/workspace/ui/widgets/workspace_file_item.dart';
import '../../features/workspace/ui/workspace_notifier.dart';
import 'skeletons/skeleton_list.dart';

class WorkspaceFilesPanel extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final String? entityName;
  final void Function(WorkspaceFile file)? onFileTap;

  const WorkspaceFilesPanel({
    super.key,
    required this.entityType,
    required this.entityId,
    this.entityName,
    this.onFileTap,
  });

  @override
  ConsumerState<WorkspaceFilesPanel> createState() => _WorkspaceFilesPanelState();
}

class _WorkspaceFilesPanelState extends ConsumerState<WorkspaceFilesPanel> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final args = WorkspaceArgs(
      entityType: widget.entityType,
      entityId: widget.entityId,
    );
    final state = ref.watch(workspaceNotifierProvider(args));
    final notifier = ref.read(workspaceNotifierProvider(args).notifier);

    return Container(
      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      child: Column(
        children: [
          // TopBar of Workspace panel
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard : AppColors.lightCard,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.folder_open_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Workspace Files',
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                ),
                if (!state.isLoading && state.files.isNotEmpty) ...[
                  const SizedBox(width: AppSpacing.xs),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Text(
                      '${state.files.length}',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                TextButton.icon(
                  onPressed: state.isLoading ? null : () => notifier.refresh(),
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Refresh'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => notifier.setQuery(val),
              style: AppTypography.bodyMedium.copyWith(
                color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              ),
              decoration: InputDecoration(
                hintText: 'Search files...',
                hintStyle: AppTypography.bodyMedium.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
                prefixIcon: Icon(
                  Icons.search,
                  size: 20,
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          notifier.setQuery('');
                          setState(() {});
                        },
                      )
                    : null,
                filled: true,
                fillColor: isDark
                    ? AppColors.darkCard.withValues(alpha: 0.6)
                    : AppColors.lightCard,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ),

          // Main body content
          Expanded(
            child: _buildBody(context, state, notifier, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WorkspaceState state,
    WorkspaceNotifier notifier,
    bool isDark,
  ) {
    if (state.isLoading && state.files.isEmpty) {
      return const SingleChildScrollView(
        child: SkeletonList(itemCount: 8),
      );
    }

    if (state.error != null && state.files.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: AppColors.destructive,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Failed to load files',
                style: AppTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                state.error!,
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: () => notifier.refresh(),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.primaryForeground,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (state.files.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.folder_open_outlined,
                  size: 32,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'No files in workspace',
                style: AppTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Files generated or added in this workspace will appear here.',
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final displayFiles = state.filteredFiles;

    if (displayFiles.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.search_off,
                size: 48,
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'No matching files',
                style: AppTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Try a different search query.',
                style: AppTypography.bodySmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => notifier.refresh(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        itemCount: displayFiles.length,
        itemBuilder: (context, index) {
          final file = displayFiles[index];
          return WorkspaceFileItem(
            key: ValueKey('workspace_file_${file.path}'),
            file: file,
            onTap: widget.onFileTap != null ? () => widget.onFileTap!(file) : null,
          );
        },
      ),
    );
  }
}
