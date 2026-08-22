import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class EditResultRenderer extends StatelessWidget {
  final ToolCall toolCall;

  const EditResultRenderer({
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

  String _extractDiffText() {
    final result = toolCall.result;
    if (result == null) return '';
    if (result is String) return result;
    if (result is Map) {
      final diff = result['diff'] ?? result['patch'] ?? result['content'] ?? result['result'];
      if (diff != null) return diff.toString();
    }
    return result.toString();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filePath = _extractFilePath();
    final diffText = _extractDiffText();
    final lines = diffText.split('\n');

    final codeBg = isDark ? AppColors.black.withValues(alpha: 0.35) : AppColors.white;
    final lineNumColor = isDark ? AppColors.textTertiaryDark : AppColors.textTertiaryLight;
    final defaultTextColor = isDark ? AppColors.darkForeground : AppColors.lightForeground;

    int oldLineNum = 1;
    int newLineNum = 1;

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
                  Icons.insert_drive_file_outlined,
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
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 300),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: lines.asMap().entries.map((entry) {
                    final line = entry.value;
                    final isHunk = line.startsWith('@@');
                    final isAdded = line.startsWith('+') && !line.startsWith('+++');
                    final isRemoved = line.startsWith('-') && !line.startsWith('---');

                    Color lineBg = Colors.transparent;
                    Color textColor = defaultTextColor;

                    if (isAdded) {
                      lineBg = AppColors.success.withValues(alpha: 0.15);
                      textColor = AppColors.success;
                      newLineNum++;
                    } else if (isRemoved) {
                      lineBg = AppColors.error.withValues(alpha: 0.15);
                      textColor = AppColors.error;
                      oldLineNum++;
                    } else if (isHunk) {
                      lineBg = AppColors.primary.withValues(alpha: 0.1);
                      textColor = AppColors.primary;
                    } else {
                      oldLineNum++;
                      newLineNum++;
                    }

                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 1.5,
                      ),
                      color: lineBg,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 32,
                            child: Text(
                              isHunk ? '...' : (entry.key + 1).toString(),
                              style: AppTypography.code.copyWith(
                                fontSize: 11,
                                color: lineNumColor,
                              ),
                              textAlign: TextAlign.right,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          SelectableText(
                            line,
                            style: AppTypography.code.copyWith(
                              fontSize: 12,
                              color: textColor,
                              fontWeight: isAdded || isRemoved || isHunk
                                  ? FontWeight.w500
                                  : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
