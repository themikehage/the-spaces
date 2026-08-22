import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import 'attention_notifier.dart';
import 'widgets/approval_card.dart';
import 'widgets/question_card.dart';

class AttentionSheet extends ConsumerWidget {
  const AttentionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.transparent,
      builder: (context) => const AttentionSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attentionState = ref.watch(attentionNotifierProvider);
    final notifier = ref.read(attentionNotifierProvider.notifier);
    final items = attentionState.items;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: AppColors.darkBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AppColors.darkBorder, width: 1),
          left: BorderSide(color: AppColors.darkBorder, width: 1),
          right: BorderSide(color: AppColors.darkBorder, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.darkBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.notifications_active_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Attention Hub',
                    style: AppTypography.titleLarge.copyWith(
                      color: AppColors.darkForeground,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (items.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${items.length} pending',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  IconButton(
                    key: const Key('attention_sheet_close_btn'),
                    icon: const Icon(Icons.close, color: AppColors.mutedForeground, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.darkBorder, height: 1),
            // Body
            Flexible(
              child: items.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.darkSurface,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.darkBorder),
                            ),
                            child: const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 36,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'All Caught Up!',
                            style: AppTypography.titleMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.darkForeground,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'No pending approvals or questions from active agents.',
                            textAlign: TextAlign.center,
                            style: AppTypography.bodyMedium.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        final void Function()? onOpenSession = item.sessionId.isNotEmpty
                            ? () {
                                Navigator.of(context).pop();
                                context.push('/sessions/${item.sessionId}');
                              }
                            : null;

                        if (item.isQuestion) {
                          return QuestionCard(
                            key: ValueKey('q_${item.approvalId}'),
                            item: item,
                            onOpenSession: onOpenSession,
                            onRespond: ({selectedOptions, customAnswer}) {
                              return notifier.respondToQuestion(
                                item.approvalId,
                                selectedOptions: selectedOptions,
                                customAnswer: customAnswer,
                              );
                            },
                          );
                        } else {
                          return ApprovalCard(
                            key: ValueKey('appr_${item.approvalId}'),
                            item: item,
                            onOpenSession: onOpenSession,
                            onRespond: (approved) {
                              return notifier.respondToApproval(
                                item.approvalId,
                                approved: approved,
                              );
                            },
                          );
                        }
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
