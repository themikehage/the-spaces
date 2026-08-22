import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuSteps extends StatelessWidget {
  final List<Map<String, dynamic>> steps;
  final String direction; // 'horizontal' | 'vertical'

  const CuSteps({
    super.key,
    required this.steps,
    this.direction = 'vertical',
  });

  factory CuSteps.fromJson(Map<String, dynamic> json) {
    final rawSteps = json['steps'];
    final stepsList = <Map<String, dynamic>>[];
    if (rawSteps is List) {
      for (final s in rawSteps) {
        if (s is Map) {
          stepsList.add(Map<String, dynamic>.from(s));
        }
      }
    }

    return CuSteps(
      steps: stepsList,
      direction: json['direction']?.toString() ?? 'vertical',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final isHorizontal = direction == 'horizontal';

    if (isHorizontal) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: border),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: steps.asMap().entries.map((entry) {
              final idx = entry.key;
              final step = entry.value;
              final isLast = idx == steps.length - 1;
              final status = step['status']?.toString().toLowerCase() ?? 'pending';
              final label = step['label']?.toString() ?? 'Step ${idx + 1}';
              final description = step['description']?.toString();

              final stepConfig = _getStatusConfig(status, isDark);

              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: stepConfig.bg,
                          border: Border.all(color: stepConfig.border, width: 1.5),
                        ),
                        child: Center(child: stepConfig.icon),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: AppTypography.labelSmall.copyWith(
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                          color: stepConfig.text,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (description != null && description.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 90),
                          child: Text(
                            description,
                            style: AppTypography.labelSmall.copyWith(
                              fontSize: 9,
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (!isLast)
                    Container(
                      width: 32,
                      height: 2,
                      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                      color: status == 'done'
                          ? AppColors.success.withValues(alpha: 0.5)
                          : border,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      );
    }

    // Default: vertical
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
        children: steps.asMap().entries.map((entry) {
          final idx = entry.key;
          final step = entry.value;
          final isLast = idx == steps.length - 1;
          final status = step['status']?.toString().toLowerCase() ?? 'pending';
          final label = step['label']?.toString() ?? 'Step ${idx + 1}';
          final description = step['description']?.toString();

          final stepConfig = _getStatusConfig(status, isDark);

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: stepConfig.bg,
                        border: Border.all(color: stepConfig.border, width: 1.5),
                      ),
                      child: Center(child: stepConfig.icon),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          color: status == 'done'
                              ? AppColors.success.withValues(alpha: 0.5)
                              : border,
                          margin: const EdgeInsets.symmetric(vertical: 4),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: AppTypography.titleSmall.copyWith(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: stepConfig.text,
                          ),
                        ),
                        if (description != null && description.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            description,
                            style: AppTypography.bodySmall.copyWith(
                              fontSize: 11,
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  _StepStyleConfig _getStatusConfig(String status, bool isDark) {
    switch (status) {
      case 'done':
      case 'completed':
        return const _StepStyleConfig(
          bg: AppColors.success,
          border: AppColors.success,
          text: AppColors.success,
          icon: Icon(Icons.check, size: 14, color: AppColors.white),
        );
      case 'active':
      case 'running':
      case 'in_progress':
        return _StepStyleConfig(
          bg: AppColors.primary,
          border: AppColors.primary,
          text: AppColors.primary,
          icon: Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.white,
              shape: BoxShape.circle,
            ),
          ),
        );
      case 'error':
      case 'failed':
        return const _StepStyleConfig(
          bg: AppColors.destructive,
          border: AppColors.destructive,
          text: AppColors.destructive,
          icon: Icon(Icons.close, size: 14, color: AppColors.white),
        );
      case 'pending':
      default:
        return _StepStyleConfig(
          bg: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          border: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          text: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
          icon: const SizedBox.shrink(),
        );
    }
  }
}

class _StepStyleConfig {
  final Color bg;
  final Color border;
  final Color text;
  final Widget icon;

  const _StepStyleConfig({
    required this.bg,
    required this.border,
    required this.text,
    required this.icon,
  });
}
