import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/workspace_file.dart';
import '../../data/workspace_repository.dart';
import 'workspace_file_editor.dart';

class FilePreviewSheet extends ConsumerStatefulWidget {
  final WorkspaceFile file;
  final String entityType;
  final String entityId;

  const FilePreviewSheet({
    super.key,
    required this.file,
    required this.entityType,
    required this.entityId,
  });

  static Future<void> show(
    BuildContext context, {
    required WorkspaceFile file,
    required String entityType,
    required String entityId,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.transparent,
      builder: (context) => FilePreviewSheet(
        file: file,
        entityType: entityType,
        entityId: entityId,
      ),
    );
  }

  @override
  ConsumerState<FilePreviewSheet> createState() => _FilePreviewSheetState();
}

class _FilePreviewSheetState extends ConsumerState<FilePreviewSheet> {
  bool _isLoading = true;
  String? _content;
  String? _error;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _loadFileContent();
  }

  Future<void> _loadFileContent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(workspaceRepositoryProvider);
      final text = await repository.getFileContent(
        entityType: widget.entityType,
        entityId: widget.entityId,
        path: widget.file.path,
      );

      if (mounted) {
        setState(() {
          _content = text;
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

  void _copyToClipboard() {
    if (_content == null || _content!.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _content!));
    setState(() {
      _copied = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copied = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.85,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusLg),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: AppSpacing.sm),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.description_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.file.name,
                        style: AppTypography.titleSmall.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (widget.file.sizeFormatted.isNotEmpty)
                        Text(
                          widget.file.sizeFormatted,
                          style: AppTypography.labelSmall.copyWith(
                            color: isDark
                                ? AppColors.mutedForeground
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                    ],
                  ),
                ),
                if (_content != null) ...[
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                    tooltip: 'Edit file',
                    onPressed: () {
                      Navigator.of(context).pop();
                      WorkspaceFileEditor.open(
                        context,
                        file: widget.file,
                        entityType: widget.entityType,
                        entityId: widget.entityId,
                      );
                    },
                  ),
                  IconButton(
                    icon: Icon(
                      _copied ? Icons.check : Icons.copy_outlined,
                      size: 18,
                      color: _copied ? AppColors.success : AppColors.primary,
                    ),
                    tooltip: 'Copy content',
                    onPressed: _copyToClipboard,
                  ),
                ],
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Content area
          Expanded(
            child: _buildBody(isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: AppColors.primary,
        ),
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
                size: 40,
                color: AppColors.destructive,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Could not load file content',
                style: AppTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppColors.darkForeground
                      : AppColors.lightForeground,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall.copyWith(
                  color: isDark
                      ? AppColors.mutedForeground
                      : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton.icon(
                onPressed: _loadFileContent,
                icon: const Icon(Icons.refresh, size: 16),
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

    final content = _content ?? '';
    if (content.isEmpty) {
      return Center(
        child: Text(
          'File is empty',
          style: AppTypography.bodyMedium.copyWith(
            color: isDark
                ? AppColors.mutedForeground
                : AppColors.textSecondaryLight,
          ),
        ),
      );
    }

    return Container(
      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      width: double.infinity,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: SelectableText(
          content,
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: 13,
            height: 1.5,
          ),
        ),
      ),
    );
  }
}
