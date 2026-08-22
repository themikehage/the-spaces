import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';

class MessageFooter extends StatefulWidget {
  final String? provider;
  final String? model;
  final int? inputTokens;
  final int? outputTokens;
  final int? totalTokens;
  final double? costUsd;
  final DateTime? timestamp;
  final String? rawTimestamp;
  final String messageContent;
  final bool initialExpanded;

  const MessageFooter({
    super.key,
    this.provider,
    this.model,
    this.inputTokens,
    this.outputTokens,
    this.totalTokens,
    this.costUsd,
    this.timestamp,
    this.rawTimestamp,
    this.messageContent = '',
    this.initialExpanded = true,
  });

  @override
  State<MessageFooter> createState() => _MessageFooterState();
}

class _MessageFooterState extends State<MessageFooter> {
  late bool _isExpanded;
  bool _copied = false;
  Timer? _copiedTimer;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initialExpanded;
  }

  @override
  void dispose() {
    _copiedTimer?.cancel();
    super.dispose();
  }

  void _copyToClipboard() async {
    if (widget.messageContent.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: widget.messageContent));
    if (!mounted) return;
    setState(() {
      _copied = true;
    });

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Message copied to clipboard'),
        duration: Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    _copiedTimer?.cancel();
    _copiedTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copied = false;
        });
      }
    });
  }

  String _formatTimestamp() {
    DateTime? dt = widget.timestamp;
    if (dt == null && widget.rawTimestamp != null && widget.rawTimestamp!.isNotEmpty) {
      dt = DateTime.tryParse(widget.rawTimestamp!);
    }
    if (dt == null) return '';

    final now = DateTime.now();
    final difference = now.difference(dt);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return DateFormat('HH:mm').format(dt.toLocal());
    } else {
      return DateFormat('MMM d, HH:mm').format(dt.toLocal());
    }
  }

  int? get _computedTotalTokens {
    if (widget.totalTokens != null) return widget.totalTokens;
    if (widget.inputTokens != null || widget.outputTokens != null) {
      return (widget.inputTokens ?? 0) + (widget.outputTokens ?? 0);
    }
    return null;
  }

  String? get _formattedCost {
    if (widget.costUsd == null) return null;
    final cost = widget.costUsd!;
    if (cost < 0.0001 && cost > 0) {
      return '\$${cost.toStringAsFixed(6)}';
    }
    return '\$${cost.toStringAsFixed(4)}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
    final formattedTime = _formatTimestamp();
    final totalTokens = _computedTotalTokens;
    final formattedCost = _formattedCost;

    final hasMetadata = widget.provider != null ||
        widget.model != null ||
        totalTokens != null ||
        formattedCost != null;

    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.sm),
      padding: const EdgeInsets.only(top: AppSpacing.xs),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: (isDark ? AppColors.darkBorder : AppColors.lightBorder).withValues(alpha: 0.5),
            width: 0.8,
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2.0),
        child: _isExpanded
            ? _buildExpandedFooter(
                context,
                isDark: isDark,
                textMuted: textMuted,
                formattedTime: formattedTime,
                totalTokens: totalTokens,
                formattedCost: formattedCost,
                hasMetadata: hasMetadata,
              )
            : _buildCollapsedFooter(
                context,
                isDark: isDark,
                textMuted: textMuted,
                formattedTime: formattedTime,
                hasMetadata: hasMetadata,
              ),
      ),
    );
  }

  Widget _buildCopyButton(BuildContext context, {required bool isDark}) {
    return InkWell(
      onTap: _copyToClipboard,
      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _copied ? Icons.check : Icons.copy_outlined,
              size: 11,
              color: _copied
                  ? AppColors.success
                  : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
            ),
            const SizedBox(width: 3),
            Text(
              _copied ? 'Copied' : 'Copy',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 10,
                color: _copied
                    ? AppColors.success
                    : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpandedFooter(
    BuildContext context, {
    required bool isDark,
    required Color textMuted,
    required String formattedTime,
    required int? totalTokens,
    required String? formattedCost,
    required bool hasMetadata,
  }) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6.0,
      runSpacing: 4.0,
      children: [
        _buildCopyButton(context, isDark: isDark),
        if (widget.provider != null && widget.provider!.isNotEmpty) ...[
          _buildDot(textMuted),
          Text(
            'provider: ${widget.provider}',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
            ),
          ),
        ],
        if (widget.model != null && widget.model!.isNotEmpty) ...[
          _buildDot(textMuted),
          Text(
            'model: ${widget.model}',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
            ),
          ),
        ],
        if (totalTokens != null) ...[
          _buildDot(textMuted),
          Text(
            'tokens: $totalTokens',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
            ),
          ),
        ],
        if (formattedCost != null) ...[
          _buildDot(textMuted),
          Text(
            'cost: $formattedCost',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        if (formattedTime.isNotEmpty) ...[
          _buildDot(textMuted),
          Text(
            formattedTime,
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
            ),
          ),
        ],
        if (hasMetadata) ...[
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = false;
              });
            },
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 1.0),
              child: Icon(
                Icons.unfold_less,
                size: 13,
                color: textMuted,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCollapsedFooter(
    BuildContext context, {
    required bool isDark,
    required Color textMuted,
    required String formattedTime,
    required bool hasMetadata,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildCopyButton(context, isDark: isDark),
        if (formattedTime.isNotEmpty) ...[
          _buildDot(textMuted),
          Text(
            formattedTime,
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              color: textMuted,
            ),
          ),
        ],
        if (hasMetadata) ...[
          const SizedBox(width: 4),
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = true;
              });
            },
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 1.0),
              child: Icon(
                Icons.unfold_more,
                size: 13,
                color: textMuted,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDot(Color color) {
    return Text(
      '•',
      style: TextStyle(
        fontSize: 10,
        color: color.withValues(alpha: 0.7),
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
