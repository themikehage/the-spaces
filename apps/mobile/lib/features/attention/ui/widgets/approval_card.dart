import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/attention_item.dart';

class ApprovalCard extends StatefulWidget {
  final AttentionItem item;
  final Future<void> Function(bool approved) onRespond;
  final VoidCallback? onOpenSession;

  const ApprovalCard({
    super.key,
    required this.item,
    required this.onRespond,
    this.onOpenSession,
  });

  @override
  State<ApprovalCard> createState() => _ApprovalCardState();
}

class _ApprovalCardState extends State<ApprovalCard> {
  bool _isSubmitting = false;
  Timer? _timer;
  int _secondsLeft = 0;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    if (widget.item.expiresAt != null) {
      final now = DateTime.now().millisecondsSinceEpoch;
      _secondsLeft = ((widget.item.expiresAt! - now) / 1000).ceil();
      if (_secondsLeft > 0) {
        _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (!mounted) {
            timer.cancel();
            return;
          }
          final currentNow = DateTime.now().millisecondsSinceEpoch;
          final remaining = ((widget.item.expiresAt! - currentNow) / 1000).ceil();
          setState(() {
            _secondsLeft = remaining > 0 ? remaining : 0;
          });
          if (_secondsLeft <= 0) {
            timer.cancel();
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submit(bool approved) async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    try {
      await widget.onRespond(approved);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;

    return Card(
      key: Key('approval_card_${item.approvalId}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.darkBorder, width: 1),
      ),
      color: AppColors.darkSurface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.shield_outlined,
                            size: 14,
                            color: AppColors.warning,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            item.toolName.isNotEmpty ? item.toolName : 'Approval',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (item.expiresAt != null && _secondsLeft > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.darkBackground,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppColors.darkBorder),
                        ),
                        child: Text(
                          '${_secondsLeft}s',
                          style: const TextStyle(
                            fontSize: 10,
                            fontFamily: 'monospace',
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (widget.onOpenSession != null)
                  InkWell(
                    key: Key('open_session_appr_${item.approvalId}'),
                    onTap: widget.onOpenSession,
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            item.sessionId.length > 8
                                ? '${item.sessionId.substring(0, 8)}...'
                                : item.sessionId,
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.mutedForeground,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.open_in_new_rounded,
                            size: 12,
                            color: AppColors.mutedForeground,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (item.commandPreview.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.darkBackground,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Text(
                  item.commandPreview,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: AppColors.darkForeground,
                  ),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 10),
            ],
            if (item.reason.isNotEmpty)
              Text(
                item.reason,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
              ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    key: Key('approval_deny_btn_${item.approvalId}'),
                    onPressed: _isSubmitting ? null : () => _submit(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.destructive,
                      side: const BorderSide(color: AppColors.destructive),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              semanticsLabel: 'Denying approval',
                            ),
                          )
                        : const Text(
                            'Deny',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    key: Key('approval_approve_btn_${item.approvalId}'),
                    onPressed: _isSubmitting ? null : () => _submit(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.darkBackground,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.darkBackground,
                              semanticsLabel: 'Submitting approval',
                            ),
                          )
                        : const Text(
                            'Approve',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
