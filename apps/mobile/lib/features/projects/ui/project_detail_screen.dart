import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/entity_chat_screen.dart';
import '../data/models/project.dart';
import 'projects_notifier.dart';

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;
  final String? sessionId;

  const ProjectDetailScreen({
    super.key,
    required this.projectId,
    this.sessionId,
  });

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
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
          'Delete Project?',
          style: AppTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.destructive,
          ),
        ),
        content: Text(
          'Are you sure you want to delete project "${widget.projectId}"? This action cannot be undone.',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('delete_project_confirm_button'),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final success = await ref
                  .read(projectsNotifierProvider.notifier)
                  .deleteProject(widget.projectId);

              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Project "${widget.projectId}" deleted.'),
                    ),
                  );
                  context.go('/projects');
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Failed to delete project.'),
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
    final projectsState = ref.watch(projectsNotifierProvider);
    final project = projectsState.projects.firstWhere(
      (p) => p.id == widget.projectId,
      orElse: () => Project(id: widget.projectId, name: widget.projectId),
    );

    return EntityChatScreen(
      entityType: 'project',
      entityId: widget.projectId,
      entityName: project.name,
      initialSessionId: widget.sessionId,
      onDelete: _confirmDelete,
      onConfigSaved: () {
        ref.read(projectsNotifierProvider.notifier).load();
      },
    );
  }
}
