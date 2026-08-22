import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/providers/authenticated_image_provider.dart';
import '../../../workspace/ui/widgets/image_lightbox.dart';

class MarkdownBlock extends StatelessWidget {
  final String data;
  final bool isUser;
  final String? authToken;

  const MarkdownBlock({
    super.key,
    required this.data,
    this.isUser = false,
    this.authToken,
  });

  bool _isWorkspaceUrl(Uri uri) {
    final uriString = uri.toString();
    final isRelative = !uri.hasScheme || uri.scheme.isEmpty;
    if (isRelative) return true;
    if (AppConfig.apiBaseUrl.isNotEmpty && uriString.startsWith(AppConfig.apiBaseUrl)) {
      return true;
    }
    return uriString.contains('/api/workspace') ||
        uriString.contains('/api/agents') ||
        uriString.contains('/api/projects') ||
        uriString.contains('/api/teams');
  }

  String _resolveUrl(Uri uri) {
    final uriString = uri.toString();
    final isRelative = !uri.hasScheme || uri.scheme.isEmpty;
    if (isRelative) {
      final base = AppConfig.apiBaseUrl;
      final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
      final cleanPath = uriString.startsWith('/') ? uriString : '/$uriString';
      return '$cleanBase$cleanPath';
    }
    return uriString;
  }

  Widget _buildImage(
    BuildContext context,
    Uri uri,
    String? title,
    String? alt, [
    double? width,
    double? height,
  ]) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolvedUrl = _resolveUrl(uri);
    final isWorkspace = _isWorkspaceUrl(uri);
    final fileName = title ?? alt ?? (uri.pathSegments.isNotEmpty ? uri.pathSegments.last : 'Image');

    final ImageProvider imageProvider = (isWorkspace && authToken != null && authToken!.isNotEmpty)
        ? AuthenticatedImageProvider(url: resolvedUrl, token: authToken)
        : NetworkImage(resolvedUrl) as ImageProvider;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: GestureDetector(
        onTap: () {
          ImageLightbox.show(
            context,
            imageUrl: resolvedUrl,
            fileName: fileName,
            authToken: isWorkspace ? authToken : null,
          );
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
              color: isDark ? AppColors.darkCard : AppColors.lightCard,
            ),
            child: Image(
              image: imageProvider,
              width: width,
              height: height,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                final total = loadingProgress.expectedTotalBytes;
                final loaded = loadingProgress.cumulativeBytesLoaded;
                return Container(
                  height: 160,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          value: total != null && total > 0 ? loaded / total : null,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Loading image...',
                        style: AppTypography.labelSmall.copyWith(
                          color: isDark
                              ? AppColors.mutedForeground
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.broken_image_outlined,
                        size: 24,
                        color: AppColors.destructive,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Flexible(
                        child: Text(
                          'Failed to load image: $fileName',
                          style: AppTypography.bodySmall.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultTextColor = isUser
        ? AppColors.primaryForeground
        : (isDark ? AppColors.darkForeground : AppColors.lightForeground);

    final codeBgColor = isUser
        ? AppColors.black.withValues(alpha: 0.12)
        : (isDark ? AppColors.darkSurface : AppColors.lightSurface);

    final codeBorderColor = isUser
        ? AppColors.black.withValues(alpha: 0.15)
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
            color: isUser
                ? AppColors.primaryForeground.withValues(alpha: 0.5)
                : AppColors.primary,
            width: 3.0,
          ),
        ),
      ),
      code: AppTypography.code.copyWith(
        color: isUser
            ? AppColors.primaryForeground
            : (isDark ? AppColors.chart2Dark : AppColors.chart2Light),
        backgroundColor: AppColors.transparent,
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
      sizedImageBuilder: (config) => _buildImage(
        context,
        config.uri,
        config.title,
        config.alt,
        config.width,
        config.height,
      ),
    );
  }
}
