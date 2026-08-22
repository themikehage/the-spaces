import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/workspace_file.dart';
import '../../data/workspace_repository.dart';
import '../workspace_notifier.dart';

class WorkspaceFileEditor extends ConsumerStatefulWidget {
  final WorkspaceFile file;
  final String entityType;
  final String entityId;

  const WorkspaceFileEditor({
    super.key,
    required this.file,
    required this.entityType,
    required this.entityId,
  });

  static Future<bool?> open(
    BuildContext context, {
    required WorkspaceFile file,
    required String entityType,
    required String entityId,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => WorkspaceFileEditor(
          file: file,
          entityType: entityType,
          entityId: entityId,
        ),
      ),
    );
  }

  @override
  ConsumerState<WorkspaceFileEditor> createState() => _WorkspaceFileEditorState();
}

class _WorkspaceFileEditorState extends ConsumerState<WorkspaceFileEditor> {
  final TextEditingController _controller = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  String _initialContent = '';

  bool get _isDirty => _controller.text != _initialContent;

  @override
  void initState() {
    super.initState();
    _loadFileContent();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadFileContent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(workspaceRepositoryProvider);
      final content = await repository.getFileContent(
        entityType: widget.entityType,
        entityId: widget.entityId,
        path: widget.file.path,
      );

      if (mounted) {
        _initialContent = content;
        _controller.text = content;
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;

    setState(() {
      _isSaving = true;
    });

    final args = WorkspaceArgs(
      entityType: widget.entityType,
      entityId: widget.entityId,
    );

    final success = await ref
        .read(workspaceNotifierProvider(args).notifier)
        .saveFile(widget.file.path, _controller.text);

    if (mounted) {
      setState(() {
        _isSaving = false;
      });

      if (success) {
        _initialContent = _controller.text;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Saved "${widget.file.name}"'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to save file'),
            backgroundColor: AppColors.destructive,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<bool> _onWillPop() async {
    if (!_isDirty) return true;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        title: Text(
          'Discard changes?',
          style: AppTypography.titleLarge.copyWith(
            color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
          ),
        ),
        content: Text(
          'You have unsaved changes in "${widget.file.name}". Are you sure you want to discard them?',
          style: AppTypography.bodyMedium.copyWith(
            color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Editing'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            child: const Text('Discard'),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: !_isDirty,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () async {
              final shouldPop = await _onWillPop();
              if (shouldPop && context.mounted) {
                Navigator.of(context).pop();
              }
            },
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    widget.file.name,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                  ),
                  if (_isDirty) ...[
                    const SizedBox(width: AppSpacing.xs),
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ],
              ),
              if (widget.file.path != widget.file.name)
                Text(
                  widget.file.path,
                  style: AppTypography.labelSmall.copyWith(
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.md),
              child: ElevatedButton.icon(
                onPressed: (_isLoading || _isSaving) ? null : _handleSave,
                icon: _isSaving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primaryForeground,
                        ),
                      )
                    : const Icon(Icons.save_outlined, size: 16),
                label: Text(_isSaving ? 'Saving...' : 'Save'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.primaryForeground,
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.xs,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
              ),
            ),
          ],
        ),
        body: _buildBody(isDark),
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: AppColors.destructive,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Failed to load file',
                style: AppTypography.titleMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: _loadFileContent,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.primaryForeground,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      child: TextField(
        controller: _controller,
        onChanged: (_) => setState(() {}),
        maxLines: null,
        expands: true,
        keyboardType: TextInputType.multiline,
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: 13.5,
          height: 1.45,
          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
        ),
        decoration: InputDecoration(
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(AppSpacing.md),
          hintText: 'Start typing...',
          hintStyle: TextStyle(
            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
          ),
        ),
      ),
    );
  }
}
