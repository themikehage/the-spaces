import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuTimeline extends StatelessWidget {
  final String? title;
  final List<Map<String, dynamic>> items;

  const CuTimeline({
    super.key,
    this.title,
    required this.items,
  });

  factory CuTimeline.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final itemsList = <Map<String, dynamic>>[];
    if (rawItems is List) {
      for (final it in rawItems) {
        if (it is Map) {
          itemsList.add(Map<String, dynamic>.from(it));
        }
      }
    }

    return CuTimeline(
      title: json['title']?.toString(),
      items: itemsList,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

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
        children: [
          if (title != null && title!.isNotEmpty) ...[
            Text(
              title!.toUpperCase(),
              style: AppTypography.labelSmall.copyWith(
                color: isDark
                    ? AppColors.mutedForeground
                    : AppColors.textSecondaryLight,
                fontWeight: FontWeight.w700,
                fontSize: 11,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Divider(height: 1, color: border.withValues(alpha: 0.6)),
            const SizedBox(height: AppSpacing.md),
          ],
          ...items.asMap().entries.map((entry) {
            final idx = entry.key;
            final item = entry.value;
            final isLast = idx == items.length - 1;

            final date = item['date']?.toString();
            final itemTitle = item['title']?.toString() ?? '';
            final description = item['description']?.toString();
            final status = item['status']?.toString();

            Color dotColor;
            switch (status?.toLowerCase()) {
              case 'success':
                dotColor = AppColors.success;
                break;
              case 'warning':
                dotColor = AppColors.warning;
                break;
              case 'error':
              case 'destructive':
                dotColor = AppColors.destructive;
                break;
              case 'info':
                dotColor = isDark
                    ? AppColors.chart2Dark
                    : AppColors.chart2Light;
                break;
              default:
                dotColor = isDark
                    ? AppColors.mutedForeground
                    : AppColors.textSecondaryLight;
                break;
            }

            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        margin: const EdgeInsets.only(top: 3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: dotColor,
                          boxShadow: [
                            BoxShadow(
                              color: dotColor.withValues(alpha: 0.3),
                              blurRadius: 4,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                      ),
                      if (!isLast)
                        Expanded(
                          child: Container(
                            width: 2,
                            color: border.withValues(alpha: 0.8),
                            margin: const EdgeInsets.symmetric(vertical: 4),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom: isLast ? 0 : AppSpacing.md,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (date != null && date.isNotEmpty)
                            Text(
                              date.toUpperCase(),
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                                letterSpacing: 0.5,
                              ),
                            ),
                          Text(
                            itemTitle,
                            style: AppTypography.titleSmall.copyWith(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.darkForeground
                                  : AppColors.lightForeground,
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
          }),
        ],
      ),
    );
  }
}
