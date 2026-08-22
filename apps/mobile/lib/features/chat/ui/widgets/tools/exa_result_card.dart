import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class ExaResultCard extends StatefulWidget {
  final ToolCall toolCall;

  const ExaResultCard({
    super.key,
    required this.toolCall,
  });

  @override
  State<ExaResultCard> createState() => _ExaResultCardState();
}

class _ExaItem {
  final String title;
  final String url;
  final String? publishedDate;
  final String? snippet;

  const _ExaItem({
    required this.title,
    required this.url,
    this.publishedDate,
    this.snippet,
  });
}

class _ExaResultCardState extends State<ExaResultCard> {
  bool _showAll = false;
  bool _synthOpen = false;

  List<_ExaItem> _extractItems() {
    final res = widget.toolCall.result;
    final List<_ExaItem> items = [];

    if (res is Map && res['results'] is List) {
      for (final r in (res['results'] as List)) {
        if (r is Map) {
          items.add(_ExaItem(
            title: (r['title'] ?? r['name'] ?? 'Untitled').toString(),
            url: (r['url'] ?? '').toString(),
            publishedDate: r['publishedDate']?.toString(),
            snippet: (r['snippet'] ?? r['text'] ?? r['content'])?.toString(),
          ));
        }
      }
      return items;
    }

    final raw = res?.toString().trim() ?? '';
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          for (final r in decoded) {
            if (r is Map && r.containsKey('url')) {
              items.add(_ExaItem(
                title: (r['title'] ?? r['name'] ?? 'Untitled').toString(),
                url: r['url'].toString(),
                publishedDate: r['publishedDate']?.toString(),
                snippet: (r['snippet'] ?? r['text'] ?? r['content'])?.toString(),
              ));
            }
          }
          if (items.isNotEmpty) return items;
        }
      } catch (_) {}
    }

    final blocks = raw.split(RegExp(r'(?=\n?\d+\.\s+)'));
    for (final block in blocks) {
      final titleMatch = RegExp(r'\d+\.\s+(.+?)(?:\r?\n|$)').firstMatch(block);
      final urlMatch = RegExp(r'URL:\s*(https?://[^\s\r\n]+)', caseSensitive: false).firstMatch(block);
      final dateMatch = RegExp(r'Published:\s*([^\r\n]+)', caseSensitive: false).firstMatch(block);
      final snippetMatch = RegExp(r'>\s*([^\r\n]+)').firstMatch(block);

      if (urlMatch != null) {
        items.add(_ExaItem(
          title: titleMatch?.group(1)?.trim() ?? 'Untitled',
          url: urlMatch.group(1)?.trim() ?? '',
          publishedDate: dateMatch?.group(1)?.trim(),
          snippet: snippetMatch?.group(1)?.trim(),
        ));
      }
    }

    return items;
  }

  String _extractDomain(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.host.replaceFirst(RegExp(r'^www\.'), '');
    } catch (_) {
      return url;
    }
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
    final items = _extractItems();
    final resMap = widget.toolCall.result is Map ? widget.toolCall.result as Map : null;
    final searchType = resMap?['searchType']?.toString();
    final cost = resMap?['costDollars'] != null ? double.tryParse(resMap!['costDollars'].toString()) : null;
    final synthesized = resMap?['synthesizedOutput']?.toString();

    if (items.isEmpty && synthesized == null) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Text(
          'No search results found',
          style: AppTypography.bodySmall.copyWith(
            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
            fontStyle: FontStyle.italic,
          ),
        ),
      );
    }

    final visible = _showAll ? items : items.take(5).toList();
    final hiddenCount = items.length - visible.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.travel_explore_rounded, size: 14, color: AppColors.primary),
            const SizedBox(width: AppSpacing.xs),
            Text(
              '${items.length} Web Results',
              style: AppTypography.titleSmall.copyWith(
                fontSize: 12,
                color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              ),
            ),
            if (searchType != null) ...[
              const SizedBox(width: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Text(
                  searchType,
                  style: AppTypography.labelSmall.copyWith(fontSize: 9.5),
                ),
              ),
            ],
            if (cost != null && cost > 0) ...[
              const Spacer(),
              Text(
                '\$${cost.toStringAsFixed(4)}',
                style: AppTypography.code.copyWith(
                  fontSize: 10,
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        ...visible.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: item.url.isNotEmpty ? () => _openUrl(item.url) : null,
                      child: Text(
                        item.title,
                        style: AppTypography.titleSmall.copyWith(
                          fontSize: 12,
                          color: AppColors.primary,
                          decoration: TextDecoration.underline,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          _extractDomain(item.url),
                          style: AppTypography.labelSmall.copyWith(
                            fontSize: 10,
                            color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          ),
                        ),
                        if (item.publishedDate != null) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            '• ${item.publishedDate}',
                            style: AppTypography.labelSmall.copyWith(
                              fontSize: 10,
                              color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (item.snippet != null && item.snippet!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.snippet!,
                        style: AppTypography.bodySmall.copyWith(
                          fontSize: 11,
                          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            )),
        if (hiddenCount > 0)
          GestureDetector(
            onTap: () => setState(() => _showAll = true),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(
                'Show $hiddenCount more results...',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        if (synthesized != null && synthesized.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xs),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
            child: Column(
              children: [
                InkWell(
                  onTap: () => setState(() => _synthOpen = !_synthOpen),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 6),
                    child: Row(
                      children: [
                        Icon(
                          _synthOpen ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_right,
                          size: 16,
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Synthesized Output',
                          style: AppTypography.labelSmall.copyWith(
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_synthOpen)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppSpacing.radiusSm - 1)),
                    ),
                    child: SelectableText(
                      synthesized,
                      style: AppTypography.bodySmall.copyWith(fontSize: 11),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
