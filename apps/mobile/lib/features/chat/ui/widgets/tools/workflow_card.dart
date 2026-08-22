import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class WorkflowCard extends StatelessWidget {
  final ToolCall toolCall;

  const WorkflowCard({
    super.key,
    required this.toolCall,
  });

  dynamic _extractJson() {
    final res = toolCall.result;
    if (res == null) return null;
    if (res is List || res is Map) return res;
    if (res is String && (res.trim().startsWith('{') || res.trim().startsWith('['))) {
      try {
        return jsonDecode(res);
      } catch (_) {}
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final args = toolCall.arguments;
    final action = (args['action'] ?? 'workflow').toString();
    final json = _extractJson();
    final rawText = toolCall.result?.toString() ?? '';

    if (json is List) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.account_tree_outlined, size: 14, color: AppColors.primary),
              const SizedBox(width: AppSpacing.xs),
              Text(
                'Workflows (${json.length})',
                style: AppTypography.titleSmall.copyWith(
                  fontSize: 12,
                  color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Text(
                  action.toUpperCase(),
                  style: AppTypography.code.copyWith(
                    fontSize: 9.5,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          ...json.map((wf) {
            final wfMap = wf is Map ? wf : {'name': wf.toString()};
            final name = (wfMap['name'] ?? wfMap['id'] ?? 'Workflow').toString();
            final id = wfMap['id']?.toString();
            final description = wfMap['description']?.toString();
            final steps = (wfMap['steps'] is List) ? (wfMap['steps'] as List) : [];

            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.xs),
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: AppTypography.titleSmall.copyWith(
                            fontSize: 12,
                            color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (id != null) ...[
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          id,
                          style: AppTypography.code.copyWith(
                            fontSize: 9.5,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                      if (steps.isNotEmpty) ...[
                        const SizedBox(width: AppSpacing.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                          ),
                          child: Text(
                            '${steps.length} steps',
                            style: AppTypography.labelSmall.copyWith(
                              fontSize: 9.5,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (description != null && description.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      description,
                      style: AppTypography.bodySmall.copyWith(
                        fontSize: 11,
                        color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (steps.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    ...steps.take(3).map((s) {
                      final sMap = s is Map ? s : {'label': s.toString()};
                      final sLabel = (sMap['label'] ?? sMap['name'] ?? sMap['id'] ?? 'Step').toString();
                      final sType = (sMap['type'] ?? '').toString();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                sLabel,
                                style: AppTypography.code.copyWith(fontSize: 10),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (sType.isNotEmpty)
                              Text(
                                sType.toUpperCase(),
                                style: AppTypography.labelSmall.copyWith(
                                  fontSize: 8.5,
                                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                    if (steps.length > 3)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          '+${steps.length - 3} more steps',
                          style: AppTypography.code.copyWith(
                            fontSize: 9.5,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            );
          }),
        ],
      );
    }

    if (json is Map) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.account_tree_outlined, size: 14, color: AppColors.primary),
                const SizedBox(width: AppSpacing.xs),
                Text('Workflow Result ($action)', style: AppTypography.titleSmall.copyWith(fontSize: 11.5)),
              ],
            ),
            const SizedBox(height: 6),
            SelectableText(
              const JsonEncoder.withIndent('  ').convert(json),
              style: AppTypography.code.copyWith(fontSize: 11),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, size: 14, color: AppColors.success),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              rawText.isNotEmpty ? rawText : 'Workflow $action completed',
              style: AppTypography.bodySmall.copyWith(fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}
