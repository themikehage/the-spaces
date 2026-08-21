import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/theme/app_theme.dart';

class MarkdownBlock extends StatelessWidget {
  final String data;
  final bool isUser;

  const MarkdownBlock({
    super.key,
    required this.data,
    this.isUser = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultTextColor = isUser
        ? AppColors.primaryForeground
        : (isDark ? AppColors.darkForeground : AppColors.lightForeground);

    final codeBgColor = isUser
        ? Colors.black.withValues(alpha: 0.15)
        : (isDark ? const Color(0xFF1E1E22) : const Color(0xFFEAEAEE));

    final codeBorderColor = isUser
        ? Colors.white.withValues(alpha: 0.2)
        : (isDark ? AppColors.darkBorder : AppColors.lightBorder);

    final markdownStyleSheet = MarkdownStyleSheet(
      p: AppTypography.bodyMedium.copyWith(color: defaultTextColor),
      h1: AppTypography.headlineLarge.copyWith(color: defaultTextColor),
      h2: AppTypography.headlineMedium.copyWith(color: defaultTextColor),
      h3: AppTypography.headlineSmall.copyWith(color: defaultTextColor),
      h4: AppTypography.titleLarge.copyWith(color: defaultTextColor),
      h5: AppTypography.titleMedium.copyWith(color: defaultTextColor),
      h6: AppTypography.titleSmall.copyWith(color: defaultTextColor),
      strong: AppTypography.bodyMedium.copyWith(
        color: defaultTextColor,
        fontWeight: FontWeight.w700,
      ),
      em: AppTypography.bodyMedium.copyWith(
        color: defaultTextColor,
        fontStyle: FontStyle.italic,
      ),
      blockquote: AppTypography.bodyMedium.copyWith(
        color: isUser
            ? AppColors.primaryForeground.withValues(alpha: 0.8)
            : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
      ),
      blockquoteDecoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: isUser ? Colors.white.withValues(alpha: 0.5) : AppColors.primary,
            width: 3.0,
          ),
        ),
      ),
      code: AppTypography.code.copyWith(
        color: isUser
            ? AppColors.primaryForeground
            : (isDark ? const Color(0xFF86E1FC) : const Color(0xFF0070F3)),
        backgroundColor: Colors.transparent,
      ),
      codeblockDecoration: BoxDecoration(
        color: codeBgColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: codeBorderColor),
      ),
      codeblockPadding: const EdgeInsets.all(AppSpacing.md),
      listBullet: AppTypography.bodyMedium.copyWith(color: defaultTextColor),
      tableHead: AppTypography.titleSmall.copyWith(color: defaultTextColor),
      tableBody: AppTypography.bodySmall.copyWith(color: defaultTextColor),
      tableBorder: TableBorder.all(
        color: codeBorderColor,
        width: 1,
      ),
    );

    return MarkdownBody(
      data: data,
      selectable: true,
      styleSheet: markdownStyleSheet,
    );
  }
}
