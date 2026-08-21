import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/entity_config_editor.dart';
import '../../sessions/ui/sessions_notifier.dart';
import '../data/models/project.dart';
import 'projects_notifier.dart';

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;

  const ProjectDetailScreen({
    super.key,
    required this.projectId,
  });

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

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
              foregroundColor: Colors.white,
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

    final sessionsState = ref.watch(sessionsNotifierProvider);
    final projectSessions = sessionsState.sessions
        .where((s) => s.projectId == widget.projectId)
        .toList();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('project_detail_back_button'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/projects');
            }
          },
        ),
        title: Text(
          project.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            key: const Key('project_detail_delete_button'),
            icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
            tooltip: 'Delete Project',
            onPressed: _confirmDelete,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.mutedForeground,
          tabs: [
            Tab(
              icon: const Icon(Icons.chat_bubble_outline, size: 18),
              text: 'Sessions (${projectSessions.length})',
            ),
            const Tab(
              icon: Icon(Icons.settings_outlined, size: 18),
              text: 'Configuration',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Sessions
          _buildSessionsTab(projectSessions),

          // Tab 2: Configuration (EntityConfigEditor)
          SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: EntityConfigEditor(
              entityType: 'project',
              entityId: widget.projectId,
              title: 'Project Configuration',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionsTab(List<dynamic> sessions) {
    if (sessions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.chat_bubble_outline,
                size: 48,
                color: AppColors.mutedForeground,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'No sessions in this project yet',
                style: AppTypography.titleMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Start a chat session and assign it to this project',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: sessions.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final session = sessions[index];
        return InkWell(
          key: Key('project_session_${session.id}'),
          onTap: () {
            context.go('/sessions/${session.id}');
          },
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.darkCard,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.forum_outlined, color: AppColors.primary),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.title,
                        style: AppTypography.bodyMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Status: ${session.status}',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.mutedForeground),
              ],
            ),
          ),
        );
      },
    );
  }
}
