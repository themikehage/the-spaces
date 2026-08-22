import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuCard extends StatelessWidget {
  final String title;
  final String? description;
  final String? status;
  final String? action;
  final Map<String, dynamic>? metadata;
  final VoidCallback? onAction;

  const CuCard({
    super.key,
    required this.title,
    this.description,
    this.status,
    this.action,
    this.metadata,
    this.onAction,
  });

  factory CuCard.fromJson(Map<String, dynamic> json, {VoidCallback? onAction}) {
    final meta = json['metadata'];
    Map<String, dynamic>? metaMap;
    if (meta is Map) {
      metaMap = Map<String, dynamic>.from(meta);
    }

    return CuCard(
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      status: json['status']?.toString(),
      action: json['action']?.toString(),
      metadata: metaMap,
      onAction: onAction,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    Color? statusColor;
    if (status != null) {
      switch (status!.toLowerCase()) {
        case 'success':
          statusColor = AppColors.success;
          break;
        case 'warning':
          statusColor = AppColors.warning;
          break;
        case 'error':
        case 'destructive':
          statusColor = AppColors.destructive;
          break;
        case 'info':
          statusColor = isDark ? AppColors.chart2Dark : AppColors.chart2Light;
          break;
      }
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (statusColor != null)
              Container(
                width: 4,
                color: statusColor,
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: AppTypography.titleSmall.copyWith(
                              color: isDark
                                  ? AppColors.darkForeground
                                  : AppColors.lightForeground,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (status != null) ...[
                          const SizedBox(width: AppSpacing.sm),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.xs,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: (statusColor ?? AppColors.primary)
                                  .withValues(alpha: 0.15),
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                            child: Text(
                              status!.toUpperCase(),
                              style: AppTypography.labelSmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: statusColor ?? AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (description != null && description!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        description!,
                        style: AppTypography.bodySmall.copyWith(
                          color: isDark
                              ? AppColors.mutedForeground
                              : AppColors.textSecondaryLight,
                          height: 1.4,
                        ),
                      ),
                    ],
                    if (metadata != null && metadata!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.darkSurface.withValues(alpha: 0.3)
                              : AppColors.lightSurface,
                          borderRadius:
                              BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Column(
                          children: metadata!.entries.map((entry) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    entry.key,
                                    style: AppTypography.labelSmall.copyWith(
                                      color: isDark
                                          ? AppColors.mutedForeground
                                          : AppColors.textSecondaryLight,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 11,
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  Flexible(
                                    child: Text(
                                      entry.value.toString(),
                                      style: AppTypography.bodySmall.copyWith(
                                        color: isDark
                                            ? AppColors.darkForeground
                                            : AppColors.lightForeground,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 11,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                    if (action != null && action!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: onAction,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm,
                              vertical: AppSpacing.xs,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            action!,
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
