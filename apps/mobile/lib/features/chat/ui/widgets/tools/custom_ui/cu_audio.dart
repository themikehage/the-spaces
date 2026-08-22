import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';

class CuAudio extends StatelessWidget {
  final String src;
  final String? title;
  final String? artist;
  final String? coverImage;
  final String? authToken;

  const CuAudio({
    super.key,
    required this.src,
    this.title,
    this.artist,
    this.coverImage,
    this.authToken,
  });

  factory CuAudio.fromJson(Map<String, dynamic> json, {String? authToken}) {
    return CuAudio(
      src: json['src']?.toString() ?? json['url']?.toString() ?? '',
      title: json['title']?.toString(),
      artist: json['artist']?.toString(),
      coverImage: json['coverImage']?.toString() ?? json['cover_image']?.toString(),
      authToken: authToken,
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

  bool _isWorkspaceUrl(String url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
    if (AppConfig.apiBaseUrl.isNotEmpty && url.startsWith(AppConfig.apiBaseUrl)) {
      return true;
    }
    return url.contains('/api/workspace');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final resolvedSrc = _resolveUrl(src);
    final hasCover = coverImage != null && coverImage!.isNotEmpty;
    ImageProvider? coverProvider;

    if (hasCover) {
      final resolvedCover = _resolveUrl(coverImage!);
      final isWorkspaceCover = _isWorkspaceUrl(coverImage!);
      coverProvider = (isWorkspaceCover && authToken != null && authToken!.isNotEmpty)
          ? AuthenticatedImageProvider(url: resolvedCover, token: authToken)
          : NetworkImage(resolvedCover) as ImageProvider;
    }

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
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  image: coverProvider != null
                      ? DecorationImage(
                          image: coverProvider,
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: coverProvider == null
                    ? Icon(
                        Icons.music_note_rounded,
                        color: isDark
                            ? AppColors.mutedForeground
                            : AppColors.textSecondaryLight,
                        size: 24,
                      )
                    : null,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title ?? 'Audio Track',
                      style: AppTypography.titleSmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppColors.darkForeground
                            : AppColors.lightForeground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (artist != null && artist!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        artist!,
                        style: AppTypography.bodySmall.copyWith(
                          fontSize: 11,
                          color: isDark
                              ? AppColors.mutedForeground
                              : AppColors.textSecondaryLight,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkSurface.withValues(alpha: 0.3)
                  : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.play_circle_fill_rounded,
                  color: AppColors.primary,
                  size: 28,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    resolvedSrc,
                    style: AppTypography.code.copyWith(
                      fontSize: 11,
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
                  tooltip: 'Copy Audio URL',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: resolvedSrc));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Audio URL copied to clipboard'),
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
