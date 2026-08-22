import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../agents/data/agents_repository.dart';

enum SkillScopeFilter {
  all,
  global,
  workspace,
}

class SkillsSelectorSheet extends ConsumerStatefulWidget {
  final String? entityType;
  final String? entityId;
  final ValueChanged<String> onSelectSkillCommand;
  final ValueChanged<String>? onToggleSkill;
  final Set<String> activeSkills;

  const SkillsSelectorSheet({
    super.key,
    this.entityType,
    this.entityId,
    required this.onSelectSkillCommand,
    this.onToggleSkill,
    this.activeSkills = const {},
  });

  static Future<void> show(
    BuildContext context, {
    String? entityType,
    String? entityId,
    required ValueChanged<String> onSelectSkillCommand,
    ValueChanged<String>? onToggleSkill,
    Set<String> activeSkills = const {},
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SkillsSelectorSheet(
        entityType: entityType,
        entityId: entityId,
        onSelectSkillCommand: onSelectSkillCommand,
        onToggleSkill: onToggleSkill,
        activeSkills: activeSkills,
      ),
    );
  }

  @override
  ConsumerState<SkillsSelectorSheet> createState() => _SkillsSelectorSheetState();
}

class _SkillsSelectorSheetState extends ConsumerState<SkillsSelectorSheet> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _skills = [];
  String _searchQuery = '';
  SkillScopeFilter _scopeFilter = SkillScopeFilter.all;

  @override
  void initState() {
    super.initState();
    _fetchSkills();
  }

  Future<void> _fetchSkills() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repo = ref.read(agentsRepositoryProvider);
      final skills = await repo.getAvailableSkills(
        entityType: widget.entityType,
        entityId: widget.entityId,
      );

      if (mounted) {
        setState(() {
          _skills = skills;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load skills: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final filteredSkills = _skills.where((s) {
      final scope = (s['scope'] ?? 'global').toString().toLowerCase();
      if (_scopeFilter == SkillScopeFilter.global && scope != 'global') {
        return false;
      }
      if (_scopeFilter == SkillScopeFilter.workspace &&
          scope != 'workspace' &&
          scope != 'local') {
        return false;
      }

      if (_searchQuery.isNotEmpty) {
        final name = (s['name'] ?? '').toString().toLowerCase();
        final desc = (s['description'] ?? '').toString().toLowerCase();
        final q = _searchQuery.toLowerCase();
        if (!name.contains(q) && !desc.contains(q)) {
          return false;
        }
      }
      return true;
    }).toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
        border: Border.all(color: border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(top: AppSpacing.sm, bottom: AppSpacing.xs),
              decoration: BoxDecoration(
                color: isDark ? AppColors.muted : AppColors.lightBorder,
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.xs,
            ),
            child: Row(
              children: [
                const Icon(Icons.bolt_outlined, size: 20, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Workspace Skills',
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                ),
                const Spacer(),
                if (!_isLoading)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      '${_skills.length} available',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Search Box
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search skills or commands...',
                prefixIcon: const Icon(Icons.search, size: 18),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: BorderSide(color: border),
                ),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
          ),
          const SizedBox(height: AppSpacing.xs),

          // Scope Filter Tabs (ALL / GLOBAL / LOCAL)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Row(
              children: [
                _buildScopeChip('ALL', SkillScopeFilter.all, isDark),
                const SizedBox(width: AppSpacing.xs),
                _buildScopeChip('GLOBAL', SkillScopeFilter.global, isDark),
                const SizedBox(width: AppSpacing.xs),
                _buildScopeChip('WORKSPACE', SkillScopeFilter.workspace, isDark),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),

          // Body content
          Flexible(
            child: _isLoading
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.xl),
                      child: CircularProgressIndicator(),
                    ),
                  )
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                style: AppTypography.bodySmall.copyWith(
                                  color: AppColors.destructive,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              TextButton(
                                onPressed: _fetchSkills,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : filteredSkills.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpacing.xl),
                              child: Text(
                                _searchQuery.isEmpty
                                    ? 'No skills found in this workspace'
                                    : 'No skills matching "$_searchQuery"',
                                style: AppTypography.bodyMedium.copyWith(
                                  color: isDark
                                      ? AppColors.mutedForeground
                                      : AppColors.textSecondaryLight,
                                ),
                              ),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: AppSpacing.xs,
                            ),
                            itemCount: filteredSkills.length,
                            separatorBuilder: (_, __) =>
                                Divider(height: 1, color: border),
                            itemBuilder: (context, index) {
                              final skill = filteredSkills[index];
                              final name = skill['name']?.toString() ?? '';
                              final desc = skill['description']?.toString() ?? '';
                              final scope = skill['scope']?.toString() ?? 'global';
                              final isActive = widget.activeSkills.contains(name);

                              return ListTile(
                                key: Key('skill_item_$name'),
                                dense: true,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.sm,
                                  vertical: 2,
                                ),
                                leading: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                    border: Border.all(
                                      color: AppColors.primary.withValues(alpha: 0.2),
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.bolt,
                                      size: 18,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Text(
                                      name,
                                      style: AppTypography.bodyMedium.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: isDark
                                            ? AppColors.darkForeground
                                            : AppColors.lightForeground,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.xs),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 1,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? AppColors.darkSurface
                                            : AppColors.lightSurface,
                                        borderRadius: BorderRadius.circular(
                                          AppSpacing.radiusFull,
                                        ),
                                        border: Border.all(color: border),
                                      ),
                                      child: Text(
                                        scope,
                                        style: AppTypography.labelSmall.copyWith(
                                          fontSize: 9,
                                          color: isDark
                                              ? AppColors.mutedForeground
                                              : AppColors.textSecondaryLight,
                                        ),
                                      ),
                                    ),
                                    if (isActive) ...[
                                      const SizedBox(width: AppSpacing.xs),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 1,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.success.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(
                                            AppSpacing.radiusFull,
                                          ),
                                          border: Border.all(
                                            color: AppColors.success.withValues(alpha: 0.3),
                                          ),
                                        ),
                                        child: Text(
                                          'active',
                                          style: AppTypography.labelSmall.copyWith(
                                            fontSize: 9,
                                            color: AppColors.success,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                subtitle: desc.isNotEmpty
                                    ? Text(
                                        desc,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTypography.bodySmall.copyWith(
                                          fontSize: 11,
                                          color: isDark
                                              ? AppColors.mutedForeground
                                              : AppColors.textSecondaryLight,
                                        ),
                                      )
                                    : null,
                                trailing: IconButton(
                                  icon: const Icon(Icons.add_comment_outlined, size: 18),
                                  tooltip: 'Insert command',
                                  color: AppColors.primary,
                                  onPressed: () {
                                    Navigator.of(context).pop();
                                    widget.onSelectSkillCommand('/$name ');
                                  },
                                ),
                                onTap: () {
                                  Navigator.of(context).pop();
                                  widget.onSelectSkillCommand('/$name ');
                                },
                              );
                            },
                          ),
          ),

          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton(
                  key: const Key('skills_sheet_done_button'),
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.primaryForeground,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.xs,
                    ),
                  ),
                  child: const Text('Close'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeChip(String label, SkillScopeFilter scope, bool isDark) {
    final isSelected = _scopeFilter == scope;
    return ChoiceChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      selected: isSelected,
      onSelected: (_) {
        setState(() {
          _scopeFilter = scope;
        });
      },
      selectedColor: AppColors.primary.withValues(alpha: 0.2),
      backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      labelStyle: TextStyle(
        color: isSelected
            ? AppColors.primary
            : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}
