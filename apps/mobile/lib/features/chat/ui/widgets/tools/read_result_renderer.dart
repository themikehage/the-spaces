import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class ReadResultRenderer extends StatelessWidget {
  final ToolCall toolCall;

  const ReadResultRenderer({
    super.key,
    required this.toolCall,
  });

  String _extractFilePath() {
    final args = toolCall.arguments;
    final path = args['path'] ??
        args['filePath'] ??
        args['AbsolutePath'] ??
        args['file_path'] ??
        args['targetFile'];
    return path?.toString() ?? '';
  }

  String? _extractImageUrl() {
    final result = toolCall.result;
    if (result is Map) {
      final url = result['imageUrl'] ?? result['url'] ?? result['image'];
      if (url is String && url.startsWith('http')) return url;
      if (result['image'] is Map && result['image']['url'] is String) {
        return result['image']['url'] as String;
      }
    }
    if (result is String) {
      final trimmed = result.trim();
      if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
          (trimmed.endsWith('.png') ||
              trimmed.endsWith('.jpg') ||
              trimmed.endsWith('.jpeg') ||
              trimmed.endsWith('.webp') ||
              trimmed.endsWith('.gif'))) {
        return trimmed;
      }
    }
    return null;
  }

  String _extractContentText() {
    final result = toolCall.result;
    if (result == null) return '';
    if (result is String) return result;
    if (result is Map) {
      final content = result['content'] ?? result['text'] ?? result['data'] ?? result['result'];
      if (content != null) return content.toString();
    }
    return result.toString();
  }

  void _showImageLightbox(BuildContext context, String imageUrl) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black.withValues(alpha: 0.9),
        insetPadding: const EdgeInsets.all(AppSpacing.md),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Center(
                  child: Icon(Icons.broken_image, color: Colors.white70, size: 48),
                ),
              ),
            ),
            Positioned(
              top: AppSpacing.sm,
              right: AppSpacing.sm,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filePath = _extractFilePath();
    final imageUrl = _extractImageUrl();
    final contentText = _extractContentText();

    final codeBg = isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (filePath.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.description_outlined,
                  size: 14,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Flexible(
                  child: Text(
                    filePath,
                    style: AppTypography.code.copyWith(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (imageUrl != null) ...[
          GestureDetector(
            onTap: () => _showImageLightbox(context, imageUrl),
            child: Container(
              constraints: const BoxConstraints(maxHeight: 250),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                alignment: Alignment.bottomRight,
                children: [
                  Image.network(
                    imageUrl,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    loadingBuilder: (ctx, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        height: 150,
                        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                        child: const Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      );
                    },
                    errorBuilder: (_, __, ___) => Container(
                      height: 120,
                      color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                      child: const Center(
                        child: Icon(Icons.broken_image, size: 32, color: AppColors.mutedForeground),
                      ),
                    ),
                  ),
                  Container(
                    margin: const EdgeInsets.all(AppSpacing.xs),
                    padding: const EdgeInsets.all(AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: const Icon(Icons.fullscreen, color: Colors.white, size: 16),
                  ),
                ],
              ),
            ),
          ),
        ] else if (contentText.isNotEmpty) ...[
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: codeBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 300),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: SelectableText(
                    contentText,
                    style: AppTypography.code.copyWith(
                      fontSize: 12,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
