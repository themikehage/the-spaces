import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';

class ToolCallCard extends StatefulWidget {
  final ToolCall toolCall;
  final bool initialExpanded;

  const ToolCallCard({
    super.key,
    required this.toolCall,
    this.initialExpanded = false,
  });

  @override
  State<ToolCallCard> createState() => _ToolCallCardState();
}

class _ToolCallCardState extends State<ToolCallCard> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initialExpanded;
  }

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
    final tc = widget.toolCall;

    final Color statusColor;
    final Widget statusIcon;
    final String statusLabel;

    if (tc.isRunning) {
      statusColor = AppColors.warning;
      statusIcon = const SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.warning),
          semanticsLabel: 'Tool executing',
        ),
      );
      statusLabel = 'Running';
    } else if (tc.isError) {
      statusColor = AppColors.error;
      statusIcon = const Icon(Icons.close, size: 14, color: AppColors.error);
      statusLabel = 'Error';
    } else {
      statusColor = AppColors.success;
      statusIcon = const Icon(Icons.check, size: 14, color: AppColors.success);
      statusLabel = 'Completed';
    }

    final formattedArgs = _formatJson(tc.arguments);
    final formattedResult = tc.result != null ? _formatJson(tc.result) : null;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F1F5),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _expanded = !_expanded;
              });
            },
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.build_outlined,
                    size: 16,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      tc.name.isNotEmpty ? tc.name : 'Tool execution',
                      style: AppTypography.titleSmall.copyWith(
                        fontFamily: 'monospace',
                        color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        statusIcon,
                        const SizedBox(width: 4),
                        Text(
                          statusLabel,
                          style: AppTypography.labelSmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    size: 18,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (formattedArgs.isNotEmpty && formattedArgs != '{}') ...[
                    Text(
                      'ARGUMENTS',
                      style: AppTypography.labelSmall.copyWith(
                        color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: SelectableText(
                        formattedArgs,
                        style: AppTypography.code.copyWith(
                          fontSize: 12,
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                  if (formattedResult != null && formattedResult.isNotEmpty) ...[
                    Text(
                      'RESULT',
                      style: AppTypography.labelSmall.copyWith(
                        color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: SelectableText(
                        formattedResult,
                        style: AppTypography.code.copyWith(
                          fontSize: 12,
                          color: tc.isError
                              ? AppColors.error
                              : (isDark ? AppColors.darkForeground : AppColors.lightForeground),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
