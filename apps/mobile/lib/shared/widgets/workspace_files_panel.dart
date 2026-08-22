import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../features/workspace/data/models/workspace_file.dart';
import '../../features/workspace/ui/widgets/workspace_action_dialogs.dart';
import '../../features/workspace/ui/widgets/workspace_search_bar.dart';
import '../../features/workspace/ui/widgets/workspace_tree_node.dart';
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

  Future<void> _handleCreateNode({required bool isFolder}) async {
    final newPath = await WorkspaceActionDialogs.showCreateNodeDialog(
      context,
      isFolder: isFolder,
    );

    if (newPath != null && newPath.isNotEmpty) {
      final args = WorkspaceArgs(
        entityType: widget.entityType,
        entityId: widget.entityId,
      );
      final notifier = ref.read(workspaceNotifierProvider(args).notifier);
      final success = isFolder
          ? await notifier.createFolder(newPath)
          : await notifier.createFile(newPath);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Created "${newPath.split('/').last}"'),
              backgroundColor: AppColors.success,
              duration: const Duration(seconds: 2),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to create ${isFolder ? 'folder' : 'file'}'),
              backgroundColor: AppColors.destructive,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
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
                PopupMenuButton<String>(
                  icon: const Icon(Icons.add, size: 20, color: AppColors.primary),
                  tooltip: 'Add file or folder',
                  onSelected: (val) {
                    if (val == 'file') {
                      _handleCreateNode(isFolder: false);
                    } else if (val == 'folder') {
                      _handleCreateNode(isFolder: true);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'file',
                      child: Row(
                        children: [
                          Icon(Icons.note_add_outlined, size: 18, color: AppColors.primary),
                          SizedBox(width: AppSpacing.sm),
                          Text('New File'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'folder',
                      child: Row(
                        children: [
                          Icon(Icons.create_new_folder_outlined, size: 18, color: AppColors.primary),
                          SizedBox(width: AppSpacing.sm),
                          Text('New Folder'),
                        ],
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: state.isLoading ? null : () => notifier.refresh(),
                  icon: const Icon(Icons.refresh, size: 18),
                  tooltip: 'Refresh',
                  visualDensity: VisualDensity.compact,
                  color: AppColors.primary,
                ),
              ],
            ),
          ),

          // Search Bar
          WorkspaceSearchBar(
            controller: _searchController,
            onChanged: (val) => notifier.setQuery(val),
            onClear: () {
              _searchController.clear();
              notifier.setQuery('');
              setState(() {});
            },
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
              const SizedBox(height: AppSpacing.md),
              ElevatedButton.icon(
                onPressed: () => _handleCreateNode(isFolder: false),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Create File'),
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

    final isSearching = state.query.trim().isNotEmpty;
    final displayFiles = isSearching ? state.filteredFiles : state.files;

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
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
        itemCount: displayFiles.length,
        itemBuilder: (context, index) {
          final file = displayFiles[index];
          return WorkspaceTreeNode(
            key: ValueKey('workspace_node_${file.path}'),
            file: file,
            entityType: widget.entityType,
            entityId: widget.entityId,
            depth: isSearching ? 0 : 0,
            onFileTap: widget.onFileTap,
          );
        },
      ),
    );
  }
}
