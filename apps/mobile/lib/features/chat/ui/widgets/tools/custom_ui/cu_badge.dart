import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuBadge extends StatelessWidget {
  final String text;
  final String variant;

  const CuBadge({
    super.key,
    required this.text,
    this.variant = 'neutral',
  });

  factory CuBadge.fromJson(Map<String, dynamic> json) {
    return CuBadge(
      text: json['text']?.toString() ?? '',
      variant: json['variant']?.toString() ?? 'neutral',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color bg;
    Color border;
    Color fg;

    switch (variant.toLowerCase()) {
      case 'success':
        bg = AppColors.success.withValues(alpha: 0.15);
        border = AppColors.success.withValues(alpha: 0.3);
        fg = AppColors.success;
        break;
      case 'warning':
        bg = AppColors.warning.withValues(alpha: 0.15);
        border = AppColors.warning.withValues(alpha: 0.3);
        fg = AppColors.warning;
        break;
      case 'error':
      case 'destructive':
        bg = AppColors.destructive.withValues(alpha: 0.15);
        border = AppColors.destructive.withValues(alpha: 0.3);
        fg = AppColors.destructive;
        break;
      case 'info':
      case 'primary':
        bg = AppColors.primary.withValues(alpha: 0.15);
        border = AppColors.primary.withValues(alpha: 0.3);
        fg = isDark ? AppColors.chart2Dark : AppColors.chart2Light;
        break;
      case 'neutral':
      default:
        bg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
        border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
        fg = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: border, width: 1),
      ),
      child: Text(
        text,
        style: AppTypography.labelSmall.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
      ),
    );
  }
}
