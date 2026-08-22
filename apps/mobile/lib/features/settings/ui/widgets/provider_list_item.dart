import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/provider_config.dart';
import 'provider_credentials_sheet.dart';

class ProviderListItem extends StatelessWidget {
  final ProviderConfig provider;

  const ProviderListItem({
    super.key,
    required this.provider,
  });

  IconData _getProviderIcon(String id) {
    switch (id.toLowerCase()) {
      case 'openai':
        return Icons.auto_awesome;
      case 'anthropic':
        return Icons.psychology;
      case 'gemini':
      case 'google':
        return Icons.bubble_chart;
      case 'deepseek':
        return Icons.search;
      case 'groq':
        return Icons.flash_on;
      case 'mistral':
        return Icons.air;
      case 'openrouter':
        return Icons.hub;
      case 'qwen':
        return Icons.language;
      case 'xai':
        return Icons.explore;
      default:
        return Icons.smart_toy_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(
          color: provider.isConfigured
              ? AppColors.primary.withValues(alpha: 0.3)
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
      ),
      child: ListTile(
        key: Key('provider_item_${provider.id}'),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.xs,
        ),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: provider.isConfigured
                ? AppColors.primary.withValues(alpha: 0.15)
                : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: Icon(
            _getProviderIcon(provider.id),
            color: provider.isConfigured
                ? AppColors.primary
                : AppColors.mutedForeground,
            size: 20,
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                provider.name,
                style: AppTypography.titleMedium.copyWith(
                  color: isDark
                      ? AppColors.darkForeground
                      : AppColors.lightForeground,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs / 2,
              ),
              decoration: BoxDecoration(
                color: provider.isConfigured
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    provider.isConfigured
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    size: 12,
                    color: provider.isConfigured
                        ? AppColors.primary
                        : AppColors.mutedForeground,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    provider.isConfigured ? 'Configured' : 'Not configured',
                    style: AppTypography.labelSmall.copyWith(
                      color: provider.isConfigured
                          ? AppColors.primary
                          : AppColors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        subtitle: provider.models.isNotEmpty
            ? Text(
                '${provider.models.length} models available',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
              )
            : null,
        trailing: Icon(
          Icons.chevron_right,
          color: isDark ? AppColors.textTertiaryDark : AppColors.textTertiaryLight,
        ),
        onTap: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => ProviderCredentialsSheet(provider: provider),
          );
        },
      ),
    );
  }
}
