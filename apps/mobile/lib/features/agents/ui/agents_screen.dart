import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import 'agents_notifier.dart';

class AgentsScreen extends ConsumerStatefulWidget {
  const AgentsScreen({super.key});

  @override
  ConsumerState<AgentsScreen> createState() => _AgentsScreenState();
}

class _AgentsScreenState extends ConsumerState<AgentsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCreateAgentDialog() {
    final idCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final modelCtrl = TextEditingController(text: 'claude-3-7-sonnet');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Register New Agent',
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
              children: [
                TextFormField(
                  key: const Key('create_agent_id_input'),
                  controller: idCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Agent ID *',
                    hintText: 'e.g. backend-lead',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Agent ID is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  key: const Key('create_agent_name_input'),
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Display Name *',
                    hintText: 'e.g. Backend Lead Agent',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Display name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  key: const Key('create_agent_desc_input'),
                  controller: descCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Responsibilities and capabilities',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  key: const Key('create_agent_model_input'),
                  controller: modelCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Assigned Model',
                    hintText: 'claude-3-7-sonnet / gpt-4o',
                  ),
                ),
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
            key: const Key('create_agent_submit_button'),
            onPressed: () async {
              if (formKey.currentState?.validate() == true) {
                final id = idCtrl.text.trim();
                final name = nameCtrl.text.trim();
                final desc = descCtrl.text.trim();
                final model = modelCtrl.text.trim();

                Navigator.of(dialogCtx).pop();

                final created = await ref
                    .read(agentsNotifierProvider.notifier)
                    .createAgent({
                      'id': id,
                      'name': name,
                      if (desc.isNotEmpty) 'description': desc,
                      if (model.isNotEmpty) 'model': model,
                    });

                if (mounted && created != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Agent "${created.name}" registered!'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Register'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentsNotifierProvider);
    final agents = state.filteredAgents;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('agents_drawer_button'),
          icon: const Icon(Icons.menu),
          tooltip: 'Open menu',
          onPressed: () => Scaffold.maybeOf(context)?.openDrawer(),
        ),
        title: const Text('Agents'),
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              key: const Key('agents_search_input'),
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search agents by name, role, or model...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(agentsNotifierProvider.notifier).search('');
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
                ref.read(agentsNotifierProvider.notifier).search(val);
                setState(() {});
              },
            ),
          ),

          // Content
          Expanded(
            child: state.isLoading && agents.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : state.error != null && agents.isEmpty
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
                                  .read(agentsNotifierProvider.notifier)
                                  .load(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : agents.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.smart_toy_outlined,
                                  size: 48,
                                  color: AppColors.mutedForeground,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'No agents found',
                                  style: AppTypography.titleMedium.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Tap the "+" button to register a new AI agent',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => ref
                                .read(agentsNotifierProvider.notifier)
                                .load(),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              itemCount: agents.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final agent = agents[index];
                                return InkWell(
                                  key: Key('agent_item_${agent.id}'),
                                  onTap: () {
                                    context.go('/agents/${agent.id}');
                                  },
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusLg),
                                  child: Container(
                                    padding:
                                        const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: AppColors.darkCard,
                                      borderRadius:
                                          BorderRadius.circular(AppSpacing.radiusLg),
                                      border:
                                          Border.all(color: AppColors.darkBorder),
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
                                            borderRadius: BorderRadius.circular(
                                                AppSpacing.radiusMd),
                                          ),
                                          child: const Icon(
                                            Icons.smart_toy_outlined,
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
                                                      agent.name,
                                                      style: AppTypography
                                                          .titleSmall
                                                          .copyWith(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        color:
                                                            AppColors.darkForeground,
                                                      ),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  if (agent.model != null) ...[
                                                    const SizedBox(
                                                        width: AppSpacing.xs),
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
                                                            BorderRadius
                                                                .circular(
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
                                                        agent.model!,
                                                        style: AppTypography
                                                            .bodySmall
                                                            .copyWith(
                                                          fontSize: 10,
                                                          color:
                                                              AppColors.primary,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              if (agent.description != null &&
                                                  agent.description!
                                                      .isNotEmpty) ...[
                                                const SizedBox(
                                                    height: AppSpacing.xs),
                                                Text(
                                                  agent.description!,
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
                                                  height: AppSpacing.xs),
                                              Row(
                                                children: [
                                                  Container(
                                                    width: 8,
                                                    height: 8,
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      color: agent.status ==
                                                              'ready'
                                                          ? AppColors.success
                                                          : AppColors.warning,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    agent.status,
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
        key: const Key('create_agent_fab'),
        onPressed: _showCreateAgentDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
