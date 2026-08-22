import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/entity_chat_screen.dart';
import '../data/models/agent.dart';
import 'agents_notifier.dart';

class AgentDetailScreen extends ConsumerStatefulWidget {
  final String agentId;
  final String? sessionId;

  const AgentDetailScreen({
    super.key,
    required this.agentId,
    this.sessionId,
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

    return EntityChatScreen(
      entityType: 'agent',
      entityId: widget.agentId,
      entityName: agent.name,
      initialSessionId: widget.sessionId,
      onDelete: _confirmDelete,
      onConfigSaved: () {
        ref.read(agentsNotifierProvider.notifier).load();
      },
    );
  }
}
