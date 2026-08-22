import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_theme.dart';
import '../../controllers/autocomplete_controller.dart';
import '../../data/models/chat_attachment.dart';
import '../../models/autocomplete_item.dart';
import 'attachment_preview.dart';
import 'attachment_preview_bar.dart';
import 'autocomplete_popover.dart';
import 'compact_button.dart';
import 'context_ring.dart';

class ChatInputBar extends StatefulWidget {
  final bool isStreaming;
  final List<String> attachments;
  final List<ChatAttachment>? pendingAttachments;
  final String? currentModelName;
  final int contextUsed;
  final int contextLimit;
  final bool isCompacting;
  final VoidCallback? onCompact;
  final List<String> sentHistory;
  final String? Function(int delta)? onNavigateHistory;
  final ValueChanged<String> onSend;
  final VoidCallback onStop;
  final VoidCallback onPickAttachment;
  final ValueChanged<int> onRemoveAttachment;
  final VoidCallback onOpenModelSelector;
  final VoidCallback? onOpenSkillsSelector;
  final VoidCallback? onOpenToolsSelector;
  final TextEditingController? controller;
  final AutocompleteController? autocompleteController;

  const ChatInputBar({
    super.key,
    required this.isStreaming,
    this.attachments = const [],
    this.pendingAttachments,
    this.currentModelName,
    this.contextUsed = 0,
    this.contextLimit = 0,
    this.isCompacting = false,
    this.onCompact,
    this.sentHistory = const [],
    this.onNavigateHistory,
    required this.onSend,
    required this.onStop,
    required this.onPickAttachment,
    required this.onRemoveAttachment,
    required this.onOpenModelSelector,
    this.onOpenSkillsSelector,
    this.onOpenToolsSelector,
    this.controller,
    this.autocompleteController,
  });

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  late final TextEditingController _controller;
  late final AutocompleteController _autocomplete;
  late final bool _isExternalController;
  late final bool _isExternalAutocomplete;
  final FocusNode _focusNode = FocusNode();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _isExternalController = widget.controller != null;
    _controller = widget.controller ?? TextEditingController();
    _controller.addListener(_handleTextChange);

    _isExternalAutocomplete = widget.autocompleteController != null;
    _autocomplete = widget.autocompleteController ?? AutocompleteController();

    _focusNode.addListener(_handleFocusChange);

