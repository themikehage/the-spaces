import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../features/chat/ui/chat_screen.dart';
import '../../features/sessions/ui/widgets/entity_sessions_sheet.dart';
import '../notifiers/entity_session_notifier.dart';
import 'entity_config_sheet.dart';
import 'entity_page_indicator.dart';
import 'workspace_files_panel.dart';

class EntityChatScreen extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final String entityName;
  final String? initialSessionId;
  final VoidCallback? onDelete;
  final VoidCallback? onConfigSaved;

  const EntityChatScreen({
    super.key,
    required this.entityType,
    required this.entityId,
    required this.entityName,
    this.initialSessionId,
    this.onDelete,
    this.onConfigSaved,
  });

  @override
  ConsumerState<EntityChatScreen> createState() => _EntityChatScreenState();
}

class _EntityChatScreenState extends ConsumerState<EntityChatScreen> {
  late final PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  EntitySessionArgs get _sessionArgs => EntitySessionArgs(
        entityType: widget.entityType,
        entityId: widget.entityId,
        initialSessionId: widget.initialSessionId,
      );

  void _openSessionsSheet(String? currentSessionId) {
    EntitySessionsSheet.show(
      context,
      entityType: widget.entityType,
      entityId: widget.entityId,
      currentSessionId: currentSessionId,
      onSessionSelected: (sessionId) {
        ref
            .read(entitySessionNotifierProvider(_sessionArgs).notifier)
            .selectSession(sessionId);
      },
    );
  }

  void _openConfigSheet() {
    EntityConfigSheet.show(
      context,
      entityType: widget.entityType,
      entityId: widget.entityId,
      entityName: widget.entityName,
      onSave: widget.onConfigSaved,
      onDelete: widget.onDelete,
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(entitySessionNotifierProvider(_sessionArgs));
    final sessionNotifier =
        ref.read(entitySessionNotifierProvider(_sessionArgs).notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('entity_chat_back_button'),
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/${widget.entityType}s');
            }
          },
        ),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.entityName,
              style: AppTypography.titleMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            EntityPageIndicator(
              currentPage: _currentPage,
              pageCount: 2,
              onDotTapped: (page) {
                _pageController.animateToPage(
                  page,
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                );
              },
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          TextButton(
            key: const Key('entity_chat_sessions_button'),
            onPressed: () => _openSessionsSheet(sessionState.currentSessionId),
            style: TextButton.styleFrom(
              foregroundColor: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.forum_outlined, size: 16),
                const SizedBox(width: 4),
                Text(
                  'Sessions',
                  style: AppTypography.labelMedium.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            key: const Key('entity_chat_config_button'),
            icon: const Icon(Icons.more_horiz),
            tooltip: 'Configuration',
            onPressed: _openConfigSheet,
          ),
        ],
      ),
      body: Builder(
        builder: (context) {
          if (sessionState.isLoading && sessionState.currentSessionId == null) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (sessionState.error != null && sessionState.currentSessionId == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: AppColors.destructive,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Failed to load entity session',
                      style: AppTypography.titleMedium.copyWith(
                        color: AppColors.destructive,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      sessionState.error!,
                      textAlign: TextAlign.center,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    ElevatedButton.icon(
                      onPressed: () => sessionNotifier.resolveActiveSession(),
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final sessionId = sessionState.currentSessionId ?? '';

          return PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            children: [
              // Page 0: ChatScreen
              ChatScreen(
                key: ValueKey('chat_screen_$sessionId'),
                sessionId: sessionId,
                showAppBar: false,
                entityType: widget.entityType,
                entityId: widget.entityId,
              ),

              // Page 1: WorkspaceFilesPanel
              WorkspaceFilesPanel(
                entityType: widget.entityType,
                entityId: widget.entityId,
                entityName: widget.entityName,
              ),
            ],
          );
        },
      ),
    );
  }
}
