import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../features/agents/data/agents_repository.dart';
import '../../features/agents/data/models/agent.dart';

class EntityConfigEditor extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final String? title;
  final VoidCallback? onSave;

  const EntityConfigEditor({
    super.key,
    required this.entityType,
    required this.entityId,
    this.title,
    this.onSave,
  });

  @override
  ConsumerState<EntityConfigEditor> createState() => _EntityConfigEditorState();
}

class _EntityConfigEditorState extends ConsumerState<EntityConfigEditor> {
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  String? _selectedModel;
  List<Map<String, dynamic>> _availableModels = [];

  List<String> _availableTools = [];
  Set<String> _activeTools = {};

  List<Map<String, dynamic>> _availableSkills = [];
  Set<String> _activeSkills = {};

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  @override
  void didUpdateWidget(covariant EntityConfigEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entityId != widget.entityId ||
        oldWidget.entityType != widget.entityType) {
      _loadConfig();
    }
  }

  Future<void> _loadConfig() async {
    if (widget.entityId.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repo = ref.read(agentsRepositoryProvider);

      final results = await Future.wait([
        repo.getAvailableModels().catchError((_) => <Map<String, dynamic>>[]),
        repo.getAvailableSkills(
          entityType: widget.entityType,
          entityId: widget.entityId,
        ).catchError((_) => <Map<String, dynamic>>[]),
        repo.getEntityConfig(widget.entityType, widget.entityId)
            .catchError((_) => <String, dynamic>{}),
        repo.getEntityToolsScope(
          entityType: widget.entityType,
          entityId: widget.entityId,
        ).catchError((_) => <String, dynamic>{}),
      ]);

      final models = results[0] as List<Map<String, dynamic>>;
      final skills = results[1] as List<Map<String, dynamic>>;
      final entityConfig = results[2] as Map<String, dynamic>;
      final toolsScope = results[3] as Map<String, dynamic>;

      String? defaultModel = entityConfig['defaultModel']?.toString();
      if (defaultModel == null && widget.entityType == 'agent') {
        final agent = await repo.getAgent(widget.entityId).catchError(
          (_) => Agent(id: widget.entityId, name: widget.entityId),
        );
        defaultModel = agent.model;
      }

      final activeSkillsList = <String>[];
      if (entityConfig['skills'] is List) {
        activeSkillsList.addAll(
          (entityConfig['skills'] as List).map((e) => e.toString()),
        );
      }

      final activeToolsSet = <String>{};
      final toolOverrides = entityConfig['toolOverrides'] as Map<String, dynamic>?;
      if (toolOverrides != null && toolOverrides['add'] is List) {
        activeToolsSet.addAll(
          (toolOverrides['add'] as List).map((e) => e.toString()),
        );
      } else if (toolsScope['resolved'] is List) {
        activeToolsSet.addAll(
          (toolsScope['resolved'] as List).map((e) => e.toString()),
        );
      }

      final allTools = <String>{...activeToolsSet};
      if (toolsScope['global'] is List) {
        allTools.addAll(
          (toolsScope['global'] as List).map((e) => e.toString()),
        );
      }
      if (allTools.isEmpty) {
        allTools.addAll([
          'read_file',
          'write_to_file',
          'edit_file',
          'list_dir',
          'grep_search',
          'find_by_name',
          'run_command',
          'web_search',
        ]);
      }

      if (mounted) {
        setState(() {
          _availableModels = models;
          _selectedModel = defaultModel ?? (models.isNotEmpty ? models.first['id'] : null);
          _availableSkills = skills;
          _activeSkills = activeSkillsList.toSet();
          _availableTools = allTools.toList()..sort();
          _activeTools = activeToolsSet;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load entity configuration: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveConfig() async {
    setState(() {
      _isSaving = true;
    });

    try {
      final repo = ref.read(agentsRepositoryProvider);

      final payload = <String, dynamic>{
        if (_selectedModel != null) 'defaultModel': _selectedModel,
        'skills': _activeSkills.toList(),
        'toolOverrides': {
          'add': _activeTools.toList(),
          'remove': <String>[],
        },
      };

      await repo.updateEntityConfig(
        widget.entityType,
        widget.entityId,
        payload,
      );

      if (widget.entityType == 'agent' && _selectedModel != null) {
        await repo.updateAgent(widget.entityId, {'model': _selectedModel}).catchError(
          (_) => Agent(id: widget.entityId, name: widget.entityId),
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Configuration saved successfully'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 2),
          ),
        );
        widget.onSave?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save configuration: $e'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (_error != null) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(color: AppColors.destructive.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _error!,
              style: AppTypography.bodySmall.copyWith(color: AppColors.destructive),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              onPressed: _loadConfig,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return Container(
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.title ?? 'Entity Configuration',
                style: AppTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.darkForeground,
                ),
              ),
              ElevatedButton.icon(
                key: const Key('entity_config_save_button'),
                onPressed: _isSaving ? null : _saveConfig,
                icon: _isSaving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_outlined, size: 16),
                label: Text(_isSaving ? 'Saving...' : 'Save'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.xs,
                  ),
                  textStyle: AppTypography.labelMedium.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // 1. Model Selection Section
          _buildSectionHeader(
            icon: Icons.psychology_outlined,
            title: 'Assigned Model',
            subtitle: 'Default model for reasoning and tool orchestration',
          ),
          const SizedBox(height: AppSpacing.xs),
          _buildModelDropdown(),
          const SizedBox(height: AppSpacing.lg),

          // 2. Tools Section
          _buildSectionHeader(
            icon: Icons.build_outlined,
            title: 'Tools Configuration',
            subtitle: 'Enable or disable tools available to this entity',
            badge: '${_activeTools.length} active',
          ),
          const SizedBox(height: AppSpacing.xs),
          _buildToolsList(),
          const SizedBox(height: AppSpacing.lg),

          // 3. Skills Section
          _buildSectionHeader(
            icon: Icons.bolt_outlined,
            title: 'Skills Configuration',
            subtitle: 'Custom prompt capabilities and workflows',
            badge: '${_activeSkills.length} active',
          ),
          const SizedBox(height: AppSpacing.xs),
          _buildSkillsList(),
        ],
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required String subtitle,
    String? badge,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    title,
                    style: AppTypography.labelLarge.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkForeground,
                    ),
                  ),
                  if (badge != null) ...[
                    const SizedBox(width: AppSpacing.xs),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        badge,
                        style: AppTypography.bodySmall.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              Text(
                subtitle,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModelDropdown() {
    final modelItems = _availableModels.isNotEmpty
        ? _availableModels
        : [
            {'id': 'claude-3-7-sonnet', 'name': 'Claude 3.7 Sonnet'},
            {'id': 'gemini-2.5-pro', 'name': 'Gemini 2.5 Pro'},
            {'id': 'gpt-4o', 'name': 'GPT-4o'},
          ];

    final isKnownModel = modelItems.any((m) => m['id'] == _selectedModel);
    if (!isKnownModel && _selectedModel != null) {
      modelItems.insert(0, {'id': _selectedModel!, 'name': _selectedModel!});
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.darkBackground,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          key: const Key('entity_config_model_dropdown'),
          value: _selectedModel ?? modelItems.first['id'],
          isExpanded: true,
          dropdownColor: AppColors.darkCard,
          icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.mutedForeground),
          items: modelItems.map((m) {
            final id = m['id']?.toString() ?? '';
            final name = m['name']?.toString() ?? id;
            return DropdownMenuItem<String>(
              value: id,
              child: Text(
                name,
                style: AppTypography.bodyMedium.copyWith(color: AppColors.darkForeground),
              ),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) {
              setState(() {
                _selectedModel = val;
              });
            }
          },
        ),
      ),
    );
  }

  Widget _buildToolsList() {
    if (_availableTools.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Text(
          'No custom tools detected',
          style: AppTypography.bodySmall.copyWith(color: AppColors.mutedForeground),
        ),
      );
    }

    return Container(
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: AppColors.darkBackground,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(vertical: 4),
        itemCount: _availableTools.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.darkBorder),
        itemBuilder: (context, index) {
          final tool = _availableTools[index];
          final isActive = _activeTools.contains(tool);

          return CheckboxListTile(
            key: Key('entity_config_tool_$tool'),
            dense: true,
            visualDensity: VisualDensity.compact,
            title: Text(
              tool,
              style: AppTypography.bodySmall.copyWith(
                fontFamily: 'monospace',
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: isActive ? AppColors.darkForeground : AppColors.mutedForeground,
              ),
            ),
            value: isActive,
            activeColor: AppColors.primary,
            onChanged: (val) {
              setState(() {
                if (val == true) {
                  _activeTools.add(tool);
                } else {
                  _activeTools.remove(tool);
                }
              });
            },
          );
        },
      ),
    );
  }

  Widget _buildSkillsList() {
    if (_availableSkills.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Text(
          'No skills detected in this workspace',
          style: AppTypography.bodySmall.copyWith(color: AppColors.mutedForeground),
        ),
      );
    }

    return Container(
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: AppColors.darkBackground,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(vertical: 4),
        itemCount: _availableSkills.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.darkBorder),
        itemBuilder: (context, index) {
          final skill = _availableSkills[index];
          final skillName = skill['name']?.toString() ?? '';
          final desc = skill['description']?.toString();
          final isActive = _activeSkills.contains(skillName);

          return CheckboxListTile(
            key: Key('entity_config_skill_$skillName'),
            dense: true,
            visualDensity: VisualDensity.compact,
            title: Text(
              skillName,
              style: AppTypography.bodySmall.copyWith(
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: isActive ? AppColors.darkForeground : AppColors.mutedForeground,
              ),
            ),
            subtitle: desc != null
                ? Text(
                    desc,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodySmall.copyWith(
                      fontSize: 10,
                      color: AppColors.mutedForeground,
                    ),
                  )
                : null,
            value: isActive,
            activeColor: AppColors.primary,
            onChanged: (val) {
              setState(() {
                if (val == true) {
                  _activeSkills.add(skillName);
                } else {
                  _activeSkills.remove(skillName);
                }
              });
            },
          );
        },
      ),
    );
  }
}
