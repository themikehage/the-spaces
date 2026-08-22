import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class AttentionBadge extends StatelessWidget {
  final Widget child;
  final int count;
  final VoidCallback? onTap;

  const AttentionBadge({
    super.key,
    required this.child,
    required this.count,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget content;
    if (count <= 0) {
      content = child;
    } else {
      content = Badge(
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

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: content,
      );
    }
    return content;
  }
}
