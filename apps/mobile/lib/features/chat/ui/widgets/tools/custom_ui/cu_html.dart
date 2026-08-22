import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuHtml extends StatefulWidget {
  final String html;
  final String? title;

  const CuHtml({
    super.key,
    required this.html,
    this.title,
  });

  factory CuHtml.fromJson(Map<String, dynamic> json) {
    return CuHtml(
      html: json['html']?.toString() ?? json['content']?.toString() ?? '',
      title: json['title']?.toString(),
    );
  }

  @override
  State<CuHtml> createState() => _CuHtmlState();
}

class _CuHtmlState extends State<CuHtml> {
  bool _showRaw = false;

  String _stripHtmlTags(String html) {
    return html
        .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final plainText = _stripHtmlTags(widget.html);

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
                  ? AppColors.darkSurface.withValues(alpha: 0.4)
                  : AppColors.lightSurface,
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.html_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      (widget.title ?? 'HTML PREVIEW').toUpperCase(),
                      style: AppTypography.labelSmall.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 10,
                        letterSpacing: 0.5,
                        color: isDark
                            ? AppColors.mutedForeground
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    TextButton(
                      onPressed: () => setState(() => _showRaw = !_showRaw),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                          vertical: 2,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        _showRaw ? 'FORMATTED' : 'RAW',
                        style: AppTypography.labelSmall.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    IconButton(
                      icon: const Icon(Icons.copy_rounded, size: 14),
                      tooltip: 'Copy HTML',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: widget.html));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('HTML copied to clipboard'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: _showRaw
                ? SelectableText(
                    widget.html,
                    style: AppTypography.code.copyWith(
                      fontSize: 11,
                      color: isDark
                          ? AppColors.darkForeground
                          : AppColors.lightForeground,
                    ),
                  )
                : Text(
                    plainText.isEmpty ? 'No text content available' : plainText,
                    style: AppTypography.bodySmall.copyWith(
                      color: isDark
                          ? AppColors.darkForeground
                          : AppColors.lightForeground,
                      height: 1.4,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
