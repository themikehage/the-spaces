import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../env_vars_notifier.dart';

class BulkEnvEditorSheet extends ConsumerStatefulWidget {
  const BulkEnvEditorSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (_) => const BulkEnvEditorSheet(),
    );
  }

  @override
  ConsumerState<BulkEnvEditorSheet> createState() => _BulkEnvEditorSheetState();
}

class _BulkEnvEditorSheetState extends ConsumerState<BulkEnvEditorSheet> {
  late final TextEditingController _contentController;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final vars = ref.read(envVarsNotifierProvider).vars;
    final initialContent = vars.map((v) => '${v.key}=${v.value}').join('\n');
    _contentController = TextEditingController(text: initialContent);
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final success = await ref
        .read(envVarsNotifierProvider.notifier)
        .bulkSave(_contentController.text);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Environment variables updated')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update environment variables')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Edit .env (Bulk)',
                style: AppTypography.titleMedium,
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Format: KEY=VALUE (one per line). Comments starting with # are ignored.',
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.mutedForeground,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            height: 240,
            decoration: BoxDecoration(
              color: AppColors.darkBackground,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: TextField(
              key: const Key('bulk_env_content_input'),
              controller: _contentController,
              maxLines: null,
              expands: true,
              style: AppTypography.code.copyWith(
                color: AppColors.darkForeground,
              ),
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.all(AppSpacing.md),
                border: InputBorder.none,
                hintText: 'KEY=VALUE\nANOTHER_KEY=VALUE',
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            key: const Key('bulk_env_save_btn'),
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save .env'),
          ),
        ],
      ),
    );
  }
}
