import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/env_var.dart';

class EnvVarListItem extends StatelessWidget {
  final EnvVar envVar;
  final bool isRevealed;
  final VoidCallback onToggleReveal;
  final VoidCallback onDelete;

  const EnvVarListItem({
    super.key,
    required this.envVar,
    required this.isRevealed,
    required this.onToggleReveal,
    required this.onDelete,
  });

  Future<bool?> _confirmDelete(BuildContext context) async {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Variable'),
        content: Text('Are you sure you want to delete "${envVar.key}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.destructive,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key('env_var_${envVar.key}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _confirmDelete(context),
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.lg),
        color: AppColors.destructive.withValues(alpha: 0.8),
        child: const Icon(
          Icons.delete_outline,
          color: AppColors.destructiveForeground,
        ),
      ),
      child: Container(
        margin: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: const Icon(
                Icons.vpn_key_outlined,
                size: 18,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    envVar.key,
                    style: AppTypography.code.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkForeground,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    isRevealed ? envVar.value : '••••••••',
                    style: AppTypography.code.copyWith(
                      color: isRevealed
                          ? AppColors.primary
                          : AppColors.mutedForeground,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            IconButton(
              key: Key('reveal_btn_${envVar.key}'),
              icon: Icon(
                isRevealed
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
                color: isRevealed ? AppColors.primary : AppColors.mutedForeground,
              ),
              tooltip: isRevealed ? 'Hide value' : 'Show value',
              onPressed: onToggleReveal,
            ),
          ],
        ),
      ),
    );
  }
}
