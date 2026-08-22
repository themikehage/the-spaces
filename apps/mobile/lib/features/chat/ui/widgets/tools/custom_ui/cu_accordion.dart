import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

typedef ChildRenderer = Widget Function(dynamic childJson, int index);

class CuAccordion extends StatefulWidget {
  final List<Map<String, dynamic>> items;
  final bool defaultOpen;
  final ChildRenderer renderChild;

  const CuAccordion({
    super.key,
    required this.items,
    this.defaultOpen = true,
    required this.renderChild,
  });

  factory CuAccordion.fromJson(
    Map<String, dynamic> json, {
    bool defaultOpen = true,
    required ChildRenderer renderChild,
  }) {
    final rawItems = json['items'];
    final itemsList = <Map<String, dynamic>>[];
    if (rawItems is List) {
      for (final it in rawItems) {
        if (it is Map) {
          itemsList.add(Map<String, dynamic>.from(it));
        }
      }
    }

    final globalDef = json['defaultOpen'] is bool ? json['defaultOpen'] as bool : defaultOpen;

    return CuAccordion(
      items: itemsList,
      defaultOpen: globalDef,
      renderChild: renderChild,
    );
  }

  @override
  State<CuAccordion> createState() => _CuAccordionState();
}

class _CuAccordionState extends State<CuAccordion> {
  late Map<int, bool> _openIndexes;

  @override
  void initState() {
    super.initState();
    _openIndexes = {};
    for (int i = 0; i < widget.items.length; i++) {
      final it = widget.items[i];
      final itemDef = it['defaultOpen'];
      final shouldOpen = itemDef is bool ? itemDef : widget.defaultOpen;
      _openIndexes[i] = shouldOpen;
    }
  }

  void _toggleIndex(int index) {
    setState(() {
      _openIndexes[index] = !(_openIndexes[index] ?? false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Column(
      children: widget.items.asMap().entries.map((entry) {
        final idx = entry.key;
        final item = entry.value;
        final isOpen = _openIndexes[idx] ?? false;
        final title = item['title']?.toString() ?? 'Item ${idx + 1}';

        final rawContent = item['content'];
        final contentList = rawContent is List
            ? rawContent
            : (rawContent != null ? [rawContent] : <dynamic>[]);

        return Container(
          margin: EdgeInsets.only(
            bottom: idx == widget.items.length - 1 ? 0 : AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: border),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: () => _toggleIndex(idx),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkSurface.withValues(alpha: 0.3)
                        : AppColors.lightSurface,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: AppTypography.titleSmall.copyWith(
                            color: isDark
                                ? AppColors.darkForeground
                                : AppColors.lightForeground,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Icon(
                        isOpen
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: isDark
                            ? AppColors.mutedForeground
                            : AppColors.textSecondaryLight,
                      ),
                    ],
                  ),
                ),
              ),
              if (isOpen) ...[
                Divider(height: 1, color: border.withValues(alpha: 0.6)),
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: contentList.asMap().entries.map((cEntry) {
                      final cIdx = cEntry.key;
                      final childJson = cEntry.value;
                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: cIdx == contentList.length - 1
                              ? 0
                              : AppSpacing.sm,
                        ),
                        child: widget.renderChild(childJson, cIdx),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }
}
