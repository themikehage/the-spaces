import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import 'attachment_preview.dart';

class ChatInputBar extends StatefulWidget {
  final bool isStreaming;
  final List<String> attachments;
  final String? currentModelName;
  final ValueChanged<String> onSend;
  final VoidCallback onStop;
  final VoidCallback onPickAttachment;
  final ValueChanged<int> onRemoveAttachment;
  final VoidCallback onOpenModelSelector;

  const ChatInputBar({
    super.key,
    required this.isStreaming,
    this.attachments = const [],
    this.currentModelName,
    required this.onSend,
    required this.onStop,
    required this.onPickAttachment,
    required this.onRemoveAttachment,
    required this.onOpenModelSelector,
  });

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  late final TextEditingController _controller;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _controller.addListener(_handleTextChange);
  }

  void _handleTextChange() {
    final hasContent = _controller.text.trim().isNotEmpty;
    if (hasContent != _hasText) {
      setState(() {
        _hasText = hasContent;
      });
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_handleTextChange);
    _controller.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty && widget.attachments.isEmpty) return;
    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final inputBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final canSend = _hasText || widget.attachments.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        border: Border(
          top: BorderSide(color: borderColor),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.attachments.isNotEmpty)
              AttachmentPreview(
                imagePaths: widget.attachments,
                onRemove: widget.onRemoveAttachment,
              ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  IconButton(
                    icon: const Icon(Icons.psychology_outlined),
                    tooltip: 'Select model (${widget.currentModelName ?? "Default"})',
                    iconSize: 22,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    onPressed: widget.onOpenModelSelector,
                  ),
                  IconButton(
                    icon: const Icon(Icons.attach_file),
                    tooltip: 'Attach image',
                    iconSize: 22,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    onPressed: widget.onPickAttachment,
                  ),
                  Expanded(
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 140),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: inputBg,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                        border: Border.all(color: borderColor),
                      ),
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 6,
                        keyboardType: TextInputType.multiline,
                        textInputAction: TextInputAction.newline,
                        style: AppTypography.bodyMedium.copyWith(
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Message Spaces...',
                          hintStyle: AppTypography.bodyMedium.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.sm,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  if (widget.isStreaming)
                    IconButton(
                      key: const Key('stop_streaming_button'),
                      icon: Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(
                          color: AppColors.destructive,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.stop,
                          size: 18,
                          color: AppColors.destructiveForeground,
                        ),
                      ),
                      tooltip: 'Stop generation',
                      onPressed: widget.onStop,
                    )
                  else
                    IconButton(
                      key: const Key('send_message_button'),
                      icon: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: canSend
                              ? AppColors.primary
                              : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.arrow_upward,
                          size: 18,
                          color: canSend
                              ? AppColors.primaryForeground
                              : (isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight),
                        ),
                      ),
                      tooltip: 'Send message',
                      onPressed: canSend ? _handleSend : null,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
