import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import 'markdown_block.dart';
import 'tool_call_card.dart';

class StreamingBubble extends StatefulWidget {
  final String content;
  final List<ToolCall> toolCalls;

  const StreamingBubble({
    super.key,
    required this.content,
    this.toolCalls = const [],
  });

  @override
  State<StreamingBubble> createState() => _StreamingBubbleState();
}

class _StreamingBubbleState extends State<StreamingBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _cursorController;

  @override
  void initState() {
    super.initState();
    _cursorController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _cursorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bubbleBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final bubbleBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            margin: const EdgeInsets.only(right: AppSpacing.sm, top: 2),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              shape: BoxShape.circle,
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.auto_awesome,
                size: 18,
                color: AppColors.primary,
              ),
            ),
          ),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: bubbleBg,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(AppSpacing.radiusXl),
                  topRight: Radius.circular(AppSpacing.radiusXl),
                  bottomLeft: Radius.circular(AppSpacing.radiusSm),
                  bottomRight: Radius.circular(AppSpacing.radiusXl),
                ),
                border: Border.all(color: bubbleBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.content.isNotEmpty) ...[
                    MarkdownBlock(
                      data: widget.content,
                      isUser: false,
                    ),
                    const SizedBox(height: 4),
                  ],
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.content.isEmpty) ...[
                        Text(
                          'Thinking...',
                          style: AppTypography.bodySmall.copyWith(
                            fontStyle: FontStyle.italic,
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      FadeTransition(
                        opacity: _cursorController,
                        child: Container(
                          width: 8,
                          height: 15,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (widget.toolCalls.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    ...widget.toolCalls.map(
                      (tc) => ToolCallCard(toolCall: tc),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
