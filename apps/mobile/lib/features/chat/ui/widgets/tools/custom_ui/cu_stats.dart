import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'cu_metric.dart';

class CuStats extends StatelessWidget {
  final String? title;
  final List<Map<String, dynamic>> stats;
  final int columns;

  const CuStats({
    super.key,
    this.title,
    required this.stats,
    this.columns = 2,
  });

  factory CuStats.fromJson(Map<String, dynamic> json) {
    final rawStats = json['stats'];
    final statsList = <Map<String, dynamic>>[];
    if (rawStats is List) {
      for (final s in rawStats) {
        if (s is Map) {
          statsList.add(Map<String, dynamic>.from(s));
        }
      }
    }

    final rawCols = json['columns'];
    final cols = rawCols is int ? rawCols : 2;

    return CuStats(
      title: json['title']?.toString(),
      stats: statsList,
      columns: cols.clamp(1, 4),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
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
          const SizedBox(height: AppSpacing.xs),
        ],
        LayoutBuilder(
          builder: (context, constraints) {
            final colCount = (constraints.maxWidth < 360) ? 1 : columns;
            final spacing = AppSpacing.sm;
            final totalSpacing = spacing * (colCount - 1);
            final itemWidth = (constraints.maxWidth - totalSpacing) / colCount;

            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: stats.map((item) {
                return SizedBox(
                  width: itemWidth,
                  child: CuMetric(
                    label: item['label']?.toString() ?? '',
                    value: item['value']?.toString() ?? '',
                    trend: item['trend']?.toString(),
                    subtitle: item['subtitle']?.toString() ?? item['change']?.toString(),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}
