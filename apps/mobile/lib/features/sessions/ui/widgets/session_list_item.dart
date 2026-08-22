import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/session.dart';

class SessionListItem extends StatelessWidget {
  final Session session;
  final VoidCallback? onTap;

  const SessionListItem({
    super.key,
    required this.session,
    this.onTap,
  });

  Color _getStatusColor() {
    if (session.isRunning) return AppColors.success;
    if (session.isWaitingApproval) return AppColors.warning;
    if (session.isError) return AppColors.destructive;
    return AppColors.mutedForeground;
  }

  String _formatStatusLabel() {
    switch (session.status.toLowerCase()) {
      case 'running':
      case 'active':
      case 'streaming':
      case 'task-running':
        return 'Active';
      case 'waiting_approval':
      case 'waiting-approval':
        return 'Waiting Approval';
      case 'error':
        return 'Error';
      case 'aborted':
        return 'Aborted';
      case 'idle':
      default:
        return 'Idle';
    }
  }

  String _formatRelativeTime(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final dateTime = DateTime.parse(isoString);
      final diff = DateTime.now().difference(dateTime);

      if (diff.inSeconds < 30) return 'Just now';
      if (diff.inMinutes < 1) return '${diff.inSeconds}s ago';
      if (diff.inHours < 1) return '${diff.inMinutes}m ago';
      if (diff.inDays < 1) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();
    final relativeTime = _formatRelativeTime(session.updatedAt);

    return InkWell(
      key: Key('session_item_${session.id}'),
      onTap: onTap ?? () => context.go('/sessions/${session.id}'),
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: statusColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Text(
                    _formatStatusLabel(),
                    style: AppTypography.labelSmall.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const Spacer(),
                if (relativeTime.isNotEmpty)
                  Text(
                    relativeTime,
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              session.title.isNotEmpty ? session.title : 'Untitled Session',
              style: AppTypography.titleMedium.copyWith(
                color: AppColors.darkForeground,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (session.agentId != null || session.projectId != null || session.messageCount > 0) ...[
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.md,
                runSpacing: AppSpacing.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (session.agentId != null && session.agentId!.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.smart_toy_outlined,
                          size: 14,
                          color: AppColors.mutedForeground,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          session.agentId!,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  if (session.projectId != null && session.projectId!.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.folder_outlined,
                          size: 14,
                          color: AppColors.mutedForeground,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          session.projectId!,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  if (session.messageCount > 0)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.chat_bubble_outline,
                          size: 14,
                          color: AppColors.mutedForeground,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '${session.messageCount} msgs',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
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
