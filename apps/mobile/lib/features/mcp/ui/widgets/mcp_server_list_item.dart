import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/mcp_server.dart';

class McpServerListItem extends StatelessWidget {
  final McpServer server;
  final bool isConnecting;
  final VoidCallback onReconnect;
  final VoidCallback? onDelete;

  const McpServerListItem({
    super.key,
    required this.server,
    this.isConnecting = false,
    required this.onReconnect,
    this.onDelete,
  });

  Color _getStatusColor() {
    switch (server.status.toLowerCase()) {
      case 'connected':
        return AppColors.success;
      case 'connecting':
        return AppColors.warning;
      case 'error':
        return AppColors.destructive;
      case 'disconnected':
      default:
        return AppColors.mutedForeground;
    }
  }

  Future<bool?> _confirmDelete(BuildContext context) async {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Server'),
        content: Text('Are you sure you want to remove MCP server "${server.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.destructive,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();

    Widget card = Container(
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
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
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.extension_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            server.name,
                            style: AppTypography.titleMedium.copyWith(
                              color: AppColors.darkForeground,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.darkSurfaceHover,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: Text(
                            server.transport.toUpperCase(),
                            style: AppTypography.labelSmall.copyWith(
                              fontSize: 10,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
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
                        const SizedBox(width: 6),
                        Text(
                          server.status.toUpperCase(),
                          style: AppTypography.labelSmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (server.tools != null && server.tools!.isNotEmpty) ...[
                          const SizedBox(width: AppSpacing.sm),
                          Text(
                            '• ${server.tools!.length} tools',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (isConnecting)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                IconButton(
                  key: Key('reconnect_btn_${server.id}'),
                  icon: const Icon(Icons.refresh, size: 20),
                  tooltip: 'Reconnect server',
                  onPressed: onReconnect,
                ),
            ],
          ),
          if (server.description != null && server.description!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              server.description!,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.mutedForeground,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (server.command != null || server.url != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              server.transport == 'http' ? (server.url ?? '') : (server.command ?? ''),
              style: AppTypography.code.copyWith(
                fontSize: 11,
                color: AppColors.mutedForeground,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (server.error != null && server.error!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.all(AppSpacing.xs),
              decoration: BoxDecoration(
                color: AppColors.destructive.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Text(
                server.error!,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.destructive,
                ),
              ),
            ),
          ],
        ],
      ),
    );

    if (onDelete != null && !server.isBuiltin) {
      return Dismissible(
        key: Key('mcp_server_${server.id}'),
        direction: DismissDirection.endToStart,
        confirmDismiss: (_) => _confirmDelete(context),
        onDismissed: (_) => onDelete!(),
        background: Container(
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: AppSpacing.lg),
          color: AppColors.destructive.withValues(alpha: 0.8),
          child: const Icon(
            Icons.delete_outline,
            color: AppColors.destructiveForeground,
          ),
        ),
        child: card,
      );
    }

    return card;
  }
}
