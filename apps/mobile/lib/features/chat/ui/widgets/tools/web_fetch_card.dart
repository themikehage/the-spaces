import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class WebFetchCard extends StatefulWidget {
  final ToolCall toolCall;

  const WebFetchCard({
    super.key,
    required this.toolCall,
  });

  @override
  State<WebFetchCard> createState() => _WebFetchCardState();
}

class _WebFetchCardState extends State<WebFetchCard> {
  bool _expanded = false;

  String _extractUrl() {
    final args = widget.toolCall.arguments;
    final url = args['url'] ?? args['Url'] ?? args['link'] ?? args['uri'];
    if (url != null) return url.toString();

    final res = widget.toolCall.result;
    if (res is Map) {
      final resUrl = res['url'] ?? res['Url'] ?? res['link'];
      if (resUrl != null) return resUrl.toString();
    }
    return '';
  }

  String _extractContent() {
    final res = widget.toolCall.result;
    if (res == null) return '';
    if (res is String) return res;
    if (res is Map) {
      final content = res['content'] ?? res['text'] ?? res['html'] ?? res['body'];
      if (content != null) return content.toString();
      try {
        return const JsonEncoder.withIndent('  ').convert(res);
      } catch (_) {
        return res.toString();
      }
    }
    return res.toString();
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final url = _extractUrl();
    final content = _extractContent();
    final args = widget.toolCall.arguments;
    final title = (args['title'] ?? args['name'] ?? (url.isNotEmpty ? Uri.tryParse(url)?.host : 'Web Content')).toString();

    final cardBg = isDark ? AppColors.darkBackground : AppColors.lightSurface;
    final headerBg = isDark ? AppColors.darkSurface : AppColors.lightSurfaceHover;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
            decoration: BoxDecoration(
              color: headerBg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusSm - 1)),
            ),
            child: Row(
              children: [
                const Icon(Icons.language_rounded, size: 14, color: AppColors.primary),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    title,
                    style: AppTypography.titleSmall.copyWith(
                      fontSize: 11.5,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (url.isNotEmpty) ...[
                  const SizedBox(width: AppSpacing.xs),
                  InkWell(
                    onTap: () => _openUrl(url),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Row(
                        children: [
                          Text(
                            'Open',
                            style: AppTypography.labelSmall.copyWith(fontSize: 10, color: AppColors.primary),
                          ),
                          const SizedBox(width: 2),
                          const Icon(Icons.open_in_new_rounded, size: 11, color: AppColors.primary),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (content.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ConstrainedBox(
                    constraints: BoxConstraints(maxHeight: _expanded ? 300 : 100),
                    child: SingleChildScrollView(
                      child: SelectableText(
                        content,
                        style: AppTypography.code.copyWith(
                          fontSize: 11,
                          height: 1.4,
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                      ),
                    ),
                  ),
                  if (content.length > 200) ...[
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () => setState(() => _expanded = !_expanded),
                      child: Text(
                        _expanded ? 'Show less' : 'Show full content...',
                        style: AppTypography.labelSmall.copyWith(fontSize: 10, color: AppColors.primary),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
