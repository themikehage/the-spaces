import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../controllers/autocomplete_controller.dart';
import '../../models/autocomplete_item.dart';

class AutocompletePopover extends StatelessWidget {
  final AutocompleteController controller;
  final ValueChanged<AutocompleteItem> onSelectItem;
  final VoidCallback? onDismiss;

  const AutocompletePopover({
    super.key,
    required this.controller,
    required this.onSelectItem,
    this.onDismiss,
  });

  IconData _getIconForKind(AutocompleteKind kind) {
    switch (kind) {
      case AutocompleteKind.tool:
        return Icons.build_outlined;
      case AutocompleteKind.skill:
        return Icons.bolt_outlined;
      case AutocompleteKind.agent:
        return Icons.smart_toy_outlined;
      case AutocompleteKind.project:
        return Icons.folder_outlined;
    }
  }

  Color _getColorForKind(AutocompleteKind kind) {
    switch (kind) {
      case AutocompleteKind.tool:
        return AppColors.primary;
      case AutocompleteKind.skill:
        return AppColors.warning;
      case AutocompleteKind.agent:
        return AppColors.success;
      case AutocompleteKind.project:
        return AppColors.fileTs;
    }
  }

  String _getBadgeLabel(AutocompleteKind kind) {
    switch (kind) {
      case AutocompleteKind.tool:
        return 'TOOL';
      case AutocompleteKind.skill:
        return 'SKILL';
      case AutocompleteKind.agent:
        return 'AGENT';
      case AutocompleteKind.project:
        return 'PROJECT';
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        if (!controller.isVisible || controller.items.isEmpty) {
          return const SizedBox.shrink();
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;
        final bg = isDark ? AppColors.darkCard : AppColors.lightCard;
        final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
        final items = controller.items;

        return Container(
          constraints: const BoxConstraints(maxHeight: 260),
          margin: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.4)
                    : Colors.black.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
              itemCount: items.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: borderColor),
              itemBuilder: (context, index) {
                final item = items[index];
                final isSelected = index == controller.selectedIndex;
                final kindColor = _getColorForKind(item.kind);

                return Material(
                  color: isSelected
                      ? (isDark
                          ? AppColors.primary.withValues(alpha: 0.15)
                          : AppColors.primary.withValues(alpha: 0.08))
                      : Colors.transparent,
                  child: InkWell(
                    key: Key('autocomplete_item_${item.value}'),
                    onTap: () => onSelectItem(item),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: kindColor.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                              border: Border.all(
                                color: kindColor.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Icon(
                              _getIconForKind(item.kind),
                              size: 16,
                              color: kindColor,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      '${item.trigger}${item.label}',
                                      style: AppTypography.bodyMedium.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: isDark
                                            ? AppColors.darkForeground
                                            : AppColors.lightForeground,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.xs),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 5,
                                        vertical: 1,
                                      ),
                                      decoration: BoxDecoration(
                                        color: kindColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                      ),
                                      child: Text(
                                        _getBadgeLabel(item.kind),
                                        style: AppTypography.labelSmall.copyWith(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: kindColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (item.description != null && item.description!.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    item.description!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.bodySmall.copyWith(
                                      fontSize: 11,
                                      color: isDark
                                          ? AppColors.mutedForeground
                                          : AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (isSelected)
                            Icon(
                              Icons.keyboard_return,
                              size: 16,
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}
