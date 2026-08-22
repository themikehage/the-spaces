import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuProgress extends StatelessWidget {
  final double value; // 0 to 100
  final String? label;
  final String variant; // 'bar' | 'circle'
  final bool showPercentage;

  const CuProgress({
    super.key,
    required this.value,
    this.label,
    this.variant = 'bar',
    this.showPercentage = true,
  });

  factory CuProgress.fromJson(Map<String, dynamic> json) {
    final rawVal = json['value'];
    double v = 0.0;
    if (rawVal is num) {
      v = rawVal.toDouble();
    } else if (rawVal is String) {
      v = double.tryParse(rawVal) ?? 0.0;
    }

    return CuProgress(
      value: v,
      label: json['label']?.toString(),
      variant: json['variant']?.toString() ?? 'bar',
      showPercentage: json['showPercentage'] != false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final progress = (value / 100.0).clamp(0.0, 1.0);
    final percentageInt = (progress * 100).round();

    if (variant == 'circle') {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 44,
              height: 44,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 4,
                    backgroundColor: isDark
                        ? AppColors.darkSurface
                        : AppColors.lightSurface,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.primary,
                    ),
                  ),
                  if (showPercentage)
                    Center(
                      child: Text(
                        '$percentageInt%',
                        style: AppTypography.labelSmall.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (label != null && label!.isNotEmpty) ...[
              const SizedBox(width: AppSpacing.md),
              Flexible(
                child: Text(
                  label!,
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.darkForeground
                        : AppColors.lightForeground,
                  ),
                ),
              ),
            ],
          ],
        ),
      );
    }

    // Default: bar
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (label != null && label!.isNotEmpty)
                Text(
                  label!,
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.darkForeground
                        : AppColors.lightForeground,
                  ),
                ),
              if (showPercentage)
                Text(
                  '$percentageInt%',
                  style: AppTypography.labelSmall.copyWith(
                    fontWeight: FontWeight.w700,
                    color: isDark
                        ? AppColors.mutedForeground
                        : AppColors.textSecondaryLight,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: isDark
                  ? AppColors.darkSurface
                  : AppColors.lightSurface,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
