import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import 'markdown_block.dart';
import 'thinking_block.dart';
import 'tool_call_card.dart';

class StreamingBubble extends StatefulWidget {
  final String content;
  final List<ToolCall> toolCalls;
  final String? authToken;

  const StreamingBubble({
    super.key,
    required this.content,
    this.toolCalls = const [],
    this.authToken,
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
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final rawContent = widget.content;
    String? thinkingContent;
    String? mainContent;
    bool isThinkingStreaming = false;

    if (rawContent.contains('<thinking>')) {
      final thinkingEndIdx = rawContent.indexOf('</thinking>');
      final thinkingStartIdx = rawContent.indexOf('<thinking>') + 10;
      if (thinkingEndIdx != -1) {
        thinkingContent = rawContent.substring(thinkingStartIdx, thinkingEndIdx).trim();
        final after = rawContent.substring(thinkingEndIdx + 11).trim();
        mainContent = after.isNotEmpty ? after : null;
        isThinkingStreaming = false;
      } else {
        thinkingContent = rawContent.substring(thinkingStartIdx).trim();
        isThinkingStreaming = true;
      }
    } else {
      mainContent = rawContent.isNotEmpty ? rawContent : null;
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
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
                    size: 13,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(
                'Spaces Agent',
                style: AppTypography.labelMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                  border: Border.all(
                    color: AppColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  'generating...',
                  style: AppTypography.labelSmall.copyWith(
                    fontSize: 10,
                    color: AppColors.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          if (thinkingContent != null) ...[
            ThinkingBlock(
              content: thinkingContent,
              isStreaming: isThinkingStreaming,
              initiallyExpanded: true,
            ),
            if (mainContent != null && mainContent.isNotEmpty)
              const SizedBox(height: AppSpacing.sm),
          ],

          if (mainContent != null && mainContent.isNotEmpty) ...[
            MarkdownBlock(
              data: mainContent,
              isUser: false,
              authToken: widget.authToken,
            ),
            const SizedBox(height: 4),
          ],

          if (!isThinkingStreaming) ...[
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (thinkingContent == null && (mainContent == null || mainContent.isEmpty)) ...[
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
          ],

          if (widget.toolCalls.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            ...widget.toolCalls.map(
              (tc) => ToolCallCard(toolCall: tc, authToken: widget.authToken),
            ),
          ],
        ],
      ),
    );
  }
}
