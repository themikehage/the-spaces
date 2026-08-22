import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/config/app_config.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';
import 'package:spaces_mobile/features/workspace/ui/widgets/image_lightbox.dart';

class CuImageGrid extends StatelessWidget {
  final List<dynamic> images;
  final String? title;
  final int columns;
  final String? authToken;

  const CuImageGrid({
    super.key,
    required this.images,
    this.title,
    this.columns = 2,
    this.authToken,
  });

  factory CuImageGrid.fromJson(Map<String, dynamic> json, {String? authToken}) {
    final rawImgs = json['images'] ?? json['urls'] ?? json['files'] ?? [];
    final imgList = rawImgs is List ? rawImgs : [rawImgs];
    final cols = json['columns'] is int ? json['columns'] as int : 2;

    return CuImageGrid(
      images: imgList,
      title: json['title']?.toString(),
      columns: cols.clamp(1, 4),
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
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return true;
    }
    if (AppConfig.apiBaseUrl.isNotEmpty && url.startsWith(AppConfig.apiBaseUrl)) {
      return true;
    }
    return url.contains('/api/workspace') ||
        url.contains('/api/agents') ||
        url.contains('/api/projects') ||
        url.contains('/api/teams');
  }

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null && title!.isNotEmpty) ...[
          Text(
            title!.toUpperCase(),
            style: AppTypography.labelSmall.copyWith(
              color: isDark
                  ? AppColors.mutedForeground
                  : AppColors.textSecondaryLight,
              fontWeight: FontWeight.w700,
              fontSize: 11,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
        ],
        LayoutBuilder(
          builder: (context, constraints) {
            final colCount = (constraints.maxWidth < 360) ? 1 : columns;
            final spacing = AppSpacing.sm;
            final totalSpacing = spacing * (colCount - 1);
            final itemWidth = (constraints.maxWidth - totalSpacing) / colCount;

            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: images.map((img) {
                String url = '';
                String label = 'Image';

                if (img is String) {
                  url = img;
                  label = img.split('/').last;
                } else if (img is Map) {
                  url = img['url']?.toString() ??
                      img['src']?.toString() ??
                      img['path']?.toString() ??
                      '';
                  label = img['title']?.toString() ??
                      img['alt']?.toString() ??
                      img['caption']?.toString() ??
                      url.split('/').last;
                }

                if (url.isEmpty) return const SizedBox.shrink();

                final resolvedUrl = _resolveUrl(url);
                final isWorkspace = _isWorkspaceUrl(url);

                final ImageProvider imageProvider =
                    (isWorkspace && authToken != null && authToken!.isNotEmpty)
                        ? AuthenticatedImageProvider(
                            url: resolvedUrl,
                            token: authToken,
                          )
                        : NetworkImage(resolvedUrl) as ImageProvider;

                return SizedBox(
                  width: itemWidth,
                  child: GestureDetector(
                    onTap: () {
                      ImageLightbox.show(
                        context,
                        imageUrl: resolvedUrl,
                        fileName: label,
                        authToken: isWorkspace ? authToken : null,
                      );
                    },
                    child: Container(
                      height: itemWidth * 0.75,
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.darkCard
                            : AppColors.lightCard,
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusMd),
                        border: Border.all(color: border),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image(
                            image: imageProvider,
                            fit: BoxFit.cover,
                            loadingBuilder:
                                (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return const Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary,
                                  ),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) {
                              return const Center(
                                child: Icon(
                                  Icons.broken_image_outlined,
                                  color: AppColors.destructive,
                                  size: 24,
                                ),
                              );
                            },
                          ),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.xs,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.bottomCenter,
                                  end: Alignment.topCenter,
                                  colors: [
                                    Colors.black.withValues(alpha: 0.8),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                              child: Text(
                                label,
                                style: AppTypography.labelSmall.copyWith(
                                  color: Colors.white,
                                  fontSize: 10,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}
