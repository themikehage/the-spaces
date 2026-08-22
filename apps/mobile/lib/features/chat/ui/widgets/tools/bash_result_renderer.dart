import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class BashResultRenderer extends StatelessWidget {
  final ToolCall toolCall;

  const BashResultRenderer({
    super.key,
    required this.toolCall,
  });

  String _extractCommand() {
    final args = toolCall.arguments;
    final cmd = args['command'] ??
        args['CommandLine'] ??
        args['cmd'] ??
        args['script'];
    return cmd?.toString() ?? '';
  }

  String _extractOutput() {
    final result = toolCall.result;
    if (result == null) return '';
    if (result is String) return result;
    if (result is Map) {
      final out = result['output'] ??
          result['stdout'] ??
          result['stderr'] ??
          result['result'] ??
          result['content'];
      if (out != null) return out.toString();
    }
    return result.toString();
  }

  int? _extractExitCode() {
    final result = toolCall.result;
    if (result is Map) {
      final code = result['exitCode'] ?? result['code'] ?? result['status_code'];
      if (code is int) return code;
      if (code != null) return int.tryParse(code.toString());
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final command = _extractCommand();
    final output = _extractOutput();
    final exitCode = _extractExitCode();

    final isError = toolCall.isError || (exitCode != null && exitCode != 0);
    final exitLabel = exitCode != null
        ? (exitCode == 0 ? 'OK' : 'Exit $exitCode')
        : (isError ? 'Failed' : 'OK');
    final exitColor = isError ? AppColors.error : AppColors.success;

    final codeBg = isDark ? AppColors.darkBackground : AppColors.darkCard;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (command.isNotEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
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
                const Text(
                  '\$',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: SelectableText(
                    command,
                    style: AppTypography.code.copyWith(
                       fontSize: 12,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: exitColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    border: Border.all(
                      color: exitColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    exitLabel,
                    style: AppTypography.labelSmall.copyWith(
                      color: exitColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (output.isNotEmpty) ...[
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
                    output,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      height: 1.45,
                      color: AppColors.darkForeground,
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
