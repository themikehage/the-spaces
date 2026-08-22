import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

enum ExecutionMode {
  standard,
  readOnly,
  autonomous,
}

class ToolsSelectorSheet extends StatefulWidget {
  final List<String> availableTools;
  final List<String> activeTools;
  final ExecutionMode executionMode;
  final ValueChanged<List<String>> onToolsChanged;
  final ValueChanged<ExecutionMode>? onExecutionModeChanged;

  const ToolsSelectorSheet({
    super.key,
    required this.availableTools,
    required this.activeTools,
    this.executionMode = ExecutionMode.standard,
    required this.onToolsChanged,
    this.onExecutionModeChanged,
  });

  static Future<void> show(
    BuildContext context, {
    required List<String> availableTools,
    required List<String> activeTools,
    ExecutionMode executionMode = ExecutionMode.standard,
    required ValueChanged<List<String>> onToolsChanged,
    ValueChanged<ExecutionMode>? onExecutionModeChanged,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ToolsSelectorSheet(
        availableTools: availableTools,
        activeTools: activeTools,
        executionMode: executionMode,
        onToolsChanged: onToolsChanged,
        onExecutionModeChanged: onExecutionModeChanged,
      ),
    );
  }

  @override
  State<ToolsSelectorSheet> createState() => _ToolsSelectorSheetState();
}

class _ToolsSelectorSheetState extends State<ToolsSelectorSheet> {
  late Set<String> _active;
  late ExecutionMode _mode;
  String _searchQuery = '';

  static const List<String> _readOnlyTools = [
    'read_file',
    'grep_search',
    'find_by_name',
    'list_dir',
  ];

  static const List<String> _defaultStandardTools = [
    'read_file',
    'write_to_file',
    'edit_file',
    'list_dir',
    'grep_search',
    'find_by_name',
    'run_command',
    'web_search',
  ];

  @override
  void initState() {
    super.initState();
    _active = Set.from(widget.activeTools);
    if (_active.isEmpty) {
      _active.addAll(_defaultStandardTools);
    }
    _mode = widget.executionMode;
  }

  void _setMode(ExecutionMode mode) {
    setState(() {
      _mode = mode;
      if (mode == ExecutionMode.readOnly) {
        _active = Set.from(_readOnlyTools);
      } else if (mode == ExecutionMode.autonomous) {
        _active = Set.from(
          widget.availableTools.isNotEmpty
              ? widget.availableTools
              : _defaultStandardTools,
        );
      } else {
        _active = Set.from(_defaultStandardTools);
      }
    });
    widget.onExecutionModeChanged?.call(_mode);
    widget.onToolsChanged(_active.toList());
  }

  void _toggleTool(String tool) {
    setState(() {
      if (_active.contains(tool)) {
        _active.remove(tool);
      } else {
        _active.add(tool);
      }
    });
    widget.onToolsChanged(_active.toList());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final allTools = widget.availableTools.isNotEmpty
        ? widget.availableTools
        : _defaultStandardTools;

    final filteredTools = _searchQuery.isEmpty
        ? allTools
        : allTools
            .where((t) => t.toLowerCase().contains(_searchQuery.toLowerCase()))
            .toList();

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
                const Icon(Icons.build_outlined, size: 20, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Tools Configuration',
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                ),
                const Spacer(),
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
                    '${_active.length} active',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: SegmentedButton<ExecutionMode>(
              key: const Key('tools_execution_mode_selector'),
              segments: const [
                ButtonSegment(
                  value: ExecutionMode.standard,
                  label: Text('Standard'),
                  icon: Icon(Icons.shield_outlined, size: 14),
                ),
                ButtonSegment(
                  value: ExecutionMode.readOnly,
                  label: Text('Read-Only'),
                  icon: Icon(Icons.lock_outline, size: 14),
                ),
                ButtonSegment(
                  value: ExecutionMode.autonomous,
                  label: Text('Autonomous'),
                  icon: Icon(Icons.bolt, size: 14),
                ),
              ],
              selected: {_mode},
              onSelectionChanged: (selected) {
                if (selected.isNotEmpty) {
                  _setMode(selected.first);
                }
              },
              style: SegmentedButton.styleFrom(
                selectedBackgroundColor: AppColors.primary.withValues(alpha: 0.2),
                selectedForegroundColor: AppColors.primary,
                textStyle: AppTypography.labelSmall.copyWith(fontWeight: FontWeight.w600),
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search tools...',
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
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xs,
              ),
              itemCount: filteredTools.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: border),
              itemBuilder: (context, index) {
                final tool = filteredTools[index];
                final isActive = _active.contains(tool);

                return CheckboxListTile(
                  key: Key('tool_toggle_$tool'),
                  dense: true,
                  visualDensity: VisualDensity.compact,
                  title: Text(
                    tool,
                    style: AppTypography.bodySmall.copyWith(
                      fontFamily: 'monospace',
                      fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                  ),
                  value: isActive,
                  activeColor: AppColors.primary,
                  onChanged: (_) => _toggleTool(tool),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: () {
                    _setMode(ExecutionMode.standard);
                  },
                  child: const Text('Reset Defaults'),
                ),
                ElevatedButton(
                  key: const Key('tools_sheet_done_button'),
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.primaryForeground,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.xs,
                    ),
                  ),
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
