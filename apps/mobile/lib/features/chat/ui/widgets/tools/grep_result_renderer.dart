import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../../../core/theme/app_theme.dart';
import '../../../data/models/chat_message.dart';

class GrepResultRenderer extends StatelessWidget {
  final ToolCall toolCall;

  const GrepResultRenderer({
    super.key,
    required this.toolCall,
  });

  String _extractQuery() {
    final args = toolCall.arguments;
    final query = args['query'] ??
        args['Query'] ??
        args['pattern'] ??
        args['regex'] ??
        args['searchTerm'];
    return query?.toString() ?? '';
  }

  List<String> _extractMatchLines() {
    final result = toolCall.result;
    if (result == null) return [];
    if (result is List) {
      return result.map((e) {
        if (e is Map) {
          final file = e['file'] ?? e['path'] ?? e['filename'] ?? '';
          final line = e['line'] ?? e['lineNumber'] ?? '';
          final text = e['text'] ?? e['lineContent'] ?? e['match'] ?? '';
          if (file.toString().isNotEmpty) {
            return '$file:$line: $text';
          }
          return jsonEncode(e);
        }
        return e.toString();
      }).toList();
    }
    if (result is String) {
      return result
          .split('\n')
          .map((l) => l.trimRight())
          .where((l) => l.isNotEmpty)
          .toList();
    }
    if (result is Map) {
      final matches = result['matches'] ?? result['results'] ?? result['output'];
      if (matches is List) {
        return matches.map((e) => e.toString()).toList();
      }
      return [result.toString()];
    }
    return [result.toString()];
  }

  Widget _buildHighlightedText({
    required String text,
    required String query,
    required TextStyle baseStyle,
    required TextStyle highlightStyle,
  }) {
    if (query.isEmpty || !text.toLowerCase().contains(query.toLowerCase())) {
      return SelectableText(text, style: baseStyle);
    }

    final spans = <TextSpan>[];
    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();
    int start = 0;

    while (true) {
      final index = lowerText.indexOf(lowerQuery, start);
      if (index == -1) {
        if (start < text.length) {
          spans.add(TextSpan(text: text.substring(start), style: baseStyle));
        }
        break;
      }
      if (index > start) {
        spans.add(TextSpan(text: text.substring(start, index), style: baseStyle));
      }
      spans.add(
        TextSpan(
          text: text.substring(index, index + query.length),
          style: highlightStyle,
        ),
      );
      start = index + query.length;
    }

    return SelectableText.rich(
      TextSpan(children: spans),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final query = _extractQuery();
    final matchLines = _extractMatchLines();

    final codeBg = isDark ? AppColors.black.withValues(alpha: 0.3) : AppColors.white;
    final defaultTextColor = isDark ? AppColors.darkForeground : AppColors.lightForeground;

    final baseStyle = AppTypography.code.copyWith(
      fontSize: 12,
      color: defaultTextColor,
    );
    final highlightStyle = AppTypography.code.copyWith(
      fontSize: 12,
      fontWeight: FontWeight.bold,
      color: isDark ? AppColors.white : AppColors.black,
      backgroundColor: AppColors.warning.withValues(alpha: 0.4),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (query.isNotEmpty) ...[
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  border: Border.all(
                    color: AppColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.search, size: 12, color: AppColors.warning),
                    const SizedBox(width: 4),
                    Text(
                      query,
                      style: AppTypography.code.copyWith(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.warning,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '${matchLines.length} match${matchLines.length == 1 ? '' : 'es'}',
                style: AppTypography.labelSmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (matchLines.isNotEmpty) ...[
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: codeBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 300),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  itemCount: matchLines.length,
                  separatorBuilder: (_, __) => Divider(
                    height: 8,
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                  itemBuilder: (ctx, idx) {
                    final line = matchLines[idx];
                    return _buildHighlightedText(
                      text: line,
                      query: query,
                      baseStyle: baseStyle,
                      highlightStyle: highlightStyle,
                    );
                  },
                ),
              ),
            ),
          ),
        ] else ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: codeBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Text(
              'No matches found',
              style: AppTypography.bodySmall.copyWith(
                fontStyle: FontStyle.italic,
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
