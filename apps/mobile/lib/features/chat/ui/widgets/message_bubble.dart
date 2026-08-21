import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import 'markdown_block.dart';
import 'system_message_card.dart';
import 'tool_call_card.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isSystem) {
      return SystemMessageCard(message: message);
    }

    if (message.isTool) {
      if (message.toolCalls.isNotEmpty) {
        return Column(
          children: message.toolCalls.map((tc) => ToolCallCard(toolCall: tc)).toList(),
        );
      }
      return ToolCallCard(
        toolCall: ToolCall(
          id: message.id,
          name: 'tool_result',
          result: message.content,
          isError: message.isError,
        ),
      );
    }

    final isUser = message.isUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bubbleBg = isUser
        ? AppColors.primary
        : (isDark ? AppColors.darkCard : AppColors.lightCard);

    final bubbleBorder = isUser
        ? Colors.transparent
        : (isDark ? AppColors.darkBorder : AppColors.lightBorder);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
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
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: bubbleBg,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(AppSpacing.radiusXl),
                  topRight: const Radius.circular(AppSpacing.radiusXl),
                  bottomLeft: Radius.circular(
                    isUser ? AppSpacing.radiusXl : AppSpacing.radiusSm,
                  ),
                  bottomRight: Radius.circular(
                    isUser ? AppSpacing.radiusSm : AppSpacing.radiusXl,
                  ),
                ),
                border: Border.all(color: bubbleBorder),
              ),
              child: Column(
                crossAxisAlignment:
                    isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  if (message.content.isNotEmpty)
                    MarkdownBlock(
                      data: message.content,
                      isUser: isUser,
                    ),
                  if (message.toolCalls.isNotEmpty) ...[
                    if (message.content.isNotEmpty)
                      const SizedBox(height: AppSpacing.sm),
                    ...message.toolCalls.map(
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
