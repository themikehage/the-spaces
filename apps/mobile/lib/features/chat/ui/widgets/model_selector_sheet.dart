import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/ai_model.dart';

class ModelSelectorSheet extends StatelessWidget {
  final List<AiModel> models;
  final String? currentModelId;
  final ValueChanged<AiModel> onSelectModel;

  const ModelSelectorSheet({
    super.key,
    required this.models,
    this.currentModelId,
    required this.onSelectModel,
  });

  static Future<void> show(
    BuildContext context, {
    required List<AiModel> models,
    String? currentModelId,
    required ValueChanged<AiModel> onSelectModel,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ModelSelectorSheet(
        models: models,
        currentModelId: currentModelId,
        onSelectModel: (model) {
          Navigator.of(context).pop();
          onSelectModel(model);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkCard : AppColors.lightCard;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(top: AppSpacing.sm, bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBorderHover : AppColors.lightBorderHover,
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Row(
                children: [
                  const Icon(Icons.psychology_outlined, size: 20, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Select AI Model',
                    style: AppTypography.titleLarge.copyWith(
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            Flexible(
              child: models.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(AppSpacing.xxl),
                      child: Text(
                        'No models available',
                        style: AppTypography.bodyMedium.copyWith(
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      itemCount: models.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final model = models[index];
                        final isSelected = currentModelId != null &&
                            (model.id == currentModelId ||
                                '${model.provider}/${model.id}' == currentModelId);

                        return ListTile(
                          onTap: () => onSelectModel(model),
                          title: Text(
                            model.name.isNotEmpty ? model.name : model.id,
                            style: AppTypography.titleSmall.copyWith(
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                            ),
                          ),
                          subtitle: Row(
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                ),
                                child: Text(
                                  model.provider.toUpperCase(),
                                  style: AppTypography.labelSmall.copyWith(
                                    fontSize: 10,
                                    color: isDark
                                        ? AppColors.mutedForeground
                                        : AppColors.textSecondaryLight,
                                  ),
                                ),
                              ),
                              if (model.reasoning) ...[
                                const SizedBox(width: 6),
                                Container(
                                  margin: const EdgeInsets.only(top: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                  ),
                                  child: Text(
                                    'REASONING',
                                    style: AppTypography.labelSmall.copyWith(
                                      fontSize: 10,
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          trailing: isSelected
                              ? const Icon(Icons.check_circle, color: AppColors.primary, size: 20)
                              : null,
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
