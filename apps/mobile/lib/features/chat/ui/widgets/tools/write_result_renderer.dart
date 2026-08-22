import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class WriteResultRenderer extends StatelessWidget {
  final ToolCall toolCall;

  const WriteResultRenderer({
    super.key,
    required this.toolCall,
  });

  String _extractFilePath() {
    final args = toolCall.arguments;
    final path = args['path'] ??
        args['filePath'] ??
        args['TargetFile'] ??
        args['file_path'] ??
        args['targetFile'];
    return path?.toString() ?? '';
  }

  String _extractContentPreview() {
    final args = toolCall.arguments;
    final content = args['content'] ??
        args['CodeContent'] ??
        args['code'] ??
        args['text'];
    if (content is String) return content;

    final result = toolCall.result;
    if (result is String) return result;
    if (result is Map) {
      final msg = result['message'] ?? result['content'] ?? result['result'];
      if (msg != null) return msg.toString();
    }
    return '';
  }

  bool _isCreated() {
    final args = toolCall.arguments;
    if (args['Overwrite'] == true || args['overwrite'] == true) return false;
    final resultStr = (toolCall.result ?? '').toString().toLowerCase();
    if (resultStr.contains('created')) return true;
    if (resultStr.contains('modified') || resultStr.contains('updated')) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filePath = _extractFilePath();
    final contentPreview = _extractContentPreview();
    final isCreated = _isCreated();

    final badgeLabel = isCreated ? 'Created' : 'Modified';
    final badgeColor = isCreated ? AppColors.success : AppColors.primary;
    final codeBg = isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
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
                  children: [
                    const Icon(
                      Icons.insert_drive_file_outlined,
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        filePath.isNotEmpty ? filePath : 'File updated',
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
            ),
            const SizedBox(width: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: badgeColor.withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                badgeLabel,
                style: AppTypography.labelSmall.copyWith(
                  color: badgeColor,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        if (contentPreview.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.sm),
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
                constraints: const BoxConstraints(maxHeight: 200),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  child: SelectableText(
                    contentPreview,
                    style: AppTypography.code.copyWith(
                      fontSize: 11,
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
