import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/workspace_file.dart';
import '../../data/workspace_repository.dart';
import 'file_preview_sheet.dart';
import 'image_lightbox.dart';

class WorkspaceFileItem extends ConsumerWidget {
  final WorkspaceFile file;
  final String? entityType;
  final String? entityId;
  final VoidCallback? onTap;

  const WorkspaceFileItem({
    super.key,
    required this.file,
    this.entityType,
    this.entityId,
    this.onTap,
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

  String _formatDate(DateTime? dt) {
    if (dt == null) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final month = months[dt.month - 1];
    return '$month ${dt.day}';
  }

  Future<void> _handleTap(BuildContext context, WidgetRef ref) async {
    if (onTap != null) {
      onTap!();
      return;
    }

    if (entityType == null || entityId == null) return;

    if (file.isText) {
      await FilePreviewSheet.show(
        context,
        file: file,
        entityType: entityType!,
        entityId: entityId!,
      );
    } else if (file.isImage) {
      final repository = ref.read(workspaceRepositoryProvider);
      final imageUrl = repository.getImageUrl(
        entityType: entityType!,
        entityId: entityId!,
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
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final icon = _getIcon();
    final iconColor = _getIconColor(isDark);
    final dateStr = _formatDate(file.modifiedAt);

    return InkWell(
      onTap: () => _handleTap(context, ref),
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isDark
                ? AppColors.darkBorder.withValues(alpha: 0.5)
                : AppColors.lightBorder.withValues(alpha: 0.8),
          ),
          color: isDark
              ? AppColors.darkCard.withValues(alpha: 0.4)
              : AppColors.lightCard,
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: 20,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    file.name,
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? AppColors.darkForeground
                          : AppColors.lightForeground,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (file.path != file.name && file.path.isNotEmpty) ...[
                        Flexible(
                          child: Text(
                            file.path,
                            style: AppTypography.labelSmall.copyWith(
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '•',
                          style: AppTypography.labelSmall.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                      ],
                      if (!file.isDirectory && file.sizeFormatted.isNotEmpty) ...[
                        Text(
                          file.sizeFormatted,
                          style: AppTypography.labelSmall.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                      if (dateStr.isNotEmpty) ...[
                        if (!file.isDirectory && file.sizeFormatted.isNotEmpty) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            '•',
                            style: AppTypography.labelSmall.copyWith(
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                        ],
                        Text(
                          dateStr,
                          style: AppTypography.labelSmall.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 18,
              color: isDark
                  ? AppColors.mutedForeground.withValues(alpha: 0.5)
                  : AppColors.textSecondaryLight.withValues(alpha: 0.5),
            ),
          ],
        ),
      ),
    );
  }
}
