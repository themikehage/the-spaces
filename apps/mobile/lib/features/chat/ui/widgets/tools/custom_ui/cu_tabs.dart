import 'package:flutter/material.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

typedef ChildRenderer = Widget Function(dynamic childJson, int index);

class CuTabs extends StatefulWidget {
  final List<Map<String, dynamic>> tabs;
  final int defaultTab;
  final ChildRenderer renderChild;

  const CuTabs({
    super.key,
    required this.tabs,
    this.defaultTab = 0,
    required this.renderChild,
  });

  factory CuTabs.fromJson(
    Map<String, dynamic> json, {
    required ChildRenderer renderChild,
  }) {
    final rawTabs = json['tabs'];
    final tabsList = <Map<String, dynamic>>[];
    if (rawTabs is List) {
      for (final t in rawTabs) {
        if (t is Map) {
          tabsList.add(Map<String, dynamic>.from(t));
        }
      }
    }

    final rawDef = json['defaultTab'];
    final def = rawDef is int ? rawDef : 0;

    return CuTabs(
      tabs: tabsList,
      defaultTab: def,
      renderChild: renderChild,
    );
  }

  @override
  State<CuTabs> createState() => _CuTabsState();
}

class _CuTabsState extends State<CuTabs> {
  late int _activeTab;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.defaultTab.clamp(
      0,
      widget.tabs.isEmpty ? 0 : widget.tabs.length - 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tabs.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final activeTabData = widget.tabs[_activeTab];
    final rawContent = activeTabData['content'];
    final contentList = rawContent is List
        ? rawContent
        : (rawContent != null ? [rawContent] : <dynamic>[]);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkSurface.withValues(alpha: 0.4)
                  : AppColors.lightSurface,
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: widget.tabs.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final tab = entry.value;
                  final isSelected = idx == _activeTab;
                  final label = tab['label']?.toString() ?? 'Tab ${idx + 1}';

                  return InkWell(
                    onTap: () {
                      if (_activeTab != idx) {
                        setState(() => _activeTab = idx);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isSelected
                                ? AppColors.primary
                                : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        color: isSelected
                            ? (isDark
                                ? AppColors.darkCard
                                : AppColors.lightCard)
                            : Colors.transparent,
                      ),
                      child: Text(
                        label,
                        style: AppTypography.labelSmall.copyWith(
                          color: isSelected
                              ? (isDark
                                  ? AppColors.darkForeground
                                  : AppColors.lightForeground)
                              : (isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight),
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: contentList.asMap().entries.map((entry) {
                final idx = entry.key;
                final childJson = entry.value;
                return Padding(
                  padding: EdgeInsets.only(
                    bottom: idx == contentList.length - 1 ? 0 : AppSpacing.sm,
                  ),
                  child: widget.renderChild(childJson, idx),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
