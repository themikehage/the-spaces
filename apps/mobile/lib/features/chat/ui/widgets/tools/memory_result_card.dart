import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class MemoryResultCard extends StatelessWidget {
  final ToolCall toolCall;

  const MemoryResultCard({
    super.key,
    required this.toolCall,
  });

  String _resolveMode() {
    final name = toolCall.name.trim().toLowerCase();
    if (name == 'mem_save' || name == 'memory_store') return 'store';
    if (name == 'memory_forget') return 'delete';
    if (name == 'mem_search' || name == 'mem_context' || name == 'mem_get_observation' || name == 'memory_recall') {
      return 'recall';
    }
    final action = toolCall.arguments['action']?.toString().toLowerCase();
    if (action == 'upsert' || action == 'store' || action == 'save') return 'store';
    if (action == 'delete' || action == 'forget') return 'delete';
    return 'recall';
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'semantic':
        return AppColors.accent;
      case 'episodic':
        return AppColors.chart2Dark;
      case 'procedural':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  Widget _buildImportanceDots(dynamic value) {
    double numVal = 0.5;
    if (value is num) {
      numVal = value > 1.0 ? (value / 10.0).clamp(0.0, 1.0) : value.toDouble();
    } else if (value is String) {
      final parsed = double.tryParse(value);
      if (parsed != null) {
        numVal = parsed > 1.0 ? (parsed / 10.0).clamp(0.0, 1.0) : parsed;
      }
    }
    final filled = (numVal * 5).round().clamp(1, 5);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: i < filled ? AppColors.accent : AppColors.mutedForeground.withValues(alpha: 0.3),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mode = _resolveMode();
    final args = toolCall.arguments;
    final res = toolCall.result;
    Map<String, dynamic> details = {};

    if (res is Map) {
      details = Map<String, dynamic>.from(res);
    } else if (res is String && res.trim().startsWith('{')) {
      try {
        final decoded = jsonDecode(res);
        if (decoded is Map) details = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }

    if (mode == 'delete') {
      final id = details['deletedId'] ?? details['id'] ?? args['id'] ?? '';
      return Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Row(
          children: [
            const Icon(Icons.delete_outline, size: 14, color: AppColors.error),
            const SizedBox(width: AppSpacing.xs),
            Text('Memory forgotten', style: AppTypography.labelSmall.copyWith(color: AppColors.error, fontWeight: FontWeight.bold)),
            if (id.toString().isNotEmpty) ...[
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  id.toString(),
                  style: AppTypography.code.copyWith(fontSize: 10, color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      );
    }

    if (mode == 'store') {
      final type = (details['type'] ?? args['type'] ?? 'semantic').toString();
      final importance = details['importance'] ?? args['importance'] ?? 0.5;
      final content = (args['content'] ?? details['content'] ?? details['text'] ?? res?.toString() ?? '').toString();
      final tags = (details['tags'] ?? args['tags'] ?? []) as List;
      final typeColor = _getTypeColor(type);

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
                const Icon(Icons.bookmark_added_outlined, size: 13, color: AppColors.accent),
                const SizedBox(width: 4),
                Text('Memory Stored', style: AppTypography.labelSmall.copyWith(fontWeight: FontWeight.bold, color: AppColors.accent)),
                const SizedBox(width: AppSpacing.xs),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: typeColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Text(type, style: AppTypography.labelSmall.copyWith(fontSize: 10, color: typeColor, fontWeight: FontWeight.w600)),
                ),
                const Spacer(),
                _buildImportanceDots(importance),
              ],
            ),
            if (content.isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.xs),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: SelectableText(
                  content,
                  style: AppTypography.bodySmall.copyWith(fontSize: 11),
                ),
              ),
            ],
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 4),
              Wrap(
                spacing: 4,
                children: tags.map((t) => Text('#$t', style: AppTypography.code.copyWith(fontSize: 10, color: AppColors.primary))).toList(),
              ),
            ],
          ],
        ),
      );
    }

    // Recall / Read Mode
    final memories = (details['memories'] is List) ? (details['memories'] as List) : [];
    final count = details['count'] ?? memories.length;

    if (memories.isEmpty && (res == null || res.toString().trim().isEmpty)) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Text(
          'No memories recalled',
          style: AppTypography.bodySmall.copyWith(color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight, fontStyle: FontStyle.italic),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.psychology_outlined, size: 14, color: AppColors.accent),
            const SizedBox(width: AppSpacing.xs),
            Text(
              '$count Memories Recalled',
              style: AppTypography.titleSmall.copyWith(fontSize: 12, color: isDark ? AppColors.darkForeground : AppColors.lightForeground),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        if (memories.isNotEmpty)
          ...memories.map((m) {
            final mMap = m is Map ? m : {'content': m.toString()};
            final type = (mMap['type'] ?? 'semantic').toString();
            final typeColor = _getTypeColor(type);
            final content = (mMap['content'] ?? '').toString();
            final importance = mMap['importance'] ?? 0.5;

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
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: typeColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Text(type, style: AppTypography.labelSmall.copyWith(fontSize: 9.5, color: typeColor)),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      _buildImportanceDots(importance),
                    ],
                  ),
                  const SizedBox(height: 4),
                  SelectableText(content, style: AppTypography.bodySmall.copyWith(fontSize: 11)),
                ],
              ),
            );
          })
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
            child: SelectableText(res.toString(), style: AppTypography.bodySmall.copyWith(fontSize: 11)),
          ),
      ],
    );
  }
}
