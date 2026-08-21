import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class AttentionBadge extends StatelessWidget {
  final Widget child;
  final int count;

  const AttentionBadge({
    super.key,
    required this.child,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    if (count <= 0) {
      return child;
    }

    return Badge(
      backgroundColor: AppColors.destructive,
      textColor: AppColors.destructiveForeground,
      label: Text(
        count > 99 ? '99+' : count.toString(),
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
      child: child,
    );
  }
}
