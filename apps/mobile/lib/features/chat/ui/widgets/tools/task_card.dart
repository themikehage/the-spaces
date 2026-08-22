import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class TaskCard extends StatelessWidget {
  final ToolCall toolCall;

  const TaskCard({
    super.key,
    required this.toolCall,
  });

  Map<String, dynamic> _extractDetails() {
    final res = toolCall.result;
    if (res is Map) return Map<String, dynamic>.from(res);
    if (res is String && (res.trim().startsWith('{') || res.trim().startsWith('['))) {
      try {
        final decoded = jsonDecode(res);
        if (decoded is Map) return Map<String, dynamic>.from(decoded);
        if (decoded is List) return {'tasks': decoded};
      } catch (_) {}
    }
    return {};
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return AppColors.success;
      case 'running':
      case 'active':
        return AppColors.primary;
      case 'failed':
      case 'error':
        return AppColors.error;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = _extractDetails();
    final tasks = (details['tasks'] is List) ? (details['tasks'] as List) : [];
    final objective = details['objective']?.toString();
    final mode = (details['mode'] ?? 'linear').toString();
    final totalTasks = details['totalTasks'] ?? tasks.length;

    if (tasks.isEmpty) {
      final rawText = toolCall.result?.toString() ?? '';
      return Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Text(
          rawText.isNotEmpty ? rawText : 'No tasks planned',
          style: AppTypography.bodySmall.copyWith(
            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
            fontStyle: FontStyle.italic,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.checklist_rounded, size: 15, color: AppColors.primary),
            const SizedBox(width: AppSpacing.xs),
            Text(
              'Tasks Planned ($totalTasks)',
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
                mode,
                style: AppTypography.code.copyWith(
                  fontSize: 9.5,
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ),
          ],
        ),
        if (objective != null && objective.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            objective,
            style: AppTypography.bodySmall.copyWith(
              fontSize: 11,
              color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
        const SizedBox(height: AppSpacing.xs),
        ...tasks.asMap().entries.map((entry) {
          final idx = entry.key + 1;
          final t = entry.value;
          final tMap = t is Map ? t : {'title': t.toString()};
          final title = (tMap['title'] ?? tMap['name'] ?? 'Task $idx').toString();
          final id = tMap['id']?.toString();
          final status = (tMap['status'] ?? 'pending').toString();
          final prompt = tMap['prompt']?.toString();
          final estimatedSteps = tMap['estimated_steps'] ?? tMap['estimatedSteps'];
          final dependsOn = (tMap['depends_on'] ?? tMap['dependsOn']) as List?;
          final statusColor = _getStatusColor(status);

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
                    Container(
                      width: 18,
                      height: 18,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceHover : AppColors.lightSurfaceHover,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '$idx',
                        style: AppTypography.code.copyWith(fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        title,
                        style: AppTypography.titleSmall.copyWith(
                          fontSize: 11.5,
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: AppTypography.labelSmall.copyWith(
                          fontSize: 9,
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                if (id != null || estimatedSteps != null || (dependsOn != null && dependsOn.isNotEmpty)) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (id != null)
                        Text(
                          id,
                          style: AppTypography.code.copyWith(
                            fontSize: 9,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                      if (estimatedSteps != null) ...[
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '~$estimatedSteps steps',
                          style: AppTypography.labelSmall.copyWith(
                            fontSize: 9,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                      if (dependsOn != null && dependsOn.isNotEmpty) ...[
                        const Spacer(),
                        Text(
                          'Deps: ${dependsOn.join(", ")}',
                          style: AppTypography.code.copyWith(
                            fontSize: 9,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
                if (prompt != null && prompt.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Text(
                      prompt,
                      style: AppTypography.code.copyWith(
                        fontSize: 10,
                        color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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
}
