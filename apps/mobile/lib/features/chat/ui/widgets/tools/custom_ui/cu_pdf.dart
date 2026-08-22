import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuPdf extends StatelessWidget {
  final String src;
  final String? title;
  final int? page;
  final double? scale;

  const CuPdf({
    super.key,
    required this.src,
    this.title,
    this.page,
    this.scale,
  });

  factory CuPdf.fromJson(Map<String, dynamic> json) {
    final rawPage = json['page'];
    final rawScale = json['scale'];

    return CuPdf(
      src: json['src']?.toString() ?? json['url']?.toString() ?? '',
      title: json['title']?.toString(),
      page: rawPage is int ? rawPage : int.tryParse(rawPage?.toString() ?? ''),
      scale: rawScale is num ? rawScale.toDouble() : double.tryParse(rawScale?.toString() ?? ''),
    );
  }

  String _resolveUrl(String url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      final base = AppConfig.apiBaseUrl;
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      final cleanPath = url.startsWith('/') ? url : '/$url';
      return '$cleanBase$cleanPath';
    }
    return url;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final resolvedSrc = _resolveUrl(src);

    return Container(
      width: double.infinity,
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
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.destructive.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.picture_as_pdf_rounded,
                  color: AppColors.destructive,
                  size: 22,
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
                                fontSize: 10,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          if (page != null && scale != null)
                            Text(
                              ' • ',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 10,
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          if (scale != null)
                            Text(
                              'Zoom ${(scale! * 100).round()}%',
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 10,
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
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkSurface.withValues(alpha: 0.3)
                  : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    resolvedSrc,
                    style: AppTypography.code.copyWith(
                      fontSize: 10,
                      color: isDark
                          ? AppColors.mutedForeground
                          : AppColors.textSecondaryLight,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  tooltip: 'Copy PDF URL',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: resolvedSrc));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('PDF URL copied to clipboard'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
