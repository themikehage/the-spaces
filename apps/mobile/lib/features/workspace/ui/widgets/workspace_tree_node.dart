import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/workspace_file.dart';
import '../../data/workspace_repository.dart';
import '../workspace_notifier.dart';
import 'file_preview_sheet.dart';
import 'image_lightbox.dart';
import 'workspace_action_dialogs.dart';
import 'workspace_file_editor.dart';

class WorkspaceTreeNode extends ConsumerWidget {
  final WorkspaceFile file;
  final String entityType;
  final String entityId;
  final int depth;
  final void Function(WorkspaceFile file)? onFileTap;

  const WorkspaceTreeNode({
    super.key,
    required this.file,
    required this.entityType,
    required this.entityId,
    this.depth = 0,
    this.onFileTap,
  });

  IconData _getIcon() {
    if (file.isDirectory) {
      return Icons.folder_outlined;
    }
    if (file.isImage) {
      return Icons.image_outlined;
    }
    if (file.isText) {
      return Icons.description_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  Color _getIconColor(bool isDark) {
    if (file.isDirectory) {
      return AppColors.warning;
    }
    if (file.isImage) {
      return AppColors.fileTs;
    }
    if (file.isText) {
      return AppColors.primary;
    }
    return isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
  }

  Future<void> _handleFileTap(BuildContext context, WidgetRef ref) async {
    if (onFileTap != null) {
      onFileTap!(file);
      return;
    }

    if (file.isText) {
      await WorkspaceFileEditor.open(
        context,
        file: file,
        entityType: entityType,
        entityId: entityId,
      );
    } else if (file.isImage) {
      final repository = ref.read(workspaceRepositoryProvider);
      final imageUrl = repository.getImageUrl(
        entityType: entityType,
        entityId: entityId,
        path: file.path,
      );
      final token = await repository.getAuthToken();

      if (context.mounted) {
        await ImageLightbox.show(
          context,
          imageUrl: imageUrl,
          fileName: file.name,
          authToken: token,
        );
      }
    } else {
      await FilePreviewSheet.show(
        context,
        file: file,
        entityType: entityType,
        entityId: entityId,
      );
    }
  }

  Future<void> _handleDownload(BuildContext context, WidgetRef ref) async {
    final args = WorkspaceArgs(entityType: entityType, entityId: entityId);
    final notifier = ref.read(workspaceNotifierProvider(args).notifier);
    final bytes = await notifier.downloadFile(file.path);

    if (context.mounted) {
      if (bytes.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Downloaded "${file.name}" (${file.sizeFormatted})'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download "${file.name}"'),
            backgroundColor: AppColors.destructive,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _handleRename(BuildContext context, WidgetRef ref) async {
    final newPath = await WorkspaceActionDialogs.showRenameDialog(context, file: file);
    if (newPath != null && newPath.isNotEmpty && newPath != file.path) {
      final args = WorkspaceArgs(entityType: entityType, entityId: entityId);
      final success = await ref
          .read(workspaceNotifierProvider(args).notifier)
          .renameFile(file.path, newPath);

      if (context.mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Renamed to "${newPath.split('/').last}"'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _handleDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await WorkspaceActionDialogs.showDeleteConfirmDialog(context, file: file);
    if (confirmed) {
      final args = WorkspaceArgs(entityType: entityType, entityId: entityId);
      final success = await ref
          .read(workspaceNotifierProvider(args).notifier)
          .deleteFile(file.path);

      if (context.mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Deleted "${file.name}"'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _handleAddInsideFolder(BuildContext context, WidgetRef ref, {required bool isFolder}) async {
    final newPath = await WorkspaceActionDialogs.showCreateNodeDialog(
      context,
      isFolder: isFolder,
      parentPath: file.path,
    );
    if (newPath != null && newPath.isNotEmpty) {
      final args = WorkspaceArgs(entityType: entityType, entityId: entityId);
      final notifier = ref.read(workspaceNotifierProvider(args).notifier);
      final success = isFolder
          ? await notifier.createFolder(newPath)
          : await notifier.createFile(newPath);

      if (context.mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Created "${newPath.split('/').last}"'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  void _showFolderActions(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Row(
                  children: [
                    const Icon(Icons.folder_outlined, color: AppColors.warning, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        file.name,
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.note_add_outlined, color: AppColors.primary),
                title: const Text('New File inside'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _handleAddInsideFolder(context, ref, isFolder: false);
                },
              ),
              ListTile(
                leading: const Icon(Icons.create_new_folder_outlined, color: AppColors.primary),
                title: const Text('New Folder inside'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _handleAddInsideFolder(context, ref, isFolder: true);
                },
              ),
              ListTile(
                leading: const Icon(Icons.drive_file_rename_outline, color: AppColors.primary),
                title: const Text('Rename Folder'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _handleRename(context, ref);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: AppColors.destructive),
                title: const Text(
                  'Delete Folder',
                  style: TextStyle(color: AppColors.destructive, fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _handleDelete(context, ref);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final args = WorkspaceArgs(entityType: entityType, entityId: entityId);
    final state = ref.watch(workspaceNotifierProvider(args));
    final notifier = ref.read(workspaceNotifierProvider(args).notifier);

    final isExpanded = state.isExpanded(file.path);
    final isLoading = state.isPathLoading(file.path);
    final children = state.getChildren(file.path);

    final icon = _getIcon();
    final iconColor = _getIconColor(isDark);
    final indent = depth * 16.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: () {
            if (file.isDirectory) {
              notifier.toggleFolder(file.path);
            } else {
              _handleFileTap(context, ref);
            }
          },
          onLongPress: () {
            if (file.isDirectory) {
              _showFolderActions(context, ref);
            } else {
              WorkspaceActionDialogs.showFileActionSheet(
                context,
                file: file,
                onRename: () => _handleRename(context, ref),
                onDelete: () => _handleDelete(context, ref),
                onDownload: () => _handleDownload(context, ref),
                onEdit: file.isText
                    ? () => WorkspaceFileEditor.open(
                          context,
                          file: file,
                          entityType: entityType,
                          entityId: entityId,
                        )
                    : null,
              );
            }
          },
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: Container(
            padding: EdgeInsets.only(
              left: AppSpacing.sm + indent,
              right: AppSpacing.sm,
              top: AppSpacing.xs + 2,
              bottom: AppSpacing.xs + 2,
            ),
            margin: const EdgeInsets.symmetric(vertical: 1),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              color: isDark
                  ? AppColors.darkCard.withValues(alpha: 0.3)
                  : AppColors.lightCard,
            ),
            child: Row(
              children: [
                if (file.isDirectory)
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: isLoading
                        ? const Center(
                            child: SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                            ),
                          )
                        : Icon(
                            isExpanded ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_right,
                            size: 18,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                  )
                else
                  const SizedBox(width: 20),
                const SizedBox(width: AppSpacing.xs),
                Icon(icon, color: iconColor, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    file.name,
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight: file.isDirectory ? FontWeight.w600 : FontWeight.w500,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (!file.isDirectory && file.sizeFormatted.isNotEmpty) ...[
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    file.sizeFormatted,
                    style: AppTypography.labelSmall.copyWith(
                      color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    ),
                  ),
                ],
                IconButton(
                  icon: const Icon(Icons.more_vert, size: 16),
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                  onPressed: () {
                    if (file.isDirectory) {
                      _showFolderActions(context, ref);
                    } else {
                      WorkspaceActionDialogs.showFileActionSheet(
                        context,
                        file: file,
                        onRename: () => _handleRename(context, ref),
                        onDelete: () => _handleDelete(context, ref),
                        onDownload: () => _handleDownload(context, ref),
                        onEdit: file.isText
                            ? () => WorkspaceFileEditor.open(
                                  context,
                                  file: file,
                                  entityType: entityType,
                                  entityId: entityId,
                                )
                            : null,
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        ),
        if (file.isDirectory && isExpanded) ...[
          if (children.isEmpty && !isLoading)
            Padding(
              padding: EdgeInsets.only(left: AppSpacing.xxl + indent, top: 4, bottom: 4),
              child: Text(
                'Empty folder',
                style: AppTypography.labelSmall.copyWith(
                  fontStyle: FontStyle.italic,
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            )
          else
            ...children.map(
              (child) => WorkspaceTreeNode(
                key: ValueKey('tree_node_${child.path}'),
                file: child,
                entityType: entityType,
                entityId: entityId,
                depth: depth + 1,
                onFileTap: onFileTap,
              ),
            ),
        ],
      ],
    );
  }
}