    _hasText = _controller.text.trim().isNotEmpty;
  }

  void _handleFocusChange() {
    if (mounted) {
      setState(() {});
    }
  }

  void _handleTextChange() {
    final hasContent = _controller.text.trim().isNotEmpty;
    if (hasContent != _hasText) {
      setState(() {
        _hasText = hasContent;
      });
    }

    final selection = _controller.selection;
    final cursor = selection.isValid ? selection.baseOffset : _controller.text.length;
    _autocomplete.onTextChanged(_controller.text, cursor);
  }

  @override
  void dispose() {
    _controller.removeListener(_handleTextChange);
    _focusNode.removeListener(_handleFocusChange);
    _focusNode.dispose();
    if (!_isExternalController) {
      _controller.dispose();
    }
    if (!_isExternalAutocomplete) {
      _autocomplete.dispose();
    }
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty && widget.attachments.isEmpty) return;

    widget.onSend(text);
    _controller.clear();
    _autocomplete.dismiss();
  }

  void _onSelectAutocompleteItem(AutocompleteItem item) {
    final selection = _controller.selection;
    final cursor = selection.isValid ? selection.baseOffset : _controller.text.length;
    final result = _autocomplete.selectItem(item, _controller.text, cursor);

    _controller.value = TextEditingValue(
      text: result.text,
      selection: TextSelection.collapsed(offset: result.selectionOffset),
    );
  }

  void _navigateHistory(int delta) {
    if (widget.onNavigateHistory != null) {
      final text = widget.onNavigateHistory!(delta);
      if (text != null) {
        _controller.text = text;
        _controller.selection = TextSelection.fromPosition(
          TextPosition(offset: _controller.text.length),
        );
      }
    }
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final isEnter = event.logicalKey == LogicalKeyboardKey.enter ||
        event.logicalKey == LogicalKeyboardKey.numpadEnter;
    final isEscape = event.logicalKey == LogicalKeyboardKey.escape;
    final isArrowUp = event.logicalKey == LogicalKeyboardKey.arrowUp;
    final isArrowDown = event.logicalKey == LogicalKeyboardKey.arrowDown;

    if (_autocomplete.isVisible) {
      if (isEscape) {
        _autocomplete.dismiss();
        return KeyEventResult.handled;
      }
      if (isArrowUp) {
        _autocomplete.moveSelection(-1);
        return KeyEventResult.handled;
      }
      if (isArrowDown) {
        _autocomplete.moveSelection(1);
        return KeyEventResult.handled;
      }
      if (isEnter) {
        final item = _autocomplete.selectedItem;
        if (item != null) {
          _onSelectAutocompleteItem(item);
          return KeyEventResult.handled;
        }
      }
    }

    if (isEnter && !HardwareKeyboard.instance.isShiftPressed) {
      _handleSend();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final activeBorderColor = isDark ? AppColors.darkRing : AppColors.lightPrimary;
    final hasAttachments = (widget.pendingAttachments != null && widget.pendingAttachments!.isNotEmpty) ||
        widget.attachments.isNotEmpty;
    final canSend = _hasText || hasAttachments;
    final usedRatio = widget.contextLimit > 0 ? (widget.contextUsed / widget.contextLimit) : 0.0;
    final showCompact = usedRatio > 0.85 && widget.onCompact != null;
    final isFocused = _focusNode.hasFocus;

    return Container(
      color: Colors.transparent,
      child: SafeArea(
        top: false,
        bottom: true,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.xs,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AutocompletePopover(
                controller: _autocomplete,
                onSelectItem: _onSelectAutocompleteItem,
                onDismiss: () => _autocomplete.dismiss(),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(24.0),
                  border: Border.all(
                    color: isFocused
                        ? activeBorderColor
                        : (widget.isStreaming
                            ? activeBorderColor.withValues(alpha: 0.5)
                            : borderColor),
                    width: isFocused ? 1.5 : 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isDark
                          ? Colors.black.withValues(alpha: 0.35)
                          : Colors.black.withValues(alpha: 0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (widget.pendingAttachments != null && widget.pendingAttachments!.isNotEmpty)
                        AttachmentPreviewBar(
                          attachments: widget.pendingAttachments!,
                          onRemove: widget.onRemoveAttachment,
                        )
                      else if (widget.attachments.isNotEmpty)
                        AttachmentPreview(
                          imagePaths: widget.attachments,
                          onRemove: widget.onRemoveAttachment,
                        ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.md,
                          AppSpacing.lg,
                          AppSpacing.xs,
                        ),
                        child: Focus(
                          focusNode: _focusNode,
                          onKeyEvent: _handleKeyEvent,
                          child: TextField(
                            controller: _controller,
                            minLines: 1,
                            maxLines: 6,
                            keyboardType: TextInputType.multiline,
                            textInputAction: TextInputAction.newline,
                            style: AppTypography.bodyMedium.copyWith(
                              color: isDark
                                  ? AppColors.darkForeground
                                  : AppColors.lightForeground,
                            ),
                            decoration: InputDecoration(
                              hintText: widget.isStreaming
                                  ? 'Send steering instruction...'
                                  : 'Message Spaces... (/ for tools, @ for mentions)',
                              hintStyle: AppTypography.bodyMedium.copyWith(
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.sm,
                          AppSpacing.xs,
                          AppSpacing.sm,
                          AppSpacing.sm,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                physics: const BouncingScrollPhysics(),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      key: const Key('chat_attachment_button'),
                                      icon: const Icon(Icons.attach_file),
                                      tooltip: 'Attach file or image',
                                      iconSize: 20,
                                      padding: const EdgeInsets.all(6),
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                      color: isDark
                                          ? AppColors.mutedForeground
                                          : AppColors.textSecondaryLight,
                                      onPressed: widget.onPickAttachment,
                                    ),
                                    const SizedBox(width: 4),
                                    InkWell(
                                      key: const Key('chat_model_selector_button'),
                                      onTap: widget.onOpenModelSelector,
                                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? AppColors.darkSurface
                                              : AppColors.lightSurface,
                                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                          border: Border.all(
                                            color: isDark
                                                ? AppColors.darkBorder
                                                : AppColors.lightBorder,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.psychology_outlined,
                                              size: 15,
                                              color: isDark
                                                ? AppColors.mutedForeground
                                                : AppColors.textSecondaryLight,
                                            ),
                                            const SizedBox(width: 4),
                                            ConstrainedBox(
                                              constraints: const BoxConstraints(maxWidth: 90),
                                              child: Text(
                                                widget.currentModelName ?? 'Default',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: AppTypography.labelSmall.copyWith(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark
                                                      ? AppColors.darkForeground
                                                      : AppColors.lightForeground,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 2),
                                            Icon(
                                              Icons.keyboard_arrow_down,
                                              size: 14,
                                              color: isDark
                                                  ? AppColors.mutedForeground
                                                  : AppColors.textSecondaryLight,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    if (widget.onOpenSkillsSelector != null) ...[
                                      IconButton(
                                        key: const Key('chat_skills_selector_button'),
                                        icon: const Icon(Icons.bolt_outlined),
                                        tooltip: 'Workspace skills',
                                        iconSize: 20,
                                        padding: const EdgeInsets.all(6),
                                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                        color: isDark
                                            ? AppColors.mutedForeground
                                            : AppColors.textSecondaryLight,
                                        onPressed: widget.onOpenSkillsSelector,
                                      ),
                                      const SizedBox(width: 2),
                                    ],
                                    if (widget.onOpenToolsSelector != null) ...[
                                      IconButton(
                                        key: const Key('chat_tools_selector_button'),
                                        icon: const Icon(Icons.tune_outlined),
                                        tooltip: 'Tools configuration',
                                        iconSize: 20,
                                        padding: const EdgeInsets.all(6),
                                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                        color: isDark
                                            ? AppColors.mutedForeground
                                            : AppColors.textSecondaryLight,
                                        onPressed: widget.onOpenToolsSelector,
                                      ),
                                      const SizedBox(width: 2),
                                    ],
                                    if (widget.sentHistory.isNotEmpty && widget.onNavigateHistory != null) ...[
                                      Tooltip(
                                        message: 'Previous message (history)',
                                        child: InkWell(
                                          key: const Key('history_up_button'),
                                          onTap: () => _navigateHistory(1),
                                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                          child: Padding(
                                            padding: const EdgeInsets.all(4.0),
                                            child: Icon(
                                              Icons.arrow_upward,
                                              size: 14,
                                              color: isDark
                                                  ? AppColors.mutedForeground
                                                  : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 2),
                                      Tooltip(
                                        message: 'Next message (history)',
                                        child: InkWell(
                                          key: const Key('history_down_button'),
                                          onTap: () => _navigateHistory(-1),
                                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                          child: Padding(
                                            padding: const EdgeInsets.all(4.0),
                                            child: Icon(
                                              Icons.arrow_downward,
                                              size: 14,
                                              color: isDark
                                                  ? AppColors.mutedForeground
                                                  : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                    ],
                                    if (showCompact) ...[
                                      CompactButton(
                                        onCompact: widget.onCompact!,
                                        isLoading: widget.isCompacting,
                                      ),
                                      const SizedBox(width: 4),
                                    ],
                                    if (widget.contextLimit > 0 || widget.contextUsed > 0)
                                      ContextRing(
                                        used: widget.contextUsed,
                                        limit: widget.contextLimit > 0 ? widget.contextLimit : 1,
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (widget.isStreaming && !_hasText)
                              IconButton(
                                key: const Key('stop_streaming_button'),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                                icon: Container(
                                  width: 34,
                                  height: 34,
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
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                                icon: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: canSend
                                        ? (isDark ? AppColors.darkRing : AppColors.lightPrimary)
                                        : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.arrow_upward,
                                    size: 18,
                                    color: canSend
                                        ? (isDark ? AppColors.black : AppColors.lightPrimaryForeground)
                                        : (isDark
                                            ? AppColors.mutedForeground
                                            : AppColors.textSecondaryLight),
                                  ),
                                ),
                                tooltip: widget.isStreaming
                                    ? 'Send steering instruction'
                                    : 'Send message',
                                onPressed: canSend ? _handleSend : null,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

