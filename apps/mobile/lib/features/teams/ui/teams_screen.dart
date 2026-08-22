import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import '../../agents/ui/agents_notifier.dart';
import 'teams_notifier.dart';

class TeamsScreen extends ConsumerStatefulWidget {
  const TeamsScreen({super.key});

  @override
  ConsumerState<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends ConsumerState<TeamsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCreateTeamDialog() {
    final idCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String selectedMode = 'debate';
    String selectedType = 'Orchestration';
    final formKey = GlobalKey<FormState>();

    // Load available agents for leader selection
    final availableAgents = ref.read(agentsNotifierProvider).agents;
    String? selectedLeaderId =
        availableAgents.isNotEmpty ? availableAgents.first.id : null;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.darkCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            side: const BorderSide(color: AppColors.darkBorder),
          ),
          title: Text(
            'Create New Team',
            style: AppTypography.titleMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.darkForeground,
            ),
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    key: const Key('create_team_id_input'),
                    controller: idCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Team ID *',
                      hintText: 'e.g. dev-team',
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Team ID is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextFormField(
                    key: const Key('create_team_name_input'),
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Team Name *',
                      hintText: 'e.g. Core Engineering Team',
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Team name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextFormField(
                    key: const Key('create_team_desc_input'),
                    controller: descCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Objective and purpose of this team',
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Collaboration Mode',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    key: const Key('create_team_mode_dropdown'),
                    initialValue: selectedMode,
                    dropdownColor: AppColors.darkCard,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'debate',
                        child: Text('Debate / Multi-turn'),
                      ),
                      DropdownMenuItem(
                        value: 'round-robin',
                        child: Text('Round Robin'),
                      ),
                      DropdownMenuItem(
                        value: 'coordinator',
                        child: Text('Coordinator Led'),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setDialogState(() => selectedMode = val);
                      }
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (availableAgents.isNotEmpty) ...[
                    Text(
                      'Team Leader',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.mutedForeground,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      key: const Key('create_team_leader_dropdown'),
                      initialValue: selectedLeaderId,
                      dropdownColor: AppColors.darkCard,
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                      ),
                      items: availableAgents
                          .map(
                            (a) => DropdownMenuItem(
                              value: a.id,
                              child: Text(a.name),
                            ),
                          )
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() => selectedLeaderId = val);
                        }
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              key: const Key('create_team_submit_button'),
              onPressed: () async {
                if (formKey.currentState?.validate() == true) {
                  final id = idCtrl.text.trim();
                  final name = nameCtrl.text.trim();
                  final desc = descCtrl.text.trim();

                  final members = <Map<String, dynamic>>[];
                  if (selectedLeaderId != null) {
                    members.add({
                      'agentId': selectedLeaderId,
                      'role': 'lead',
                      'order': 0,
                    });
                  }

                  Navigator.of(dialogCtx).pop();

                  final created = await ref
                      .read(teamsNotifierProvider.notifier)
                      .createTeam({
                        'id': id,
                        'name': name,
                        if (desc.isNotEmpty) 'description': desc,
                        'mode': selectedMode,
                        'teamType': selectedType,
                        if (members.isNotEmpty) 'members': members,
                      });

                  if (mounted && created != null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Team "${created.name}" created!'),
                        backgroundColor: AppColors.success,
                      ),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.primaryForeground,
              ),
              child: const Text('Create Team'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(teamsNotifierProvider);
    final teams = state.filteredTeams;
    final canPop = ModalRoute.of(context)?.canPop == true;

    return Scaffold(
      appBar: AppBar(
        leading: canPop
            ? const BackButton()
            : IconButton(
                key: const Key('teams_drawer_button'),
                icon: const Icon(Icons.menu),
                tooltip: 'Open menu',
                onPressed: () => Scaffold.maybeOf(context)?.openDrawer(),
              ),
        title: const Text('Teams'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              key: const Key('teams_search_input'),
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search teams by name, ID, or mode...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(teamsNotifierProvider.notifier).search('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.darkCard,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: const BorderSide(color: AppColors.darkBorder),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
              ),
              onChanged: (val) {
                ref.read(teamsNotifierProvider.notifier).search(val);
                setState(() {});
              },
            ),
          ),

          // Content Area
          Expanded(
            child: state.isLoading && teams.isEmpty
                ? const SkeletonList()
                : state.error != null && teams.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              state.error!,
                              style: AppTypography.bodyMedium
                                  .copyWith(color: AppColors.destructive),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ElevatedButton(
                              onPressed: () => ref
                                  .read(teamsNotifierProvider.notifier)
                                  .load(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : teams.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.groups_outlined,
                                  size: 48,
                                  color: AppColors.mutedForeground,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'No teams found',
                                  style: AppTypography.titleMedium.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Tap the "+" button to assemble an agent team',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => ref
                                .read(teamsNotifierProvider.notifier)
                                .load(),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              itemCount: teams.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final team = teams[index];
                                return InkWell(
                                  key: Key('team_item_${team.id}'),
                                  onTap: () {
                                    context.push('/teams/${team.id}');
                                  },
                                  borderRadius: BorderRadius.circular(
                                      AppSpacing.radiusLg),
                                  child: Container(
                                    padding:
                                        const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: AppColors.darkCard,
                                      borderRadius: BorderRadius.circular(
                                          AppSpacing.radiusLg),
                                      border: Border.all(
                                          color: AppColors.darkBorder),
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(
                                              AppSpacing.sm),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary
                                                .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.circular(
                                                    AppSpacing.radiusMd),
                                          ),
                                          child: const Icon(
                                            Icons.groups_outlined,
                                            color: AppColors.primary,
                                            size: 24,
                                          ),
                                        ),
                                        const SizedBox(width: AppSpacing.md),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      team.name,
                                                      style: AppTypography
                                                          .titleSmall
                                                          .copyWith(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        color: AppColors
                                                            .darkForeground,
                                                      ),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets
                                                        .symmetric(
                                                      horizontal: 6,
                                                      vertical: 2,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.primary
                                                          .withValues(
                                                              alpha: 0.1),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              AppSpacing
                                                                  .radiusFull),
                                                      border: Border.all(
                                                        color: AppColors
                                                            .primary
                                                            .withValues(
                                                                alpha: 0.2),
                                                      ),
                                                    ),
                                                    child: Text(
                                                      team.mode.toUpperCase(),
                                                      style: AppTypography
                                                          .bodySmall
                                                          .copyWith(
                                                        fontSize: 9,
                                                        color:
                                                            AppColors.primary,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              if (team.description != null &&
                                                  team.description!
                                                      .isNotEmpty) ...[
                                                const SizedBox(
                                                    height: AppSpacing.xs),
                                                Text(
                                                  team.description!,
                                                  style: AppTypography
                                                      .bodySmall
                                                      .copyWith(
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  maxLines: 2,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ],
                                              const SizedBox(
                                                  height: AppSpacing.sm),
                                              Row(
                                                children: [
                                                  const Icon(
                                                    Icons.smart_toy_outlined,
                                                    size: 14,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    '${team.members.length} agents',
                                                    style: AppTypography
                                                        .bodySmall
                                                        .copyWith(
                                                      fontSize: 11,
                                                      color: AppColors
                                                          .mutedForeground,
                                                    ),
                                                  ),
                                                  const SizedBox(
                                                      width: AppSpacing.md),
                                                  const Icon(
                                                    Icons.chat_bubble_outline,
                                                    size: 14,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    '${team.sessionCount} sessions',
                                                    style: AppTypography
                                                        .bodySmall
                                                        .copyWith(
                                                      fontSize: 11,
                                                      color: AppColors
                                                          .mutedForeground,
                                                    ),
                                                  ),
                                                  const Spacer(),
                                                  const Icon(
                                                    Icons.chevron_right,
                                                    size: 18,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'teams_create_team_fab',
        key: const Key('create_team_fab'),
        onPressed: _showCreateTeamDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: AppColors.primaryForeground),
      ),
    );
  }
}
