import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import 'projects_notifier.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCreateProjectDialog() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final cloneCtrl = TextEditingController();
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
          'Create New Project',
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
                  key: const Key('create_project_name_input'),
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Project Name *',
                    hintText: 'e.g. my-awesome-app',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Project name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  key: const Key('create_project_desc_input'),
                  controller: descCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Brief summary of the project',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  key: const Key('create_project_clone_input'),
                  controller: cloneCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Git Repository URL (Optional)',
                    hintText: 'https://github.com/org/repo.git',
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
            key: const Key('create_project_submit_button'),
            onPressed: () async {
              if (formKey.currentState?.validate() == true) {
                final name = nameCtrl.text.trim();
                final desc = descCtrl.text.trim();
                final clone = cloneCtrl.text.trim();

                Navigator.of(dialogCtx).pop();

                final created = await ref
                    .read(projectsNotifierProvider.notifier)
                    .createProject(
                      name: name,
                      description: desc.isNotEmpty ? desc : null,
                      cloneUrl: clone.isNotEmpty ? clone : null,
                    );

                if (mounted && created != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Project "${created.name}" created!'),
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
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(projectsNotifierProvider);
    final projects = state.filteredProjects;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('projects_drawer_button'),
          icon: const Icon(Icons.menu),
          tooltip: 'Open menu',
          onPressed: () => Scaffold.maybeOf(context)?.openDrawer(),
        ),
        title: const Text('Projects'),
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
              key: const Key('projects_search_input'),
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search projects by name, tag, or description...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(projectsNotifierProvider.notifier).search('');
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
                ref.read(projectsNotifierProvider.notifier).search(val);
                setState(() {});
              },
            ),
          ),

          // Content
          Expanded(
            child: state.isLoading && projects.isEmpty
                ? const SkeletonList()
                : state.error != null && projects.isEmpty
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
                                  .read(projectsNotifierProvider.notifier)
                                  .load(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : projects.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.folder_open_outlined,
                                  size: 48,
                                  color: AppColors.mutedForeground,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'No projects found',
                                  style: AppTypography.titleMedium.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Tap the "+" button to create a new project',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => ref
                                .read(projectsNotifierProvider.notifier)
                                .load(),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              itemCount: projects.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final project = projects[index];
                                return InkWell(
                                  key: Key('project_item_${project.id}'),
                                  onTap: () {
                                    context.go('/projects/${project.id}');
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
                                            Icons.folder_outlined,
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
                                                      project.name,
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
                                                  if (project.tag != null) ...[
                                                    const SizedBox(
                                                        width: AppSpacing.xs),
                                                    Container(
                                                      padding: const EdgeInsets
                                                          .symmetric(
                                                        horizontal: 6,
                                                        vertical: 2,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color: AppColors.muted,
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(
                                                                    AppSpacing
                                                                        .radiusFull),
                                                      ),
                                                      child: Text(
                                                        project.tag!,
                                                        style: AppTypography
                                                            .bodySmall
                                                            .copyWith(
                                                          fontSize: 10,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              if (project.description != null &&
                                                  project.description!
                                                      .isNotEmpty) ...[
                                                const SizedBox(
                                                    height: AppSpacing.xs),
                                                Text(
                                                  project.description!,
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
                                                  const Icon(
                                                    Icons.chat_bubble_outline,
                                                    size: 14,
                                                    color: AppColors
                                                        .mutedForeground,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    '${project.sessionCount} sessions',
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
        heroTag: 'create_project_fab_hero',
        key: const Key('create_project_fab'),
        onPressed: _showCreateProjectDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: AppColors.primaryForeground),
      ),
    );
  }
}
