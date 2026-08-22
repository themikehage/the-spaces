import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import 'markdown_block.dart';

class ThinkingBlock extends StatefulWidget {
  final String content;
  final bool isStreaming;
  final bool? initiallyExpanded;

  const ThinkingBlock({
    super.key,
    required this.content,
    this.isStreaming = false,
    this.initiallyExpanded,
  });

  @override
  State<ThinkingBlock> createState() => _ThinkingBlockState();
}

class _ThinkingBlockState extends State<ThinkingBlock>
    with SingleTickerProviderStateMixin {
  late bool _expanded;
  late AnimationController _cursorController;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded ?? (widget.content.length <= 200);
    _cursorController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    if (widget.isStreaming) {
      _cursorController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant ThinkingBlock oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initiallyExpanded != null &&
        widget.initiallyExpanded != oldWidget.initiallyExpanded) {
      _expanded = widget.initiallyExpanded!;
    }
    if (widget.isStreaming != oldWidget.isStreaming) {
      if (widget.isStreaming) {
        _cursorController.repeat(reverse: true);
      } else {
        _cursorController.stop();
      }
    }
  }

  @override
  void dispose() {
    _cursorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = AppColors.primary;
    final mutedColor = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
    final cardBg = isDark
        ? AppColors.darkSurface.withValues(alpha: 0.5)
        : AppColors.lightSurface;
    final borderSideColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: borderSideColor),
      ),
      child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: 3.5,
            child: Container(
              color: primaryColor,
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 3.5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InkWell(
                  onTap: () {
                    setState(() {
                      _expanded = !_expanded;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.psychology_alt,
                          size: 16,
                          color: primaryColor,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          widget.isStreaming ? 'Thinking...' : 'Thinking',
                          style: AppTypography.titleSmall.copyWith(
                            color: primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        if (widget.isStreaming)
                          FadeTransition(
                            opacity: _cursorController,
                            child: Container(
                              width: 6,
                              height: 12,
                              decoration: BoxDecoration(
                                color: primaryColor,
                                borderRadius: BorderRadius.circular(1),
                              ),
                            ),
                          ),
                        const Spacer(),
                        Icon(
                          _expanded ? Icons.expand_less : Icons.expand_more,
                          size: 18,
                          color: mutedColor,
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
                        if (widget.content.isNotEmpty)
                          MarkdownBlock(
                            data: widget.content,
                            isUser: false,
                          )
                        else if (widget.isStreaming)
                          Text(
                            'Analyzing request...',
                            style: AppTypography.bodySmall.copyWith(
                              fontStyle: FontStyle.italic,
                              color: mutedColor,
                            ),
                          ),
                        if (widget.isStreaming && widget.content.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          FadeTransition(
                            opacity: _cursorController,
                            child: Container(
                              width: 7,
                              height: 13,
                              decoration: BoxDecoration(
                                color: primaryColor,
                                borderRadius: BorderRadius.circular(1),
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
          ),
        ],
      ),
    );
  }
}
