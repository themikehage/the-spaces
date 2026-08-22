import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../data/models/session.dart';
import 'sessions_console_screen.dart';
import 'sessions_notifier.dart';
import 'sessions_state.dart';
import 'widgets/new_session_sheet.dart';
import 'widgets/session_list_item.dart';
import 'widgets/sessions_skeleton.dart';

class SessionsScreen extends ConsumerStatefulWidget {
  const SessionsScreen({super.key});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen> {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    if (currentScroll >= (maxScroll - 200)) {
      ref.read(sessionsNotifierProvider.notifier).loadMore();
    }
  }

  void _onSearchChanged(String value) {
    ref.read(sessionsNotifierProvider.notifier).search(value);
  }

  Future<void> _onRefresh() async {
    await ref.read(sessionsNotifierProvider.notifier).load();
  }

  Future<bool?> _confirmDelete(BuildContext context, Session session) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Delete Session',
          style: AppTypography.titleLarge.copyWith(
            color: AppColors.darkForeground,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to delete "${session.title.isNotEmpty ? session.title : session.id}"? This action cannot be undone.',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.mutedForeground,
          ),
        ),
        actions: [
          TextButton(
            key: const Key('cancel_delete_button'),
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancel',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.mutedForeground,
              ),
            ),
          ),
          ElevatedButton(
            key: const Key('confirm_delete_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Delete',
              style: AppTypography.bodyMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.destructiveForeground,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(String currentFilter) {
    const filters = [
      {'key': 'all', 'label': 'All'},
      {'key': 'active', 'label': 'Active'},
      {'key': 'idle', 'label': 'Idle'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: filters.map((f) {
          final isSelected = currentFilter.toLowerCase() == f['key'];
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: FilterChip(
              key: Key('filter_chip_${f['key']}'),
              label: Text(f['label']!),
              selected: isSelected,
              onSelected: (_) {
                ref.read(sessionsNotifierProvider.notifier).setFilter(f['key']!);
              },
              backgroundColor: AppColors.darkCard,
              selectedColor: AppColors.primary.withValues(alpha: 0.2),
              checkmarkColor: AppColors.primary,
              labelStyle: AppTypography.labelMedium.copyWith(
                color: isSelected ? AppColors.primary : AppColors.mutedForeground,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              side: BorderSide(
                color: isSelected ? AppColors.primary : AppColors.darkBorder,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      key: const Key('sessions_empty_state'),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: AppColors.mutedForeground.withValues(alpha: 0.5),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No Sessions Found',
              style: AppTypography.titleLarge.copyWith(
                color: AppColors.darkForeground,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Create a new session to get started with your AI agents.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.mutedForeground,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              key: const Key('empty_state_create_button'),
              onPressed: () => NewSessionSheet.show(context),
              icon: const Icon(Icons.add),
              label: const Text('New Session'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.primaryForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionsListView(SessionsState state, List<Session> displayedSessions) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        key: const Key('new_session_fab'),
        onPressed: () => NewSessionSheet.show(context),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        tooltip: 'New Session',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: TextField(
              key: const Key('sessions_search_field'),
              controller: _searchController,
              onChanged: _onSearchChanged,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.darkForeground,
              ),
              decoration: InputDecoration(
                hintText: 'Search sessions...',
                prefixIcon: const Icon(Icons.search, color: AppColors.mutedForeground),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppColors.mutedForeground),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.darkCard,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  borderSide: const BorderSide(color: AppColors.darkBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  borderSide: const BorderSide(color: AppColors.darkBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ),
          _buildFilterChips(state.filter),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: state.isLoading
                ? const SessionsSkeleton()
                : displayedSessions.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _onRefresh,
                        color: AppColors.primary,
                        backgroundColor: AppColors.darkCard,
                        child: ListView.separated(
                          key: const Key('sessions_list_view'),
                          controller: _scrollController,
                          padding: const EdgeInsets.all(AppSpacing.md),
                          itemCount: displayedSessions.length + (state.isLoadingMore ? 1 : 0),
                          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            if (index == displayedSessions.length) {
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(AppSpacing.md),
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.primary,
                                      semanticsLabel: 'Loading more sessions',
                                    ),
                                  ),
                                ),
                              );
                            }

                            final session = displayedSessions[index];
                            return Dismissible(
                              key: Key('dismissible_session_${session.id}'),
                              direction: DismissDirection.endToStart,
                              confirmDismiss: (_) => _confirmDelete(context, session),
                              onDismissed: (_) {
                                ref
                                    .read(sessionsNotifierProvider.notifier)
                                    .deleteSession(session.id);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Session "${session.title}" deleted'),
                                    backgroundColor: AppColors.darkCard,
                                  ),
                                );
                              },
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: AppSpacing.lg),
                                decoration: BoxDecoration(
                                  color: AppColors.destructive,
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                ),
                                child: const Icon(
                                  Icons.delete_outline,
                                  color: AppColors.destructiveForeground,
                                ),
                              ),
                              child: SessionListItem(session: session),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionsNotifierProvider);
    final displayedSessions = state.filteredSessions;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            key: const Key('sessions_drawer_button'),
            icon: const Icon(Icons.menu),
            tooltip: 'Open menu',
            onPressed: () {
              Scaffold.maybeOf(context)?.openDrawer();
            },
          ),
          title: const Text('Sessions Hub'),
          bottom: const TabBar(
            tabs: [
              Tab(
                key: Key('sessions_tab_list'),
                text: 'Sessions',
                icon: Icon(Icons.chat_bubble_outline, size: 18),
              ),
              Tab(
                key: Key('sessions_tab_console'),
                text: 'Console',
                icon: Icon(Icons.terminal, size: 18),
              ),
            ],
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.mutedForeground,
          ),
        ),
        body: TabBarView(
          children: [
            _buildSessionsListView(state, displayedSessions),
            const SessionsConsoleScreen(),
          ],
        ),
      ),
    );
  }
}
