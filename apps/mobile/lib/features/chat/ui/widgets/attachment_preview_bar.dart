import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_attachment.dart';
import '../../utils/file_classifier.dart';

class AttachmentPreviewBar extends StatelessWidget {
  final List<ChatAttachment> attachments;
  final ValueChanged<int> onRemove;

  const AttachmentPreviewBar({
    super.key,
    required this.attachments,
    required this.onRemove,
  });

  factory AttachmentPreviewBar.fromPaths({
    Key? key,
    required List<String> paths,
    required ValueChanged<int> onRemove,
  }) {
    final list = paths.map((p) {
      final name = p.split('/').last.split('\\').last;
      final ext = FileClassifier.getExtension(p);
      final isImg = FileClassifier.imageExtensions.contains(ext);
      return ChatAttachment(
        localPath: p,
        name: name,
        sizeBytes: 0,
        type: isImg ? FileType.inlineImage : FileType.uploadRequired,
      );
    }).toList();

    return AttachmentPreviewBar(
      key: key,
      attachments: list,
      onRemove: onRemove,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (attachments.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: attachments.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final att = attachments[index];
          return _buildAttachmentChip(context, att, index, isDark, cardBg, borderColor);
        },
      ),
    );
  }

  Widget _buildAttachmentChip(
    BuildContext context,
    ChatAttachment att,
    int index,
    bool isDark,
    Color cardBg,
    Color borderColor,
  ) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 220),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildLeadingIcon(att, isDark),
          const SizedBox(width: AppSpacing.xs),
          Flexible(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  att.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                if (att.isUploading)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Uploading...',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  )
                else
                  Text(
                    '${att.extension.toUpperCase()} · ${att.formattedSize}',
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          GestureDetector(
            key: Key('attachment_remove_$index'),
            onTap: () => onRemove(index),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.close,
                size: 12,
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeadingIcon(ChatAttachment att, bool isDark) {
    if (att.isImage) {
      final file = File(att.localPath);
      return ClipRRect(
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        child: Container(
          width: 38,
          height: 38,
          color: isDark ? AppColors.darkCard : AppColors.lightCard,
          child: (!kIsWeb && att.localPath.isNotEmpty && file.existsSync())
              ? Image.file(
                  file,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Icon(Icons.image, size: 20, color: AppColors.primary),
                  ),
                )
              : const Center(
                  child: Icon(Icons.image, size: 20, color: AppColors.primary),
                ),
        ),
      );
    }

    final ext = att.extension.toLowerCase();
    final isCode = FileClassifier.textExtensions.contains(ext);

    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Center(
        child: Icon(
          isCode ? Icons.code : Icons.description_outlined,
          size: 20,
          color: AppColors.primary,
        ),
      ),
    );
  }
}
