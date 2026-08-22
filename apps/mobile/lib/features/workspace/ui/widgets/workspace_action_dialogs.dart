import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/workspace_file.dart';

class WorkspaceActionDialogs {
  WorkspaceActionDialogs._();

  static Future<String?> showCreateNodeDialog(
    BuildContext context, {
    required bool isFolder,
    String? parentPath,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final prefix = parentPath != null && parentPath.isNotEmpty ? '$parentPath/' : '';
    final title = isFolder ? 'Create Folder' : 'Create File';

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            side: BorderSide(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          title: Row(
            children: [
              Icon(
                isFolder ? Icons.create_new_folder_outlined : Icons.note_add_outlined,
                color: AppColors.primary,
                size: 22,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                title,
                style: AppTypography.titleLarge.copyWith(
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (prefix.isNotEmpty) ...[
                  Text(
                    'Location: $prefix',
                    style: AppTypography.labelSmall.copyWith(
                      color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                TextFormField(
                  controller: controller,
                  autofocus: true,
                  style: AppTypography.bodyMedium.copyWith(
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                  decoration: InputDecoration(
                    labelText: isFolder ? 'Folder Name' : 'File Name',
                    hintText: isFolder ? 'e.g. components' : 'e.g. index.ts',
                    filled: true,
                    fillColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
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
                  validator: (val) {
                    final trimmed = val?.trim() ?? '';
                    if (trimmed.isEmpty) {
                      return 'Please enter a name';
                    }
                    if (trimmed.contains('..') || trimmed.startsWith('/') || trimmed.startsWith('\\')) {
                      return 'Invalid path format';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState?.validate() == true) {
                  final entered = controller.text.trim();
                  final fullPath = prefix.isNotEmpty ? '$prefix$entered' : entered;
                  Navigator.of(ctx).pop(fullPath);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.primaryForeground,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
              ),
              child: const Text('Create'),
            ),
          ],
        );
      },
    );

    controller.dispose();
    return result;
  }

  static Future<String?> showRenameDialog(
    BuildContext context, {
    required WorkspaceFile file,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController(text: file.name);
    final formKey = GlobalKey<FormState>();

    final cleanPath = file.path.replaceAll(RegExp(r'^[/\\]+'), '');
    final lastSlash = cleanPath.lastIndexOf('/');
    final parentPrefix = lastSlash == -1 ? '' : '${cleanPath.substring(0, lastSlash)}/';

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            side: BorderSide(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          title: Row(
            children: [
              const Icon(
                Icons.drive_file_rename_outline,
                color: AppColors.primary,
                size: 22,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                file.isDirectory ? 'Rename Folder' : 'Rename File',
                style: AppTypography.titleLarge.copyWith(
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
            ],
          ),
          content: Form(
            key: formKey,
            child: TextFormField(
              controller: controller,
              autofocus: true,
              style: AppTypography.bodyMedium.copyWith(
                color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              ),
              decoration: InputDecoration(
                labelText: 'New Name',
                filled: true,
                fillColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
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
              validator: (val) {
                final trimmed = val?.trim() ?? '';
                if (trimmed.isEmpty) {
                  return 'Please enter a name';
                }
                if (trimmed == file.name) {
                  return 'Name has not changed';
                }
                if (trimmed.contains('..') || trimmed.contains('/') || trimmed.contains('\\')) {
                  return 'Filename only, without slashes';
                }
                return null;
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState?.validate() == true) {
                  final newName = controller.text.trim();
                  final newFullPath = '$parentPrefix$newName';
                  Navigator.of(ctx).pop(newFullPath);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.primaryForeground,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
              ),
              child: const Text('Rename'),
            ),
          ],
        );
      },
    );

    controller.dispose();
    return result;
  }

  static Future<bool> showDeleteConfirmDialog(
    BuildContext context, {
    required WorkspaceFile file,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            side: BorderSide(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          title: Row(
            children: [
              const Icon(
                Icons.delete_forever_outlined,
                color: AppColors.destructive,
                size: 24,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                file.isDirectory ? 'Delete Folder' : 'Delete File',
                style: AppTypography.titleLarge.copyWith(
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
            ],
          ),
          content: Text(
            'Are you sure you want to delete "${file.name}"? '
            '${file.isDirectory ? 'All contents inside this folder will be deleted.' : 'This action cannot be undone.'}',
            style: AppTypography.bodyMedium.copyWith(
              color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.destructive,
                foregroundColor: AppColors.destructiveForeground,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
              ),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  static Future<void> showFileActionSheet(
    BuildContext context, {
    required WorkspaceFile file,
    required VoidCallback onRename,
    required VoidCallback onDelete,
    required VoidCallback onDownload,
    VoidCallback? onEdit,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (ctx) {
        return SafeArea(
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
                      Icon(
                        file.isDirectory ? Icons.folder_outlined : Icons.description_outlined,
                        color: file.isDirectory ? AppColors.warning : AppColors.primary,
                        size: 20,
                      ),
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
                if (onEdit != null && file.isText)
                  ListTile(
                    leading: const Icon(Icons.edit_outlined, color: AppColors.primary),
                    title: const Text('Edit File'),
                    onTap: () {
                      Navigator.of(ctx).pop();
                      onEdit();
                    },
                  ),
                if (!file.isDirectory)
                  ListTile(
                    leading: const Icon(Icons.download_outlined, color: AppColors.primary),
                    title: const Text('Download File'),
                    onTap: () {
                      Navigator.of(ctx).pop();
                      onDownload();
                    },
                  ),
                ListTile(
                  leading: const Icon(Icons.drive_file_rename_outline, color: AppColors.primary),
                  title: const Text('Rename'),
                  onTap: () {
                    Navigator.of(ctx).pop();
                    onRename();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: AppColors.destructive),
                  title: const Text(
                    'Delete',
                    style: TextStyle(color: AppColors.destructive, fontWeight: FontWeight.w600),
                  ),
                  onTap: () {
                    Navigator.of(ctx).pop();
                    onDelete();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
