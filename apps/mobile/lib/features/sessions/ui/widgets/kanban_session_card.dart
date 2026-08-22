import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/session.dart';
import 'session_status_dot.dart';

class KanbanSessionCard extends StatelessWidget {
  final Session session;
  final VoidCallback? onTap;

  const KanbanSessionCard({
    super.key,
    required this.session,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: Key('kanban_card_${session.id}'),
      onTap: onTap ?? () => context.go('/sessions/${session.id}'),
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: SessionStatusDot(status: session.status),
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    session.title.isNotEmpty ? session.title : 'Untitled Session',
                    style: AppTypography.labelMedium.copyWith(
                      color: AppColors.darkForeground,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 3,
                    softWrap: true,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if ((session.agentId != null && session.agentId!.isNotEmpty) ||
                (session.projectId != null && session.projectId!.isNotEmpty)) ...[
              const SizedBox(height: AppSpacing.xs),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: 4,
                children: [
                  if (session.agentId != null && session.agentId!.isNotEmpty)
                    Container(
                      constraints: const BoxConstraints(maxWidth: 120),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.mutedForeground.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.smart_toy_outlined,
                            size: 10,
                            color: AppColors.mutedForeground,
                          ),
                          const SizedBox(width: 2),
                          Flexible(
                            child: Text(
                              session.agentId!,
                              style: AppTypography.labelSmall.copyWith(
                                color: AppColors.mutedForeground,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              softWrap: false,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (session.projectId != null && session.projectId!.isNotEmpty)
                    Container(
                      constraints: const BoxConstraints(maxWidth: 120),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.mutedForeground.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.folder_outlined,
                            size: 10,
                            color: AppColors.mutedForeground,
                          ),
                          const SizedBox(width: 2),
                          Flexible(
                            child: Text(
                              session.projectId!,
                              style: AppTypography.labelSmall.copyWith(
                                color: AppColors.mutedForeground,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              softWrap: false,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
