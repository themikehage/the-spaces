import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../utils/file_classifier.dart';

class AttachedFileCard extends StatelessWidget {
  final String path;
  final String? name;
  final String? authToken;
  final VoidCallback? onDownload;

  const AttachedFileCard({
    super.key,
    required this.path,
    this.name,
    this.authToken,
    this.onDownload,
  });

  String get effectiveName {
    if (name != null && name!.isNotEmpty) return name!;
    final clean = path.split('?').first;
    return clean.split('/').last.split('\\').last;
  }

  String get extension => FileClassifier.getExtension(effectiveName);

  String _resolveDownloadUrl() {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    final base = AppConfig.apiBaseUrl;
    final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final cleanPath = path.startsWith('/') ? path.substring(1) : path;
    final url = '$cleanBase/api/workspace/$cleanPath';

    final uri = Uri.tryParse(url);
    if (uri == null) return url;

    final params = Map<String, String>.from(uri.queryParameters);
    params['download'] = 'true';
    if (authToken != null && authToken!.isNotEmpty) {
      params['token'] = authToken!;
    }

    return uri.replace(queryParameters: params).toString();
  }

  Future<void> _handleDownload(BuildContext context) async {
    if (onDownload != null) {
      onDownload!();
      return;
    }

    final downloadUrl = _resolveDownloadUrl();
    final uri = Uri.tryParse(downloadUrl);
    if (uri != null) {
      final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not download file'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final extLabel = extension.isNotEmpty ? extension.toUpperCase() : 'DOC';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: Center(
              child: Text(
                extLabel.length > 3 ? extLabel.substring(0, 3) : extLabel,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  effectiveName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  path,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton(
            icon: const Icon(Icons.download_rounded, size: 18),
            color: AppColors.primary,
            tooltip: 'Download file',
            onPressed: () => _handleDownload(context),
          ),
        ],
      ),
    );
  }
}
