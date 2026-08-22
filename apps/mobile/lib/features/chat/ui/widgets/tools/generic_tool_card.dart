import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class GenericToolCard extends StatelessWidget {
  final ToolCall toolCall;

  const GenericToolCard({
    super.key,
    required this.toolCall,
  });

  String _formatJson(dynamic value) {
    if (value == null) return '';
    if (value is String) {
      try {
        final decoded = jsonDecode(value);
        return const JsonEncoder.withIndent('  ').convert(decoded);
      } catch (_) {
        return value;
      }
    }
    try {
      return const JsonEncoder.withIndent('  ').convert(value);
    } catch (_) {
      return value.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final formattedArgs = _formatJson(toolCall.arguments);
    final formattedResult = toolCall.result != null ? _formatJson(toolCall.result) : null;

    final codeBg = isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white;
    final labelColor = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
    final textColor = isDark ? AppColors.darkForeground : AppColors.lightForeground;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (formattedArgs.isNotEmpty && formattedArgs != '{}') ...[
          Text(
            'ARGUMENTS',
            style: AppTypography.labelSmall.copyWith(
              color: labelColor,
              letterSpacing: 0.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: codeBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: SelectableText(
              formattedArgs,
              style: AppTypography.code.copyWith(
                fontSize: 12,
                color: textColor,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (formattedResult != null && formattedResult.isNotEmpty) ...[
          Text(
            'RESULT',
            style: AppTypography.labelSmall.copyWith(
              color: labelColor,
              letterSpacing: 0.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: codeBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: SelectableText(
              formattedResult,
              style: AppTypography.code.copyWith(
                fontSize: 12,
                color: toolCall.isError ? AppColors.error : textColor,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
