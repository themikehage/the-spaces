import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import 'skeleton_card.dart';

/// Generic skeleton list widget that renders [itemCount] skeleton cards with spacing.
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final EdgeInsetsGeometry padding;
  final double spacing;
  final Widget Function(BuildContext context, int index)? customItemBuilder;

  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.spacing = AppSpacing.sm,
    this.customItemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      padding: padding,
      itemCount: itemCount,
      separatorBuilder: (_, __) => SizedBox(height: spacing),
      itemBuilder: (context, index) {
        if (customItemBuilder != null) {
          return customItemBuilder!(context, index);
        }
        return const SkeletonCard();
      },
    );
  }
}
