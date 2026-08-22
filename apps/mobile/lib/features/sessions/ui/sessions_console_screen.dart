import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import 'sessions_console_notifier.dart';

class SessionsConsoleScreen extends ConsumerStatefulWidget {
  const SessionsConsoleScreen({super.key});

  @override
  ConsumerState<SessionsConsoleScreen> createState() => _SessionsConsoleScreenState();
}

class _SessionsConsoleScreenState extends ConsumerState<SessionsConsoleScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOut,
      );
    });
  }

  String _formatTimestamp(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  Color _getCategoryColor(String type) {
    switch (type) {
      case 'reasoning':
        return AppColors.chart3Dark;
      case 'tools':
        return AppColors.chart2Dark;
      case 'errors':
        return AppColors.destructive;
      case 'messages':
      default:
        return AppColors.darkForeground;
    }
  }

  Widget _buildFilterChip({
    required String label,
    required String categoryKey,
    required Color color,
    required bool isSelected,
    required VoidCallback onToggle,
  }) {
    return FilterChip(
      key: Key('console_filter_$categoryKey'),
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onToggle(),
      backgroundColor: AppColors.darkCard,
      selectedColor: color.withValues(alpha: 0.2),
      checkmarkColor: color,
      labelStyle: AppTypography.labelSmall.copyWith(
        color: isSelected ? color : AppColors.mutedForeground,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
      ),
      side: BorderSide(
        color: isSelected ? color : AppColors.darkBorder,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionsConsoleNotifierProvider);
    final notifier = ref.read(sessionsConsoleNotifierProvider.notifier);
    final events = state.filteredEvents;

    ref.listen(sessionsConsoleNotifierProvider, (previous, next) {
      if (!next.isFrozen && previous?.events.length != next.events.length) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      body: Column(
        children: [
          // Filter Chips & Controls bar
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: const BoxDecoration(
              color: AppColors.darkCard,
              border: Border(
                bottom: BorderSide(color: AppColors.darkBorder),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip(
                    label: 'Messages',
                    categoryKey: 'messages',
                    color: AppColors.primary,
                    isSelected: state.activeFilters.contains('messages'),
                    onToggle: () => notifier.toggleFilter('messages'),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  _buildFilterChip(
                    label: 'Reasoning',
                    categoryKey: 'reasoning',
                    color: AppColors.chart3Dark,
                    isSelected: state.activeFilters.contains('reasoning'),
                    onToggle: () => notifier.toggleFilter('reasoning'),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  _buildFilterChip(
                    label: 'Tools',
                    categoryKey: 'tools',
                    color: AppColors.chart2Dark,
                    isSelected: state.activeFilters.contains('tools'),
                    onToggle: () => notifier.toggleFilter('tools'),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  _buildFilterChip(
                    label: 'Errors',
                    categoryKey: 'errors',
                    color: AppColors.destructive,
                    isSelected: state.activeFilters.contains('errors'),
                    onToggle: () => notifier.toggleFilter('errors'),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  IconButton(
                    key: const Key('console_clear_button'),
                    icon: const Icon(Icons.delete_sweep_outlined, size: 18),
                    tooltip: 'Clear console',
                    color: AppColors.mutedForeground,
                    onPressed: () => notifier.clear(),
                  ),
                ],
              ),
            ),
          ),
          // Status bar
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: 4.0,
            ),
            color: AppColors.darkSurface,
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: state.isConnected ? AppColors.success : AppColors.mutedForeground,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  state.isConnected ? 'Connected' : 'Disconnected',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.mutedForeground,
                    fontSize: 10,
                  ),
                ),
                const Spacer(),
                Text(
                  '${events.length} / ${state.events.length} events',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.mutedForeground,
                    fontSize: 10,
                  ),
                ),
                if (state.isFrozen) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: Text(
                      'FROZEN',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w700,
                        fontSize: 9,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Logs list
          Expanded(
            child: events.isEmpty
                ? Center(
                    key: const Key('console_empty_state'),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.terminal,
                          size: 48,
                          color: AppColors.mutedForeground,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'No console logs yet',
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Real-time WebSocket events will appear here',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.textTertiaryDark,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    key: const Key('console_events_list'),
                    controller: _scrollController,
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    itemCount: events.length,
                    itemBuilder: (context, index) {
                      final event = events[index];
                      final catColor = _getCategoryColor(event.type);

                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: 4.0,
                        ),
                        margin: const EdgeInsets.only(bottom: 2.0),
                        decoration: BoxDecoration(
                          color: AppColors.darkCard.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatTimestamp(event.timestamp),
                              style: AppTypography.code.copyWith(
                                color: AppColors.mutedForeground,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: catColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(
                                event.type.toUpperCase(),
                                style: AppTypography.labelSmall.copyWith(
                                  color: catColor,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 9,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: SelectableText(
                                event.content,
                                style: AppTypography.code.copyWith(
                                  color: catColor,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.small(
        key: const Key('console_freeze_fab'),
        onPressed: () => notifier.toggleFreeze(),
        backgroundColor: state.isFrozen ? AppColors.warning : AppColors.darkSurface,
        foregroundColor: state.isFrozen ? AppColors.black : AppColors.white,
        tooltip: state.isFrozen ? 'Unfreeze stream' : 'Freeze stream',
        child: Icon(
          state.isFrozen ? Icons.play_arrow : Icons.pause,
          size: 18,
        ),
      ),
    );
  }
}
