import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/entity_config_editor.dart';
import '../data/models/agent.dart';
import 'agents_notifier.dart';

class AgentDetailScreen extends ConsumerStatefulWidget {
  final String agentId;

  const AgentDetailScreen({
    super.key,
    required this.agentId,
  });

  @override
  ConsumerState<AgentDetailScreen> createState() => _AgentDetailScreenState();
}

class _AgentDetailScreenState extends ConsumerState<AgentDetailScreen> {
  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Delete Agent?',
          style: AppTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.destructive,
          ),
        ),
        content: Text(
          'Are you sure you want to delete agent "${widget.agentId}"? This will also terminate active sessions using this agent.',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('delete_agent_confirm_button'),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final success = await ref
                  .read(agentsNotifierProvider.notifier)
                  .deleteAgent(widget.agentId);

              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Agent "${widget.agentId}" deleted.'),
                    ),
                  );
                  context.go('/agents');
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Failed to delete agent.'),
                      backgroundColor: AppColors.destructive,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final agentsState = ref.watch(agentsNotifierProvider);
    final agent = agentsState.agents.firstWhere(
      (a) => a.id == widget.agentId,
      orElse: () => Agent(id: widget.agentId, name: widget.agentId),
    );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('agent_detail_back_button'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/agents');
            }
          },
        ),
        title: Text(
          agent.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            key: const Key('agent_detail_delete_button'),
            icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
            tooltip: 'Delete Agent',
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Agent Header Info Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.darkCard,
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(color: AppColors.darkBorder),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    ),
                    child: const Icon(
                      Icons.smart_toy_outlined,
                      color: AppColors.primary,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          agent.name,
                          style: AppTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkForeground,
                          ),
                        ),
                        Text(
                          'ID: ${agent.id}',
                          style: AppTypography.bodySmall.copyWith(
                            fontFamily: 'monospace',
                            color: AppColors.mutedForeground,
                          ),
                        ),
                        if (agent.description != null &&
                            agent.description!.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            agent.description!,
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Reusable EntityConfigEditor for Agent Configuration
            EntityConfigEditor(
              entityType: 'agent',
              entityId: widget.agentId,
              title: 'Agent Configuration',
              onSave: () {
                ref.read(agentsNotifierProvider.notifier).load();
              },
            ),
          ],
        ),
      ),
    );
  }
}
