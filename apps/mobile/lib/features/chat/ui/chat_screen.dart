import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import 'chat_notifier.dart';
import 'widgets/chat_input_bar.dart';
import 'widgets/message_bubble.dart';
import 'widgets/model_selector_sheet.dart';
import 'widgets/streaming_bubble.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? initialTitle;
  final bool showAppBar;

  const ChatScreen({
    super.key,
    required this.sessionId,
    this.initialTitle,
    this.showAppBar = true,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _autoScrollEnabled = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    // If within 50px of bottom, re-enable auto scroll
    if (maxScroll - currentScroll <= 50) {
      if (!_autoScrollEnabled) {
        _autoScrollEnabled = true;
      }
    } else {
      if (_autoScrollEnabled) {
        _autoScrollEnabled = false;
      }
    }
  }

  void _scrollToBottom([bool immediate = false]) {
    if (!_scrollController.hasClients || !_autoScrollEnabled) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      if (immediate) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      } else {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _openModelSelector() {
    final notifier = ref.read(chatNotifierProvider(widget.sessionId).notifier);
    final state = ref.read(chatNotifierProvider(widget.sessionId));

    ModelSelectorSheet.show(
      context,
      models: state.availableModels,
      currentModelId: state.currentModel?.id,
      onSelectModel: (model) {
        notifier.changeModel(model);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatNotifierProvider(widget.sessionId));
    final notifier = ref.read(chatNotifierProvider(widget.sessionId).notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Reactively trigger auto-scroll during streaming or on new messages
    ref.listen(chatNotifierProvider(widget.sessionId), (previous, next) {
      if (previous?.messages.length != next.messages.length ||
          previous?.streamingContent != next.streamingContent ||
          previous?.isStreaming != next.isStreaming) {
        _scrollToBottom();
      }
    });

    final currentModelName = state.currentModel?.name.isNotEmpty == true
        ? state.currentModel!.name
        : (state.currentModel?.id ?? 'Default');

    final title = widget.initialTitle ?? 'Session ${widget.sessionId.substring(0, widget.sessionId.length > 8 ? 8 : widget.sessionId.length)}';

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: state.isStreaming ? AppColors.warning : AppColors.success,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        state.isStreaming ? 'Streaming...' : currentModelName,
                        style: AppTypography.labelSmall.copyWith(
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.psychology_outlined),
                  tooltip: 'Change Model',
                  onPressed: _openModelSelector,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Reload History',
                  onPressed: () => notifier.loadHistory(),
                ),
              ],
            )
          : null,
      body: Column(
        children: [
          if (state.error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              color: AppColors.error.withValues(alpha: 0.15),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, size: 18, color: AppColors.error),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: state.isLoading && state.messages.isEmpty
                ? const SkeletonList(itemCount: 6)
                : state.messages.isEmpty && !state.isStreaming
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: 48,
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              'How can I help you today?',
                              style: AppTypography.headlineSmall.copyWith(
                                color: isDark
                                    ? AppColors.darkForeground
                                    : AppColors.lightForeground,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Ask anything or give a task to your agent.',
                              style: AppTypography.bodyMedium.copyWith(
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                        itemCount: state.messages.length + (state.isStreaming ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index < state.messages.length) {
                            final msg = state.messages[index];
                            return MessageBubble(
                              key: Key('msg_${msg.id}_$index'),
                              message: msg,
                            );
                          }
                          return StreamingBubble(
                            key: const Key('streaming_bubble_widget'),
                            content: state.streamingContent,
                            toolCalls: state.activeToolCalls,
                          );
                        },
                      ),
          ),
          ChatInputBar(
            isStreaming: state.isStreaming,
            attachments: state.selectedAttachments,
            currentModelName: state.currentModel?.name,
            onSend: (text) => notifier.sendMessage(text),
            onStop: () => notifier.stopStreaming(),
            onPickAttachment: () => notifier.pickAttachment(),
            onRemoveAttachment: (i) => notifier.removeAttachment(i),
            onOpenModelSelector: _openModelSelector,
          ),
        ],
      ),
    );
  }
}
