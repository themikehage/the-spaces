import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class AudioBlockWidget extends StatelessWidget {
  final String url;
  final String? title;
  final String? artist;
  final String? coverImage;
  final String? authToken;

  const AudioBlockWidget({
    super.key,
    required this.url,
    this.title,
    this.artist,
    this.coverImage,
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

  Future<void> _launchAudioUrl(BuildContext context, String resolvedUrl) async {
    final uri = Uri.tryParse(resolvedUrl);
    if (uri != null) {
      final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open audio player'),
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

    ImageProvider? coverProvider;
    if (coverImage != null && coverImage!.isNotEmpty) {
      final resolvedCover = _resolveUrl(coverImage!);
      final isWorkspaceCover = _isWorkspaceUrl(coverImage!);
      coverProvider = (isWorkspaceCover && authToken != null && authToken!.isNotEmpty)
          ? AuthenticatedImageProvider(url: resolvedCover, token: authToken)
          : NetworkImage(resolvedCover) as ImageProvider;
    }

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
                    ? const Icon(
                        Icons.audiotrack_rounded,
                        color: AppColors.primary,
                        size: 22,
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
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16),
                tooltip: 'Copy Audio URL',
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: resolvedSrc));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Audio URL copied to clipboard'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          InkWell(
            onTap: () => _launchAudioUrl(context, resolvedSrc),
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.play_arrow_rounded,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    'Play / Open Audio',
                    style: AppTypography.labelMedium.copyWith(
                      color: AppColors.primary,
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
