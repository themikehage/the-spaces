import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import '../../models/message_block.dart';
import '../../utils/message_block_parser.dart';
import 'approval_form.dart';
import 'ask_question_form.dart';
import 'attached_file_card.dart';
import 'branch_nav.dart';
import 'delegation_notification.dart';
import 'markdown_block.dart';
import 'message_blocks/audio_block.dart';
import 'message_blocks/code_block.dart';
import 'message_blocks/html_block.dart';
import 'message_blocks/pdf_block.dart';
import 'message_blocks/video_block.dart';
import 'message_footer.dart';
import 'subagent_live_view.dart';
import 'system_message_card.dart';
import 'thinking_block.dart';
import 'tool_call_card.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final String? authToken;
  final void Function(bool approved)? onResolveApproval;
  final void Function(List<String> selectedOptions, String? customAnswer)? onAnswerQuestion;
  final ValueChanged<String>? onNavigateBranch;

  const MessageBubble({
    super.key,
    required this.message,
    this.authToken,
    this.onResolveApproval,
    this.onAnswerQuestion,
    this.onNavigateBranch,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isDelegation) {
      return DelegationNotification(message: message);
    }

    if (message.isSystem) {
      return SystemMessageCard(message: message);
    }

    if (message.isApprovalRequest && message.approvalRequest != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.xs,
        ),
        child: ApprovalForm(
          request: message.approvalRequest!,
          onResolve: onResolveApproval,
        ),
      );
    }

    if (message.isQuestionRequest && message.questionRequest != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.xs,
        ),
        child: AskQuestionForm(
          request: message.questionRequest!,
          onAnswer: onAnswerQuestion,
        ),
      );
    }

    if (message.isTool) {
      if (message.toolCalls.isNotEmpty) {
        return Column(
          children: message.toolCalls
              .map((tc) => ToolCallCard(toolCall: tc, authToken: authToken))
              .toList(),
        );
      }
      return ToolCallCard(
        toolCall: ToolCall(
          id: message.id,
          name: 'tool_result',
          result: message.content,
          isError: message.isError,
        ),
        authToken: authToken,
      );
    }

    final isUser = message.isUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (isUser) {
      return _buildUserBubble(context, isDark);
    } else {
      return _buildAgentFullWidthMessage(context, isDark);
    }
  }

  Widget _renderBlock(BuildContext context, MessageBlock block, bool isDark, bool isUser) {
    switch (block) {
      case MarkdownBlockData(:final content):
        return MarkdownBlock(
          data: content,
          isUser: isUser,
          authToken: authToken,
        );
      case CodeBlockData(:final code, :final language):
        return CodeBlockWidget(
          code: code,
          language: language,
        );
      case AudioBlockData(:final url, :final title, :final artist, :final coverImage):
        return AudioBlockWidget(
          url: url,
          title: title,
          artist: artist,
          coverImage: coverImage,
          authToken: authToken,
        );
      case VideoBlockData(:final url, :final title, :final thumbnail):
        return VideoBlockWidget(
          url: url,
          title: title,
          thumbnail: thumbnail,
          authToken: authToken,
        );
      case PdfBlockData(:final url, :final title, :final page, :final scale):
        return PdfBlockWidget(
          url: url,
          title: title,
          page: page,
          scale: scale,
        );
      case HtmlBlockData(:final html, :final title):
        return HtmlBlockWidget(
          html: html,
          title: title,
        );
    }
  }

  static final RegExp _attachedFileRegex =
      RegExp(r'\[Attached File:\s*([^\]\n]+)\](?:\s*\([^\n)]+\))?', caseSensitive: false);

  Widget _buildUserBubble(BuildContext context, bool isDark) {
    final attachedPaths = <String>[];
    for (final match in _attachedFileRegex.allMatches(message.content)) {
      final p = match.group(1)?.trim();
      if (p != null && p.isNotEmpty) {
        attachedPaths.add(p);
      }
    }

    final cleanedContent = message.content.replaceAll(_attachedFileRegex, '').trim();
    final blocks = MessageBlockParser.parseBlocks(cleanedContent.isNotEmpty ? cleanedContent : message.content);
    final hasSiblings = message.siblings != null && message.siblings!.length > 1;
    final isFollowUp = message.steerMode == 'follow_up' || message.steerMode == 'followup';
    final hasSteerMode = message.steerMode != null && message.steerMode!.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: AppSpacing.xxl),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(AppSpacing.radiusXl),
                  topRight: Radius.circular(AppSpacing.radiusXl),
                  bottomLeft: Radius.circular(AppSpacing.radiusXl),
                  bottomRight: Radius.circular(AppSpacing.radiusSm),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Steer Mode Badge (STEERING / FOLLOW-UP)
                  if (hasSteerMode) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isFollowUp
                            ? AppColors.darkPrimary
                            : AppColors.chart3Light,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Text(
                        isFollowUp ? 'FOLLOW-UP' : 'STEERING',
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 8.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: AppColors.white,
                        ),
                      ),
                    ),
                  ],

                  // Content blocks
                  if (blocks.isEmpty && cleanedContent.isNotEmpty)
                    MarkdownBlock(
                      data: cleanedContent,
                      isUser: true,
                      authToken: authToken,
                    )
                  else if (blocks.isNotEmpty)
                    ...blocks.map((b) => _renderBlock(context, b, isDark, true)),

                  // Attached files cards
                  if (attachedPaths.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    ...attachedPaths.map(
                      (p) => AttachedFileCard(
                        path: p,
                        authToken: authToken,
                      ),
                    ),
                  ],

                  // Branch Navigation if multi-branch
                  if (hasSiblings)
                    BranchNav(
                      siblings: message.siblings!,
                      currentId: message.id,
                      onNavigate: onNavigateBranch,
                      isUser: true,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAgentFullWidthMessage(BuildContext context, bool isDark) {
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final blocks = MessageBlockParser.parseBlocks(message.content);
    final hasSiblings = message.siblings != null && message.siblings!.length > 1;

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
          // Agent Identity Header
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
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          // Thinking Block
          if (message.thinking.isNotEmpty) ...[
            ThinkingBlock(
              content: message.thinking,
              isStreaming: message.isStreaming,
            ),
            if (message.content.isNotEmpty) const SizedBox(height: AppSpacing.sm),
          ],

          // Parsed Blocks Content
          if (message.content.isNotEmpty) ...[
            if (blocks.isEmpty)
              MarkdownBlock(
                data: message.content,
                isUser: false,
                authToken: authToken,
              )
            else
              ...blocks.map((b) => _renderBlock(context, b, isDark, false)),
          ],

          // Tool Calls
          if (message.toolCalls.isNotEmpty) ...[
            if (message.content.isNotEmpty || message.thinking.isNotEmpty)
              const SizedBox(height: AppSpacing.sm),
            ...message.toolCalls.map(
              (tc) => ToolCallCard(toolCall: tc, authToken: authToken),
            ),
          ],

          // Subagent Sessions
          if (message.subagentSessions != null && message.subagentSessions!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            ...message.subagentSessions!.map(
              (session) => SubagentLiveView(
                session: session,
                initiallyExpanded: false,
              ),
            ),
          ],

          // Message Footer (Provider, Model, Tokens, Cost, Timestamp, Copy)
          if (!message.isStreaming) ...[
            MessageFooter(
              provider: message.provider,
              model: message.model,
              inputTokens: message.inputTokens,
              outputTokens: message.outputTokens,
              totalTokens: message.totalTokens,
              costUsd: message.costUsd,
              rawTimestamp: message.createdAt,
              messageContent: message.content,
            ),
          ],

          // Branch Navigation if multi-branch
          if (hasSiblings) ...[
            BranchNav(
              siblings: message.siblings!,
              currentId: message.id,
              onNavigate: onNavigateBranch,
              isUser: false,
            ),
          ],
        ],
      ),
    );
  }
}
