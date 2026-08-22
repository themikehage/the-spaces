import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/provider_config.dart';
import '../settings_notifier.dart';

class ProviderCredentialsSheet extends ConsumerStatefulWidget {
  final ProviderConfig provider;

  const ProviderCredentialsSheet({
    super.key,
    required this.provider,
  });

  @override
  ConsumerState<ProviderCredentialsSheet> createState() =>
      _ProviderCredentialsSheetState();
}

class _ProviderCredentialsSheetState
    extends ConsumerState<ProviderCredentialsSheet> {
  late final TextEditingController _keyController;
  bool _obscureKey = true;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    _keyController = TextEditingController();
  }

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() {
        _validationError = 'API key cannot be empty';
      });
      return;
    }

    setState(() {
      _validationError = null;
    });

    final success = await ref
        .read(settingsNotifierProvider.notifier)
        .saveProviderKey(widget.provider.id, key);

    if (mounted && success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${widget.provider.name} credentials saved securely.'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  Future<void> _handleClear() async {
    final success = await ref
        .read(settingsNotifierProvider.notifier)
        .clearProviderKey(widget.provider.id);

    if (mounted && success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${widget.provider.name} credentials removed.'),
          backgroundColor: AppColors.mutedForeground,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(settingsNotifierProvider);
    final isSaving = state.isSaving;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkCard : AppColors.lightCard,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(AppSpacing.radiusXl),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkSurface
                        : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: const Icon(Icons.key, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.provider.name} API Key',
                        style: AppTypography.titleLarge.copyWith(
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                        ),
                      ),
                      Text(
                        widget.provider.isConfigured
                            ? 'Currently configured'
                            : 'Not configured',
                        style: AppTypography.bodySmall.copyWith(
                          color: widget.provider.isConfigured
                              ? AppColors.success
                              : AppColors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Enter your API key. It will be encrypted and stored exclusively in secure device storage.',
              style: AppTypography.bodyMedium.copyWith(
                color: isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              key: const Key('provider_api_key_field'),
              controller: _keyController,
              obscureText: _obscureKey,
              decoration: InputDecoration(
                hintText: widget.provider.isConfigured
                    ? '••••••••••••••••••••••••'
                    : 'Paste API Key here',
                errorText: _validationError,
                filled: true,
                fillColor:
                    isDark ? AppColors.darkSurface : AppColors.lightSurface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  borderSide: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                suffixIcon: IconButton(
                  key: const Key('toggle_key_visibility_button'),
                  icon: Icon(
                    _obscureKey ? Icons.visibility_off : Icons.visibility,
                    color: AppColors.mutedForeground,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureKey = !_obscureKey;
                    });
                  },
                ),
              ),
            ),
            if (state.error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                state.error!,
                style: AppTypography.bodySmall.copyWith(color: AppColors.error),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                if (widget.provider.isConfigured) ...[
                  OutlinedButton.icon(
                    key: const Key('clear_provider_key_button'),
                    onPressed: isSaving ? null : _handleClear,
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.destructive, size: 18),
                    label: const Text('Clear Key',
                        style: TextStyle(color: AppColors.destructive)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.destructive),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.md,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                ],
                Expanded(
                  child: ElevatedButton(
                    key: const Key('save_provider_key_button'),
                    onPressed: isSaving ? null : _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.primaryForeground,
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.md,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusMd),
                      ),
                    ),
                    child: isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primaryForeground,
                            ),
                          )
                        : const Text('Save Key'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
