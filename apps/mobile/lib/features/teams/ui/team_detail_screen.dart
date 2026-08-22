import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/entity_config_editor.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import '../../agents/ui/agents_notifier.dart';
import '../../sessions/data/models/session.dart';
import '../data/models/team.dart';
import '../data/teams_repository.dart';
import 'teams_notifier.dart';

class TeamDetailScreen extends ConsumerStatefulWidget {
  final String teamId;

  const TeamDetailScreen({super.key, required this.teamId});

  @override
  ConsumerState<TeamDetailScreen> createState() => _TeamDetailScreenState();
}

class _TeamDetailScreenState extends ConsumerState<TeamDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Team? _team;
  List<Session> _sessions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadTeamData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTeamData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repo = ref.read(teamsRepositoryProvider);
      final team = await repo.getTeam(widget.teamId);
      final sessions = await repo.getTeamSessions(widget.teamId);

      if (mounted) {
        setState(() {
          _team = team;
          _sessions = sessions;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _confirmDeleteTeam() {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Delete Team',
          style: AppTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.destructive,
          ),
        ),
        content: Text(
          'Are you sure you want to delete "${_team?.name ?? widget.teamId}"? This action cannot be undone.',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.darkForeground,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('delete_team_confirm_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final success = await ref
                  .read(teamsNotifierProvider.notifier)
                  .deleteTeam(widget.teamId);

              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Team deleted successfully'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                  context.pop();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Failed to delete team'),
                      backgroundColor: AppColors.destructive,
                    ),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(_team?.name ?? 'Team Details'),
        ),
        body: const SkeletonList(itemCount: 4),
      );
    }

    if (_error != null || _team == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Team Details'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _error ?? 'Team not found',
                style: AppTypography.bodyMedium
                    .copyWith(color: AppColors.destructive),
              ),
              const SizedBox(height: AppSpacing.sm),
              ElevatedButton(
                onPressed: _loadTeamData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final team = _team!;
    final agentsMap = {
      for (final a in ref.watch(agentsNotifierProvider).agents) a.id: a,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(team.name),
        actions: [
          IconButton(
            key: const Key('team_delete_button'),
            icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
            tooltip: 'Delete team',
            onPressed: _confirmDeleteTeam,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.mutedForeground,
          tabs: const [
            Tab(icon: Icon(Icons.info_outline), text: 'Members'),
            Tab(icon: Icon(Icons.forum_outlined), text: 'Sessions'),
            Tab(icon: Icon(Icons.tune_outlined), text: 'Config'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Overview & Members
          RefreshIndicator(
            onRefresh: _loadTeamData,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                // Info Card
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.darkCard,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                    border: Border.all(color: AppColors.darkBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              team.name,
                              style: AppTypography.titleMedium.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkForeground,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusFull),
                            ),
                            child: Text(
                              team.mode.toUpperCase(),
                              style: AppTypography.bodySmall.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (team.description != null &&
                          team.description!.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          team.description!,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.md,
                        runSpacing: AppSpacing.xs,
                        children: [
                          _MetricChip(
                            icon: Icons.repeat,
                            label: 'Max Rounds: ${team.maxRounds}',
                          ),
                          _MetricChip(
                            icon: Icons.category_outlined,
                            label: 'Type: ${team.teamType}',
                          ),
                          _MetricChip(
                            icon: Icons.chat_bubble_outline,
                            label: '${_sessions.length} sessions',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Members Header
                Text(
                  'Team Members (${team.members.length})',
                  style: AppTypography.titleSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkForeground,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                if (team.members.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.darkCard,
                      borderRadius:
                          BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Center(
                      child: Text(
                        'No members assigned to this team yet',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.mutedForeground,
                        ),
                      ),
                    ),
                  )
                else
                  ...team.members.map((member) {
                    final agent = agentsMap[member.agentId];
                    final isLead = member.role == 'lead';

                    return Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.darkCard,
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusMd),
                        border: Border.all(
                          color: isLead
                              ? AppColors.primary.withValues(alpha: 0.4)
                              : AppColors.darkBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: isLead
                                  ? AppColors.primary.withValues(alpha: 0.15)
                                  : AppColors.darkSurfaceHover,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isLead
                                  ? Icons.star
                                  : Icons.smart_toy_outlined,
                              size: 18,
                              color: isLead
                                  ? AppColors.primary
                                  : AppColors.mutedForeground,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  agent?.name ?? member.agentId,
                                  style: AppTypography.bodyMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.darkForeground,
                                  ),
                                ),
                                if (member.title != null &&
                                    member.title!.isNotEmpty)
                                  Text(
                                    member.title!,
                                    style: AppTypography.bodySmall.copyWith(
                                      color: AppColors.mutedForeground,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: isLead
                                  ? AppColors.primary.withValues(alpha: 0.1)
                                  : AppColors.darkBorder,
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusFull),
                            ),
                            child: Text(
                              member.role.toUpperCase(),
                              style: AppTypography.bodySmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isLead
                                    ? AppColors.primary
                                    : AppColors.mutedForeground,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),

          // Tab 2: Sessions List
          RefreshIndicator(
            onRefresh: _loadTeamData,
            child: _sessions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.forum_outlined,
                          size: 40,
                          color: AppColors.mutedForeground,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'No active sessions for this team',
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: _sessions.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final session = _sessions[index];
                      return ListTile(
                        key: Key('team_session_${session.id}'),
                        tileColor: AppColors.darkCard,
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(AppSpacing.radiusMd),
                          side: const BorderSide(color: AppColors.darkBorder),
                        ),
                        leading: const Icon(
                          Icons.chat_bubble_outline,
                          color: AppColors.primary,
                        ),
                        title: Text(
                          session.title.isNotEmpty
                              ? session.title
                              : session.id,
                          style: AppTypography.bodyMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkForeground,
                          ),
                        ),
                        subtitle: Text(
                          'Status: ${session.status}',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                        trailing: const Icon(
                          Icons.chevron_right,
                          color: AppColors.mutedForeground,
                          size: 18,
                        ),
                        onTap: () {
                          context.push('/sessions/${session.id}');
                        },
                      );
                    },
                  ),
          ),

          // Tab 3: Entity Config
          SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: EntityConfigEditor(
              entityType: 'team',
              entityId: widget.teamId,
              title: 'Team Configuration Overrides',
              onSave: _loadTeamData,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetricChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.mutedForeground),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            color: AppColors.mutedForeground,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
