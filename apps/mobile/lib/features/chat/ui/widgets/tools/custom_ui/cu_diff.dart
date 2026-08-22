import 'dart:math';
import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuDiff extends StatelessWidget {
  final String oldCode;
  final String newCode;
  final String? language;
  final String? title;

  const CuDiff({
    super.key,
    required this.oldCode,
    required this.newCode,
    this.language,
    this.title,
  });

  factory CuDiff.fromJson(Map<String, dynamic> json) {
    return CuDiff(
      oldCode: json['oldCode']?.toString() ?? json['old_code']?.toString() ?? '',
      newCode: json['newCode']?.toString() ?? json['new_code']?.toString() ?? '',
      language: json['language']?.toString(),
      title: json['title']?.toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final oldLines = oldCode.split('\n');
    final newLines = newCode.split('\n');
    final maxLines = max(oldLines.length, newLines.length);

    final diffItems = <_DiffLine>[];
    for (int i = 0; i < maxLines; i++) {
      final oldLine = i < oldLines.length ? oldLines[i] : null;
      final newLine = i < newLines.length ? newLines[i] : null;

      if (oldLine == newLine) {
        diffItems.add(_DiffLine(
          type: _DiffType.equal,
          oldText: oldLine ?? '',
          newText: newLine ?? '',
          oldNum: i + 1,
          newNum: i + 1,
        ));
      } else {
        if (oldLine != null) {
          diffItems.add(_DiffLine(
            type: _DiffType.remove,
            oldText: oldLine,
            newText: '',
            oldNum: i + 1,
            newNum: null,
          ));
        }
        if (newLine != null) {
          diffItems.add(_DiffLine(
            type: _DiffType.add,
            oldText: '',
            newText: newLine,
            oldNum: null,
            newNum: i + 1,
          ));
        }
      }
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkCard.withValues(alpha: 0.8)
                  : AppColors.lightSurface,
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  (title ?? 'CODE DIFF').toUpperCase(),
                  style: AppTypography.labelSmall.copyWith(
                    color: isDark
                        ? AppColors.mutedForeground
                        : AppColors.textSecondaryLight,
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  ),
                ),
                if (language != null && language!.isNotEmpty)
                  Text(
                    language!.toUpperCase(),
                    style: AppTypography.labelSmall.copyWith(
                      color: isDark
                          ? AppColors.mutedForeground
                          : AppColors.textSecondaryLight,
                      fontWeight: FontWeight.w600,
                      fontSize: 10,
                    ),
                  ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: diffItems.map((item) {
                Color lineBg = Colors.transparent;
                Color lineFg = isDark
                    ? AppColors.darkForeground
                    : AppColors.lightForeground;
                String prefix = ' ';

                if (item.type == _DiffType.add) {
                  lineBg = AppColors.success.withValues(alpha: 0.15);
                  lineFg = AppColors.success;
                  prefix = '+';
                } else if (item.type == _DiffType.remove) {
                  lineBg = AppColors.destructive.withValues(alpha: 0.15);
                  lineFg = AppColors.destructive;
                  prefix = '-';
                }

                final textToDisplay = item.type == _DiffType.add
                    ? item.newText
                    : item.oldText;

                return Container(
                  color: lineBg,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 1,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 28,
                        child: Text(
                          item.oldNum != null ? '${item.oldNum}' : '',
                          style: AppTypography.code.copyWith(
                            fontSize: 10,
                            color: isDark
                                ? AppColors.mutedForeground.withValues(alpha: 0.5)
                                : AppColors.textSecondaryLight.withValues(alpha: 0.5),
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      const SizedBox(width: 4),
                      SizedBox(
                        width: 28,
                        child: Text(
                          item.newNum != null ? '${item.newNum}' : '',
                          style: AppTypography.code.copyWith(
                            fontSize: 10,
                            color: isDark
                                ? AppColors.mutedForeground.withValues(alpha: 0.5)
                                : AppColors.textSecondaryLight.withValues(alpha: 0.5),
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        prefix,
                        style: AppTypography.code.copyWith(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: lineFg,
                        ),
                      ),
                      const SizedBox(width: 4),
                      SelectableText(
                        textToDisplay,
                        style: AppTypography.code.copyWith(
                          fontSize: 11,
                          color: lineFg,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

enum _DiffType { equal, add, remove }

class _DiffLine {
  final _DiffType type;
  final String oldText;
  final String newText;
  final int? oldNum;
  final int? newNum;

  const _DiffLine({
    required this.type,
    required this.oldText,
    required this.newText,
    this.oldNum,
    this.newNum,
  });
}
