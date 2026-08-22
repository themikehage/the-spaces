import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import 'markdown_block.dart';

class ApprovalForm extends StatefulWidget {
  final ApprovalRequest request;
  final void Function(bool approved)? onResolve;

  const ApprovalForm({
    super.key,
    required this.request,
    this.onResolve,
  });

  @override
  State<ApprovalForm> createState() => _ApprovalFormState();
}

class _ApprovalFormState extends State<ApprovalForm> {
  late ValueNotifier<int> _countdownNotifier;
  Timer? _timer;
  bool _detailsExpanded = false;
  bool _isResolving = false;

  @override
  void initState() {
    super.initState();
    final initialTimeout = widget.request.timeoutSeconds > 0
        ? widget.request.timeoutSeconds
        : 15;
    _countdownNotifier = ValueNotifier<int>(initialTimeout);

    if (!widget.request.resolved) {
      _startCountdown();
    }
  }

  void _startCountdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdownNotifier.value > 1) {
        _countdownNotifier.value--;
      } else {
        _countdownNotifier.value = 0;
        _timer?.cancel();
        _handleResolve(false);
      }
    });
  }

  void _handleResolve(bool approved) {
    if (_isResolving || widget.request.resolved) return;
    _timer?.cancel();
    setState(() {
      _isResolving = true;
    });
    widget.onResolve?.call(approved);
  }

  @override
  void didUpdateWidget(covariant ApprovalForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.request.resolved && !oldWidget.request.resolved) {
      _timer?.cancel();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _countdownNotifier.dispose();
    super.dispose();
  }

  String _formatDetails(Map<String, dynamic> args) {
    try {
      return const JsonEncoder.withIndent('  ').convert(args);
    } catch (_) {
      return args.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final req = widget.request;
    final severity = req.severity.toLowerCase();

    final Color accentColor;
    final IconData severityIcon;

    if (severity == 'critical') {
      accentColor = AppColors.error;
      severityIcon = Icons.warning_amber_rounded;
    } else if (severity == 'info') {
      accentColor = AppColors.primary;
      severityIcon = Icons.info_outline;
    } else {
      accentColor = AppColors.warning;
      severityIcon = Icons.help_outline;
    }

    final cardBg = isDark
        ? AppColors.darkCard
        : AppColors.lightCard;
    final borderSideColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
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
            width: 4,
            child: Container(color: accentColor),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.08),
                    border: Border(
                      bottom: BorderSide(
                        color: borderSideColor,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(severityIcon, size: 18, color: accentColor),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              req.toolName.isNotEmpty ? req.toolName : 'Tool Approval',
                              style: AppTypography.titleSmall.copyWith(
                                color: isDark
                                    ? AppColors.darkForeground
                                    : AppColors.lightForeground,
                                fontWeight: FontWeight.bold,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Approval Required',
                              style: AppTypography.labelSmall.copyWith(
                                color: accentColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!req.resolved) ...[
                        ValueListenableBuilder<int>(
                          valueListenable: _countdownNotifier,
                          builder: (context, seconds, _) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: accentColor.withValues(alpha: 0.15),
                                borderRadius:
                                    BorderRadius.circular(AppSpacing.radiusSm),
                              ),
                              child: Text(
                                '${seconds}s',
                                style: AppTypography.labelSmall.copyWith(
                                  color: accentColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            );
                          },
                        ),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: (req.approvedResult == true
                                    ? AppColors.success
                                    : AppColors.error)
                                .withValues(alpha: 0.15),
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(
                              color: (req.approvedResult == true
                                      ? AppColors.success
                                      : AppColors.error)
                                  .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                req.approvedResult == true
                                    ? Icons.check
                                    : Icons.close,
                                size: 12,
                                color: req.approvedResult == true
                                    ? AppColors.success
                                    : AppColors.error,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                req.approvedResult == true ? 'Approved' : 'Denied',
                                style: AppTypography.labelSmall.copyWith(
                                  color: req.approvedResult == true
                                      ? AppColors.success
                                      : AppColors.error,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (req.message.isNotEmpty)
                        MarkdownBlock(
                          data: req.message,
                          isUser: false,
                        ),
                      if (req.args != null && req.args!.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        InkWell(
                          onTap: () {
                            setState(() {
                              _detailsExpanded = !_detailsExpanded;
                            });
                          },
                          borderRadius:
                              BorderRadius.circular(AppSpacing.radiusSm),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Row(
                              children: [
                                Text(
                                  'Technical details',
                                  style: AppTypography.labelSmall.copyWith(
                                    color: isDark
                                        ? AppColors.mutedForeground
                                        : AppColors.textSecondaryLight,
                                  ),
                                ),
                                Icon(
                                  _detailsExpanded
                                      ? Icons.expand_less
                                      : Icons.expand_more,
                                  size: 16,
                                  color: isDark
                                      ? AppColors.mutedForeground
                                      : AppColors.textSecondaryLight,
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_detailsExpanded) ...[
                          const SizedBox(height: 4),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.black.withValues(alpha: 0.3)
                                  : AppColors.white,
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                              border: Border.all(
                                color: borderSideColor,
                              ),
                            ),
                            child: SelectableText(
                              _formatDetails(req.args!),
                              style: AppTypography.code.copyWith(
                                fontSize: 11,
                                color: isDark
                                    ? AppColors.darkForeground
                                    : AppColors.lightForeground,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
                if (!req.resolved) ...[
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: _isResolving ? null : () => _handleResolve(false),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: isDark
                                ? AppColors.darkForeground
                                : AppColors.lightForeground,
                            side: BorderSide(color: borderSideColor),
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.xs,
                            ),
                            minimumSize: const Size(80, 32),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                          ),
                          child: const Text('Deny'),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        FilledButton(
                          onPressed: _isResolving ? null : () => _handleResolve(true),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.primaryForeground,
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.xs,
                            ),
                            minimumSize: const Size(80, 32),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                          ),
                          child: const Text('Approve'),
                        ),
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
