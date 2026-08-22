import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import 'env_vars_notifier.dart';
import 'widgets/add_env_var_sheet.dart';
import 'widgets/bulk_env_editor_sheet.dart';
import 'widgets/env_var_list_item.dart';

class EnvVarsScreen extends ConsumerWidget {
  const EnvVarsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(envVarsNotifierProvider);
    final notifier = ref.read(envVarsNotifierProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Env Vars'),
        actions: [
          TextButton.icon(
            key: const Key('edit_bulk_env_btn'),
            icon: const Icon(Icons.edit_note_outlined, size: 18),
            label: const Text('Edit .env'),
            onPressed: () => BulkEnvEditorSheet.show(context),
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        key: const Key('add_env_var_fab'),
        tooltip: 'Add Environment Variable',
        onPressed: () => AddEnvVarSheet.show(context),
        child: const Icon(Icons.add),
      ),
      body: Builder(
        builder: (context) {
          if (state.isLoading && state.vars.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (state.error != null && state.vars.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: AppColors.destructive,
                      size: 48,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    const Text(
                      'Failed to load environment variables',
                      style: AppTypography.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      state.error!,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    FilledButton.icon(
                      onPressed: () => notifier.load(),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state.vars.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.vpn_key_outlined,
                        color: AppColors.primary,
                        size: 48,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const Text(
                      'No Environment Variables',
                      style: AppTypography.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Define workspace variables for agents and tools',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    FilledButton.icon(
                      onPressed: () => AddEnvVarSheet.show(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Add First Variable'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => notifier.load(),
            child: ListView.builder(
              padding: const EdgeInsets.only(
                top: AppSpacing.sm,
                bottom: 80, // Space for FAB
              ),
              itemCount: state.vars.length,
              itemBuilder: (context, index) {
                final envVar = state.vars[index];
                final isRevealed = state.revealedKeys.contains(envVar.key);

                return EnvVarListItem(
                  envVar: envVar,
                  isRevealed: isRevealed,
                  onToggleReveal: () => notifier.toggleReveal(envVar.key),
                  onDelete: () => notifier.deleteVar(envVar.key),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
