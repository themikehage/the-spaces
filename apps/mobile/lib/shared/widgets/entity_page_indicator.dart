import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class EntityPageIndicator extends StatelessWidget {
  final int currentPage;
  final int pageCount;
  final ValueChanged<int>? onDotTapped;

  const EntityPageIndicator({
    super.key,
    required this.currentPage,
    this.pageCount = 2,
    this.onDotTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(pageCount, (index) {
        final isActive = index == currentPage;
        return GestureDetector(
          onTap: () => onDotTapped?.call(index),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: isActive ? 16 : 6,
            height: 6,
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : AppColors.mutedForeground.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        );
      }),
    );
  }
}
