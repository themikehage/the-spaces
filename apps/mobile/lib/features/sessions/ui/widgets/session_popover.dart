import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/session.dart';

class SessionPopover extends StatelessWidget {
  final Session session;
  final VoidCallback? onArchive;
  final VoidCallback? onUnarchive;
  final VoidCallback? onDelete;

  const SessionPopover({
    super.key,
    required this.session,
    this.onArchive,
    this.onUnarchive,
    this.onDelete,
  });

  static Future<void> show(
    BuildContext context, {
    required Session session,
    VoidCallback? onArchive,
    VoidCallback? onUnarchive,
    VoidCallback? onDelete,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
      ),
      builder: (ctx) => SessionPopover(
        session: session,
        onArchive: onArchive,
        onUnarchive: onUnarchive,
        onDelete: onDelete,
      ),
    );
  }

  Future<void> _confirmAndDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Delete Session',
          style: AppTypography.titleLarge.copyWith(
            color: AppColors.darkForeground,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to delete "${session.title.isNotEmpty ? session.title : session.id}"? This action cannot be undone.',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.mutedForeground,
          ),
        ),
        actions: [
          TextButton(
            key: const Key('popover_cancel_delete_button'),
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancel',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.mutedForeground,
              ),
            ),
          ),
          ElevatedButton(
            key: const Key('popover_confirm_delete_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Delete',
              style: AppTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.destructiveForeground,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      Navigator.of(context).pop();
      onDelete?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArchived = session.archived;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.mutedForeground.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              child: Text(
                session.title.isNotEmpty ? session.title : 'Session Options',
                style: AppTypography.titleMedium.copyWith(
                  color: AppColors.darkForeground,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const Divider(color: AppColors.darkBorder),
            if (isArchived)
              ListTile(
                key: const Key('session_popover_unarchive_tile'),
                leading: const Icon(Icons.unarchive_outlined, color: AppColors.primary),
                title: Text(
                  'Unarchive Session',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.darkForeground,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  onUnarchive?.call();
                },
              )
            else
              ListTile(
                key: const Key('session_popover_archive_tile'),
                leading: const Icon(Icons.archive_outlined, color: AppColors.mutedForeground),
                title: Text(
                  'Archive Session',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.darkForeground,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  onArchive?.call();
                },
              ),
            ListTile(
              key: const Key('session_popover_delete_tile'),
              leading: const Icon(Icons.delete_outline, color: AppColors.destructive),
              title: Text(
                'Delete Session',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.destructive,
                  fontWeight: FontWeight.w500,
                ),
              ),
              onTap: () => _confirmAndDelete(context),
            ),
          ],
        ),
      ),
    );
  }
}
