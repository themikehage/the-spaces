import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class ShareFileCard extends StatelessWidget {
  final ToolCall toolCall;

  const ShareFileCard({
    super.key,
    required this.toolCall,
  });

  String _extractFilePath() {
    final args = toolCall.arguments;
    final path = args['filePath'] ?? args['path'] ?? args['file'] ?? args['targetFile'];
    if (path != null) return path.toString();

    final res = toolCall.result;
    if (res is Map) {
      final resPath = res['filePath'] ?? res['path'] ?? res['file'];
      if (resPath != null) return resPath.toString();
    }
    return res?.toString() ?? '';
  }

  String _getExtension(String path) {
    final name = path.split(RegExp(r'[/\\]')).last;
    final dot = name.lastIndexOf('.');
    return dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
  }

  Color _getBadgeColor(String ext) {
    switch (ext) {
      case 'pdf':
        return AppColors.destructive;
      case 'doc':
      case 'docx':
        return AppColors.chart2Light;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return AppColors.chart5Light;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return AppColors.chart4Light;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return AppColors.chart3Light;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
        return AppColors.chart1Light;
      case 'html':
      case 'htm':
        return AppColors.chart2Light;
      default:
        return AppColors.primary;
    }
  }

  void _copyToClipboard(BuildContext context, String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filePath = _extractFilePath();
    final args = toolCall.arguments;
    final title = args['title']?.toString();
    final fileName = filePath.split(RegExp(r'[/\\]')).last;
    final displayName = title ?? (fileName.isNotEmpty ? fileName : 'Shared File');
    final ext = _getExtension(filePath);
    final badgeLabel = ext.isNotEmpty ? ext.toUpperCase() : 'FILE';
    final badgeColor = _getBadgeColor(ext);

    final cardBg = isDark ? AppColors.darkBackground : AppColors.lightSurface;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
            ),
            alignment: Alignment.center,
            child: Text(
              badgeLabel.length > 4 ? badgeLabel.substring(0, 3) : badgeLabel,
              style: AppTypography.code.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: badgeColor,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: AppTypography.titleSmall.copyWith(
                    fontSize: 12,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  filePath,
                  style: AppTypography.code.copyWith(
                    fontSize: 9.5,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          IconButton(
            icon: const Icon(Icons.copy_rounded, size: 16),
            tooltip: 'Copy path',
            onPressed: filePath.isNotEmpty ? () => _copyToClipboard(context, filePath, 'File path') : null,
            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
