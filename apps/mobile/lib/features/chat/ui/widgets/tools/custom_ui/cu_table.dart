import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuTable extends StatelessWidget {
  final String? title;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final bool striped;

  const CuTable({
    super.key,
    this.title,
    required this.columns,
    required this.rows,
    this.striped = true,
  });

  factory CuTable.fromJson(Map<String, dynamic> json) {
    final rawCols = json['columns'];
    final cols = rawCols is List ? rawCols.map((c) => c.toString()).toList() : <String>[];

    final rawRows = json['rows'];
    final rowsList = <Map<String, dynamic>>[];
    if (rawRows is List) {
      for (final r in rawRows) {
        if (r is Map) {
          rowsList.add(Map<String, dynamic>.from(r));
        }
      }
    }

    return CuTable(
      title: json['title']?.toString(),
      columns: cols,
      rows: rowsList,
      striped: json['striped'] != false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;

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
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: border),
          ),
          clipBehavior: Clip.antiAlias,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor: WidgetStateProperty.all(
                isDark
                    ? AppColors.darkSurface.withValues(alpha: 0.5)
                    : AppColors.lightSurface,
              ),
              headingTextStyle: AppTypography.labelSmall.copyWith(
                color: isDark
                    ? AppColors.mutedForeground
                    : AppColors.textSecondaryLight,
                fontWeight: FontWeight.w700,
                fontSize: 11,
                letterSpacing: 0.5,
              ),
              dataTextStyle: AppTypography.bodySmall.copyWith(
                color: isDark
                    ? AppColors.darkForeground
                    : AppColors.lightForeground,
                fontSize: 12,
              ),
              dividerThickness: 1,
              horizontalMargin: AppSpacing.md,
              columnSpacing: AppSpacing.lg,
              columns: columns.map((c) => DataColumn(label: Text(c))).toList(),
              rows: rows.asMap().entries.map((entry) {
                final idx = entry.key;
                final row = entry.value;
                final isEven = idx % 2 == 0;
                final rowBg = striped && !isEven
                    ? (isDark
                        ? AppColors.darkSurface.withValues(alpha: 0.2)
                        : AppColors.lightSurface.withValues(alpha: 0.5))
                    : Colors.transparent;

                return DataRow(
                  color: WidgetStateProperty.all(rowBg),
                  cells: columns.map((col) {
                    final val = row[col] ?? row[col.toLowerCase()] ?? '';
                    return DataCell(
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 220),
                        child: Text(
                          val.toString(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    );
                  }).toList(),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
}
