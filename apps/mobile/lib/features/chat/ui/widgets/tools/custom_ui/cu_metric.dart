import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuMetric extends StatelessWidget {
  final String label;
  final String value;
  final String? trend;
  final String? subtitle;

  const CuMetric({
    super.key,
    required this.label,
    required this.value,
    this.trend,
    this.subtitle,
  });

  factory CuMetric.fromJson(Map<String, dynamic> json) {
    return CuMetric(
      label: json['label']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
      trend: json['trend']?.toString(),
      subtitle: json['subtitle']?.toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    Color? trendColor;
    IconData? trendIcon;

    if (trend != null) {
      switch (trend!.toLowerCase()) {
        case 'up':
          trendColor = AppColors.success;
          trendIcon = Icons.arrow_upward_rounded;
          break;
        case 'down':
          trendColor = AppColors.destructive;
          trendIcon = Icons.arrow_downward_rounded;
          break;
        case 'neutral':
        default:
          trendColor = isDark
              ? AppColors.mutedForeground
              : AppColors.textSecondaryLight;
          trendIcon = Icons.remove_rounded;
          break;
      }
    }

    return Container(
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
          Text(
            label.toUpperCase(),
            style: AppTypography.labelSmall.copyWith(
              color: isDark
                  ? AppColors.mutedForeground
                  : AppColors.textSecondaryLight,
              fontWeight: FontWeight.w600,
              fontSize: 10,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: AppTypography.headlineMedium.copyWith(
                    color: isDark
                        ? AppColors.darkForeground
                        : AppColors.lightForeground,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (trendIcon != null) ...[
                const SizedBox(width: AppSpacing.xs),
                Icon(trendIcon, size: 16, color: trendColor),
              ],
            ],
          ),
          if (subtitle != null && subtitle!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              style: AppTypography.labelSmall.copyWith(
                color: isDark
                    ? AppColors.mutedForeground
                    : AppColors.textSecondaryLight,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
