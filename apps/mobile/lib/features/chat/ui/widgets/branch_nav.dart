import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class BranchNav extends StatelessWidget {
  final List<String> siblings;
  final String currentId;
  final ValueChanged<String>? onNavigate;
  final bool isUser;

  const BranchNav({
    super.key,
    required this.siblings,
    required this.currentId,
    this.onNavigate,
    this.isUser = false,
  });

  @override
  Widget build(BuildContext context) {
    if (siblings.length <= 1 || !siblings.contains(currentId)) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final idx = siblings.indexOf(currentId);
    final canPrev = idx > 0;
    final canNext = idx < siblings.length - 1;

    final borderColor = isUser
        ? (isDark ? Colors.white.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.15))
        : (isDark ? AppColors.darkBorder : AppColors.lightBorder);

    final textColor = isUser
        ? (isDark ? AppColors.darkForeground.withValues(alpha: 0.8) : Colors.white.withValues(alpha: 0.9))
        : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight);

    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: borderColor,
            width: 0.8,
          ),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Prev Button
          InkWell(
            onTap: canPrev && onNavigate != null
                ? () => onNavigate!(siblings[idx - 1])
                : null,
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
              child: Text(
                '←',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: canPrev
                      ? textColor
                      : textColor.withValues(alpha: 0.25),
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),

          // Branch Counter
          Text(
            '${idx + 1} / ${siblings.length}',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(width: 4),

          // Next Button
          InkWell(
            onTap: canNext && onNavigate != null
                ? () => onNavigate!(siblings[idx + 1])
                : null,
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
              child: Text(
                '→',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: canNext
                      ? textColor
                      : textColor.withValues(alpha: 0.25),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
