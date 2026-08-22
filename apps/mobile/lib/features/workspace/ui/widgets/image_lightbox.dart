import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class ImageLightbox extends StatelessWidget {
  final String imageUrl;
  final String fileName;
  final String? authToken;

  const ImageLightbox({
    super.key,
    required this.imageUrl,
    required this.fileName,
    this.authToken,
  });

  static Future<void> show(
    BuildContext context, {
    required String imageUrl,
    required String fileName,
    String? authToken,
  }) {
    return Navigator.of(context).push<void>(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: AppColors.black.withValues(alpha: 0.85),
        pageBuilder: (context, _, __) => ImageLightbox(
          imageUrl: imageUrl,
          fileName: fileName,
          authToken: authToken,
        ),
        transitionsBuilder: (context, animation, _, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final Map<String, String>? headers = (authToken != null && authToken!.isNotEmpty)
        ? {'Authorization': 'Bearer $authToken'}
        : null;

    return Scaffold(
      backgroundColor: AppColors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Center Image with InteractiveViewer
            Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Image.network(
                  imageUrl,
                  headers: headers,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    final total = loadingProgress.expectedTotalBytes;
                    final loaded = loadingProgress.cumulativeBytesLoaded;
                    return Center(
                      child: CircularProgressIndicator(
                        value: total != null ? loaded / total : null,
                        color: AppColors.primary,
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.broken_image_outlined,
                            size: 48,
                            color: AppColors.destructive,
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            'Could not load image',
                            style: AppTypography.bodyMedium.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),

            // Top overlay bar with title and close button
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.black.withValues(alpha: 0.8),
                      AppColors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        fileName,
                        style: AppTypography.titleSmall.copyWith(
                          color: AppColors.white,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.close,
                        color: AppColors.white,
                        size: 24,
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
