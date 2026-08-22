import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_theme.dart';
import '../../controllers/autocomplete_controller.dart';
import '../../data/models/chat_attachment.dart';
import '../../models/autocomplete_item.dart';
import '../chat_state.dart';
import 'attachment_preview.dart';
import 'attachment_preview_bar.dart';
import 'autocomplete_popover.dart';
import 'chat_input_header_row.dart';

class ChatInputBar extends StatefulWidget {
  final bool isStreaming;
  final List<String> attachments;
  final List<ChatAttachment>? pendingAttachments;
  final String? currentModelName;
  final int contextUsed;
  final int contextLimit;
  final bool isCompacting;
  final VoidCallback? onCompact;
  final InputMode inputMode;
  final ValueChanged<InputMode>? onInputModeChanged;
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
    this.inputMode = InputMode.steer,
    this.onInputModeChanged,
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

    _hasText = _controller.text.trim().isNotEmpty;
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
    _focusNode.dispose();
    if (!_isExternalController) {
      _controller.dispose();
    }
    if (!_isExternalAutocomplete) {
      _autocomplete.dispose();
    }
    super.dispose();
  }

  void _handleSend([bool? forceFollowUp]) {
    final text = _controller.text.trim();
    if (text.isEmpty && widget.attachments.isEmpty) return;

    if (forceFollowUp == true && widget.onInputModeChanged != null) {
      widget.onInputModeChanged!(InputMode.followup);
    }

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

    final isAlt = HardwareKeyboard.instance.isAltPressed;
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
      if (isEnter && !isAlt) {
        final item = _autocomplete.selectedItem;
        if (item != null) {
          _onSelectAutocompleteItem(item);
          return KeyEventResult.handled;
        }
      }
    }

    if (isEnter && isAlt) {
      _handleSend(true);
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final inputBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final hasAttachments = (widget.pendingAttachments != null && widget.pendingAttachments!.isNotEmpty) ||
        widget.attachments.isNotEmpty;
    final canSend = _hasText || hasAttachments;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        border: Border(top: BorderSide(color: borderColor)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AutocompletePopover(
              controller: _autocomplete,
              onSelectItem: _onSelectAutocompleteItem,
              onDismiss: () => _autocomplete.dismiss(),
            ),
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
            ChatInputHeaderRow(
              inputMode: widget.inputMode,
              onInputModeChanged: widget.onInputModeChanged,
              sentHistory: widget.sentHistory,
              onNavigateHistory: (delta) => _navigateHistory(delta),
              contextUsed: widget.contextUsed,
              contextLimit: widget.contextLimit,
              isCompacting: widget.isCompacting,
              onCompact: widget.onCompact,
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
                    key: const Key('chat_model_selector_button'),
                    icon: const Icon(Icons.psychology_outlined),
                    tooltip: 'Select model (${widget.currentModelName ?? "Default"})',
                    iconSize: 22,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                    onPressed: widget.onOpenModelSelector,
                  ),
                  if (widget.onOpenSkillsSelector != null)
                    IconButton(
                      key: const Key('chat_skills_selector_button'),
                      icon: const Icon(Icons.bolt_outlined),
                      tooltip: 'Workspace skills',
                      iconSize: 22,
                      color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                      onPressed: widget.onOpenSkillsSelector,
                    ),
                  if (widget.onOpenToolsSelector != null)
                    IconButton(
                      key: const Key('chat_tools_selector_button'),
                      icon: const Icon(Icons.build_outlined),
                      tooltip: 'Tools configuration',
                      iconSize: 22,
                      color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                      onPressed: widget.onOpenToolsSelector,
                    ),
                  IconButton(
                    key: const Key('chat_attachment_button'),
                    icon: const Icon(Icons.attach_file),
                    tooltip: 'Attach file or image',
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
                            hintText: widget.inputMode == InputMode.followup
                                ? 'Send follow-up comment...'
                                : 'Message Spaces... (/ for tools, @ for mentions)',
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
                              ? (widget.inputMode == InputMode.followup
                                  ? AppColors.warning
                                  : AppColors.primary)
                              : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          widget.inputMode == InputMode.followup
                              ? Icons.reply
                              : Icons.arrow_upward,
                          size: 18,
                          color: canSend
                              ? (widget.inputMode == InputMode.followup
                                  ? AppColors.black
                                  : AppColors.primaryForeground)
                              : (isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight),
                        ),
                      ),
                      tooltip: widget.inputMode == InputMode.followup
                          ? 'Send follow-up'
                          : 'Send message',
                      onPressed: canSend ? () => _handleSend() : null,
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
