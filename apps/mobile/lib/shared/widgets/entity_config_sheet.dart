import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'entity_config_editor.dart';

class EntityConfigSheet extends StatelessWidget {
  final String entityType;
  final String entityId;
  final String? entityName;
  final VoidCallback? onSave;
  final VoidCallback? onDelete;

  const EntityConfigSheet({
    super.key,
    required this.entityType,
    required this.entityId,
    this.entityName,
    this.onSave,
    this.onDelete,
  });

  static Future<void> show(
    BuildContext context, {
    required String entityType,
    required String entityId,
    String? entityName,
    VoidCallback? onSave,
    VoidCallback? onDelete,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EntityConfigSheet(
        entityType: entityType,
        entityId: entityId,
        entityName: entityName,
        onSave: onSave,
        onDelete: onDelete,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.mutedForeground.withValues(alpha: 0.3)
                    : AppColors.textSecondaryLight.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entityName ?? '${entityType == "agent" ? "Agent" : "Project"} Configuration',
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Edit model, instructions, and tools',
                        style: AppTypography.bodySmall.copyWith(
                          color: isDark
                              ? AppColors.mutedForeground
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onDelete != null)
                  IconButton(
                    key: const Key('entity_config_sheet_delete_button'),
                    icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                    tooltip: 'Delete',
                    onPressed: () {
                      Navigator.of(context).pop();
                      onDelete?.call();
                    },
                  ),
                IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          const Divider(),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: EntityConfigEditor(
                entityType: entityType,
                entityId: entityId,
                title: '${entityType == "agent" ? "Agent" : "Project"} Settings',
                onSave: onSave,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
