import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'cu_card.dart';

class CuCardList extends StatelessWidget {
  final String? title;
  final List<Map<String, dynamic>> cards;
  final int columns;

  const CuCardList({
    super.key,
    this.title,
    required this.cards,
    this.columns = 1,
  });

  factory CuCardList.fromJson(Map<String, dynamic> json) {
    final rawCards = json['cards'];
    final cardsList = <Map<String, dynamic>>[];
    if (rawCards is List) {
      for (final c in rawCards) {
        if (c is Map) {
          cardsList.add(Map<String, dynamic>.from(c));
        }
      }
    }

    final rawCols = json['columns'];
    final cols = rawCols is int ? rawCols : 1;

    return CuCardList(
      title: json['title']?.toString(),
      cards: cardsList,
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
            final colCount = (constraints.maxWidth < 400) ? 1 : columns;
            final spacing = AppSpacing.sm;
            final totalSpacing = spacing * (colCount - 1);
            final itemWidth = (constraints.maxWidth - totalSpacing) / colCount;

            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: cards.map((c) {
                return SizedBox(
                  width: itemWidth,
                  child: CuCard.fromJson(c),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}
