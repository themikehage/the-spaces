import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class CompactButton extends StatelessWidget {
  final VoidCallback onCompact;
  final bool isLoading;

  const CompactButton({
    super.key,
    required this.onCompact,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: const Key('compact_context_button'),
      onTap: isLoading ? null : onCompact,
      borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: 3.0,
        ),
        decoration: BoxDecoration(
          color: AppColors.destructive.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          border: Border.all(
            color: AppColors.destructive.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  color: AppColors.destructive,
                ),
              )
            else
              const Icon(
                Icons.compress,
                size: 13,
                color: AppColors.destructive,
              ),
            const SizedBox(width: 4),
            Text(
              'Compact',
              style: AppTypography.labelSmall.copyWith(
                color: AppColors.destructive,
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
