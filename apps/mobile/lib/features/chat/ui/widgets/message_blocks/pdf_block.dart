import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

class PdfBlockWidget extends StatelessWidget {
  final String url;
  final String? title;
  final int? page;
  final double? scale;

  const PdfBlockWidget({
    super.key,
    required this.url,
    this.title,
    this.page,
    this.scale,
  });

  String _resolveUrl(String targetUrl) {
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      final base = AppConfig.apiBaseUrl;
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      final cleanPath = targetUrl.startsWith('/') ? targetUrl : '/$targetUrl';
      return '$cleanBase$cleanPath';
    }
    return targetUrl;
  }

  Future<void> _launchPdfUrl(BuildContext context, String resolvedUrl) async {
    final uri = Uri.tryParse(resolvedUrl);
    if (uri != null) {
      final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open PDF document'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final resolvedSrc = _resolveUrl(url);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.destructive.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.picture_as_pdf_rounded,
                  color: AppColors.destructive,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title ?? 'PDF Document',
                      style: AppTypography.titleSmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppColors.darkForeground
                            : AppColors.lightForeground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (page != null || scale != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (page != null)
                            Text(
                              'Page $page',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 11,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          if (page != null && scale != null)
                            Text(
                              ' • ',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 11,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          if (scale != null)
                            Text(
                              'Zoom ${(scale! * 100).round()}%',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 11,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16),
                tooltip: 'Copy PDF URL',
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: resolvedSrc));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('PDF URL copied to clipboard'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          InkWell(
            onTap: () => _launchPdfUrl(context, resolvedSrc),
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.destructive.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: AppColors.destructive.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.open_in_new_rounded,
                    color: AppColors.destructive,
                    size: 18,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    'Open PDF Document',
                    style: AppTypography.labelMedium.copyWith(
                      color: AppColors.destructive,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
