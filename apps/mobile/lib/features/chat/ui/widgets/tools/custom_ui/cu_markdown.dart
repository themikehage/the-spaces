import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/markdown_block.dart';

class CuMarkdown extends StatelessWidget {
  final String content;
  final String? title;
  final String? authToken;

  const CuMarkdown({
    super.key,
    required this.content,
    this.title,
    this.authToken,
  });

  factory CuMarkdown.fromJson(Map<String, dynamic> json, {String? authToken}) {
    return CuMarkdown(
      content: json['content']?.toString() ?? '',
      title: json['title']?.toString(),
      authToken: authToken,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null && title!.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
              ),
              child: Text(
                title!,
                style: AppTypography.titleSmall.copyWith(
                  color: isDark
                      ? AppColors.darkForeground
                      : AppColors.lightForeground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Divider(height: AppSpacing.md),
          ],
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: MarkdownBlock(
              data: content,
              authToken: authToken,
            ),
          ),
        ],
      ),
    );
  }
}
