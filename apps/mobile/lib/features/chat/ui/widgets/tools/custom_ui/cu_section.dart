import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

typedef ChildRenderer = Widget Function(dynamic childJson, int index);

class CuSection extends StatelessWidget {
  final String title;
  final List<dynamic> children;
  final ChildRenderer renderChild;

  const CuSection({
    super.key,
    required this.title,
    required this.children,
    required this.renderChild,
  });

  factory CuSection.fromJson(
    Map<String, dynamic> json, {
    required ChildRenderer renderChild,
  }) {
    final rawChildren = json['children'];
    final childrenList = rawChildren is List ? rawChildren : <dynamic>[];

    return CuSection(
      title: json['title']?.toString() ?? 'Section',
      children: childrenList,
      renderChild: renderChild,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.xs, top: AppSpacing.xs),
          child: Row(
            children: [
              Text(
                title.toUpperCase(),
                style: AppTypography.labelSmall.copyWith(
                  color: isDark
                      ? AppColors.mutedForeground
                      : AppColors.textSecondaryLight,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Container(
                  height: 1,
                  color: border.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        ...children.asMap().entries.map((entry) {
          final idx = entry.key;
          final childJson = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: renderChild(childJson, idx),
          );
        }),
      ],
    );
  }
}
