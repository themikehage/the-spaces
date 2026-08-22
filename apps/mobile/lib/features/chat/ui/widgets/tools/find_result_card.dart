import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class FindResultCard extends StatelessWidget {
  final ToolCall toolCall;

  const FindResultCard({
    super.key,
    required this.toolCall,
  });

  List<String> _extractEntries() {
    final result = toolCall.result;
    if (result == null) return const [];

    if (result is List) {
      return result.map((item) {
        if (item is Map) {
          final name = item['name'] ?? item['path'] ?? item['file'] ?? '';
          final isDir = item['isDir'] == true || item['type'] == 'directory';
          final strName = name.toString();
          return isDir && !strName.endsWith('/') ? '$strName/' : strName;
        }
        return item.toString();
      }).where((s) => s.trim().isNotEmpty).toList();
    }

    if (result is Map) {
      final entries = result['files'] ??
          result['entries'] ??
          result['paths'] ??
          result['results'] ??
          result['output'] ??
          result['stdout'];
      if (entries is List) {
        return entries.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
      }
      if (entries != null) {
        return entries
            .toString()
            .trim()
            .split(RegExp(r'[\r\n]+'))
            .where((s) => s.trim().isNotEmpty)
            .toList();
      }
    }

    final raw = result.toString().trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          return decoded.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
        }
      } catch (_) {}
    }

    return raw.split(RegExp(r'[\r\n]+')).where((s) => s.trim().isNotEmpty).toList();
  }

  Color _getExtColor(String name, bool isDark) {
    if (name.endsWith('/')) return AppColors.primary;
    final dot = name.lastIndexOf('.');
    final ext = dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
    switch (ext) {
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'dart':
        return AppColors.warning;
      case 'html':
      case 'css':
        return AppColors.accent;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
        return isDark ? AppColors.chart2Dark : AppColors.chart2Light;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return AppColors.primary;
      default:
        return isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
    }
  }

  IconData _getIconData(String name) {
    if (name.endsWith('/')) return Icons.folder_outlined;
    final dot = name.lastIndexOf('.');
    final ext = dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].contains(ext)) {
      return Icons.image_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  void _copyToClipboard(BuildContext context, String path) {
    Clipboard.setData(ClipboardData(text: path));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied: $path'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final entries = _extractEntries();
    final toolLabel = toolCall.name.trim().toLowerCase();

    if (entries.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 14,
              color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
            ),
            const SizedBox(width: AppSpacing.xs),
            Text(
              'No files or directories found',
              style: AppTypography.bodySmall.copyWith(
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      );
    }

    final headerBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final cardBg = isDark ? AppColors.darkBackground : AppColors.lightBackground;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: headerBg,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppSpacing.radiusSm - 1),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.folder_open_outlined,
                  size: 13,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  '$toolLabel (${entries.length})',
                  style: AppTypography.code.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                ),
              ],
            ),
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: entries.length,
              separatorBuilder: (_, __) => Divider(
                height: 1,
                thickness: 1,
                color: (isDark ? AppColors.darkBorder : AppColors.lightBorder).withValues(alpha: 0.5),
              ),
              itemBuilder: (context, index) {
                final entry = entries[index];
                final color = _getExtColor(entry, isDark);
                final icon = _getIconData(entry);

                return InkWell(
                  onTap: () => _copyToClipboard(context, entry),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: 6,
                    ),
                    child: Row(
                      children: [
                        Icon(icon, size: 14, color: color),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            entry,
                            style: AppTypography.code.copyWith(
                              fontSize: 11.5,
                              color: color,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Icon(
                          Icons.copy_outlined,
                          size: 11,
                          color: (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight)
                              .withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
