import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'cu_accordion.dart';
import 'cu_audio.dart';
import 'cu_badge.dart';
import 'cu_card.dart';
import 'cu_card_list.dart';
import 'cu_code.dart';
import 'cu_diff.dart';
import 'cu_html.dart';
import 'cu_image_grid.dart';
import 'cu_markdown.dart';
import 'cu_metric.dart';
import 'cu_pdf.dart';
import 'cu_progress.dart';
import 'cu_section.dart';
import 'cu_stats.dart';
import 'cu_steps.dart';
import 'cu_table.dart';
import 'cu_tabs.dart';
import 'cu_timeline.dart';
import 'cu_video.dart';

class CustomUiRenderer extends StatelessWidget {
  final dynamic ui;
  final Map<String, dynamic>? presentation;
  final String? authToken;
  final String? sessionId;

  const CustomUiRenderer({
    super.key,
    required this.ui,
    this.presentation,
    this.authToken,
    this.sessionId,
  });

  Widget _renderComponent(dynamic comp, BuildContext context, int index) {
    if (comp == null) return const SizedBox.shrink();

    if (comp is! Map) {
      return Text(comp.toString());
    }

    final map = Map<String, dynamic>.from(comp);
    final type = map['type']?.toString().toLowerCase().trim() ?? '';
    final accordionDefaultOpen = presentation?['accordionDefaultOpen'] != false;

    switch (type) {
      case 'badge':
        return CuBadge.fromJson(map);

      case 'card':
        return CuCard.fromJson(map);

      case 'card-list':
      case 'card_list':
      case 'cards':
        return CuCardList.fromJson(map);

      case 'table':
        return CuTable.fromJson(map);

      case 'metric':
        return CuMetric.fromJson(map);

      case 'code':
        return CuCode.fromJson(map);

      case 'section':
        return CuSection.fromJson(
          map,
          renderChild: (child, idx) => _renderComponent(child, context, idx),
        );

      case 'html':
      case 'custom-html':
      case 'custom_html':
        return CuHtml.fromJson(map);

      case 'video':
        return CuVideo.fromJson(map, authToken: authToken);

      case 'audio':
        return CuAudio.fromJson(map, authToken: authToken);

      case 'pdf':
        return CuPdf.fromJson(map);

      case 'tabs':
        return CuTabs.fromJson(
          map,
          renderChild: (child, idx) => _renderComponent(child, context, idx),
        );

      case 'markdown':
        return CuMarkdown.fromJson(map, authToken: authToken);

      case 'progress':
        return CuProgress.fromJson(map);

      case 'accordion':
        return CuAccordion.fromJson(
          map,
          defaultOpen: accordionDefaultOpen,
          renderChild: (child, idx) => _renderComponent(child, context, idx),
        );

      case 'diff':
        return CuDiff.fromJson(map);

      case 'steps':
        return CuSteps.fromJson(map);

      case 'stats':
        return CuStats.fromJson(map);

      case 'timeline':
        return CuTimeline.fromJson(map);

      case 'image-grid':
      case 'image_grid':
      case 'images':
      case 'image':
        return CuImageGrid.fromJson(map, authToken: authToken);

      default:
        if (map.containsKey('images') || map.containsKey('urls')) {
          return CuImageGrid.fromJson(map, authToken: authToken);
        }
        if (map.containsKey('oldCode') && map.containsKey('newCode')) {
          return CuDiff.fromJson(map);
        }
        if (map.containsKey('stats') && map['stats'] is List) {
          return CuStats.fromJson(map);
        }
        if (map.containsKey('steps') && map['steps'] is List) {
          return CuSteps.fromJson(map);
        }
        if (map.containsKey('cards') && map['cards'] is List) {
          return CuCardList.fromJson(map);
        }
        if (map.containsKey('columns') && map.containsKey('rows')) {
          return CuTable.fromJson(map);
        }
        if (map.containsKey('html')) {
          return CuHtml.fromJson(map);
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          child: Text(
            'Unknown UI component: $type',
            style: AppTypography.labelSmall.copyWith(
              color: isDark
                  ? AppColors.mutedForeground
                  : AppColors.textSecondaryLight,
              fontSize: 11,
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (ui == null) return const SizedBox.shrink();

    final List<dynamic> components = (ui is List) ? (ui as List) : [ui];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: components.asMap().entries.map((entry) {
        final idx = entry.key;
        final comp = entry.value;
        return Padding(
          padding: EdgeInsets.only(
            bottom: idx == components.length - 1 ? 0 : AppSpacing.md,
          ),
          child: _renderComponent(comp, context, idx),
        );
      }).toList(),
    );
  }
}
