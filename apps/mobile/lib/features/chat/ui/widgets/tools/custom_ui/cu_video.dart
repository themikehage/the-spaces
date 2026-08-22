import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';

class CuVideo extends StatelessWidget {
  final String src;
  final String? poster;
  final String? title;
  final String? authToken;

  const CuVideo({
    super.key,
    required this.src,
    this.poster,
    this.title,
    this.authToken,
  });

  factory CuVideo.fromJson(Map<String, dynamic> json, {String? authToken}) {
    return CuVideo(
      src: json['src']?.toString() ?? json['url']?.toString() ?? '',
      poster: json['poster']?.toString(),
      title: json['title']?.toString(),
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
    final hasPoster = poster != null && poster!.isNotEmpty;
    ImageProvider? posterProvider;

    if (hasPoster) {
      final resolvedPoster = _resolveUrl(poster!);
      final isWorkspacePoster = _isWorkspaceUrl(poster!);
      posterProvider = (isWorkspacePoster && authToken != null && authToken!.isNotEmpty)
          ? AuthenticatedImageProvider(url: resolvedPoster, token: authToken)
          : NetworkImage(resolvedPoster) as ImageProvider;
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
          if (title != null && title!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Text(
                title!,
                style: AppTypography.titleSmall.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppColors.darkForeground
                      : AppColors.lightForeground,
                ),
              ),
            ),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  color: Colors.black,
                  child: posterProvider != null
                      ? Image(
                          image: posterProvider,
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 36,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
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
                  tooltip: 'Copy Video URL',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: resolvedSrc));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Video URL copied to clipboard'),
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
