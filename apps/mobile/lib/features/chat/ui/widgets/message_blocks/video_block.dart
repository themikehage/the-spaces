import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class VideoBlockWidget extends StatelessWidget {
  final String url;
  final String? title;
  final String? thumbnail;
  final String? authToken;

  const VideoBlockWidget({
    super.key,
    required this.url,
    this.title,
    this.thumbnail,
    this.authToken,
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

  bool _isWorkspaceUrl(String targetUrl) {
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) return true;
    if (AppConfig.apiBaseUrl.isNotEmpty && targetUrl.startsWith(AppConfig.apiBaseUrl)) {
      return true;
    }
    return targetUrl.contains('/api/workspace');
  }

  Future<void> _launchVideoUrl(BuildContext context, String resolvedUrl) async {
    final uri = Uri.tryParse(resolvedUrl);
    if (uri != null) {
      final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open video player'),
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

    ImageProvider? thumbProvider;
    if (thumbnail != null && thumbnail!.isNotEmpty) {
      final resolvedThumb = _resolveUrl(thumbnail!);
      final isWorkspaceThumb = _isWorkspaceUrl(thumbnail!);
      thumbProvider = (isWorkspaceThumb && authToken != null && authToken!.isNotEmpty)
          ? AuthenticatedImageProvider(url: resolvedThumb, token: authToken)
          : NetworkImage(resolvedThumb) as ImageProvider;
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  color: AppColors.black,
                  child: thumbProvider != null
                      ? Image(
                          image: thumbProvider,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          color: isDark ? AppColors.darkBackground : AppColors.darkCard,
                          child: const Center(
                            child: Icon(
                              Icons.videocam_rounded,
                              size: 40,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ),
                ),
                Center(
                  child: Material(
                    color: AppColors.transparent,
                    child: InkWell(
                      onTap: () => _launchVideoUrl(context, resolvedSrc),
                      borderRadius: BorderRadius.circular(32),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: AppColors.black.withValues(alpha: 0.7),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.white.withValues(alpha: 0.4),
                            width: 1.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          color: AppColors.white,
                          size: 36,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            child: Row(
              children: [
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
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  tooltip: 'Open Video',
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  onPressed: () => _launchVideoUrl(context, resolvedSrc),
                ),
                IconButton(
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  tooltip: 'Copy Video URL',
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: resolvedSrc));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Video URL copied to clipboard'),
                        duration: Duration(seconds: 1),
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
