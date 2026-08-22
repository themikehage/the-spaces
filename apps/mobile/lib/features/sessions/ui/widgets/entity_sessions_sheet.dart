import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/create_session_input.dart';
import '../../data/models/session.dart';
import '../../data/sessions_repository.dart';

class EntitySessionsSheet extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final String? currentSessionId;
  final ValueChanged<String> onSessionSelected;

  const EntitySessionsSheet({
    super.key,
    required this.entityType,
    required this.entityId,
    this.currentSessionId,
    required this.onSessionSelected,
  });

  static Future<void> show(
    BuildContext context, {
    required String entityType,
    required String entityId,
    String? currentSessionId,
    required ValueChanged<String> onSessionSelected,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EntitySessionsSheet(
        entityType: entityType,
        entityId: entityId,
        currentSessionId: currentSessionId,
        onSessionSelected: onSessionSelected,
      ),
    );
  }

  @override
  ConsumerState<EntitySessionsSheet> createState() => _EntitySessionsSheetState();
}

class _EntitySessionsSheetState extends ConsumerState<EntitySessionsSheet> {
  bool _isLoading = true;
  bool _isCreating = false;
  String? _error;
  List<Session> _sessions = [];

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(sessionsRepositoryProvider);
      final result = await repository.getSessions(
        agentId: widget.entityType == 'agent' ? widget.entityId : null,
        projectId: widget.entityType == 'project' ? widget.entityId : null,
        limit: 50,
      );

      if (mounted) {
        setState(() {
          _sessions = result.items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _createNewSession() async {
    setState(() {
      _isCreating = true;
      _error = null;
    });

    try {
      final repository = ref.read(sessionsRepositoryProvider);
      final input = CreateSessionInput(
        title: 'New ${widget.entityType == "agent" ? "Agent" : "Project"} Session',
        agentId: widget.entityType == 'agent' ? widget.entityId : null,
        projectId: widget.entityType == 'project' ? widget.entityId : null,
      );

      final session = await repository.createSession(input);
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSessionSelected(session.id);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isCreating = false;
        });
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
      case 'streaming':
        return AppColors.success;
      case 'sleeping':
      case 'idle':
        return AppColors.warning;
      case 'error':
        return AppColors.destructive;
      default:
        return AppColors.mutedForeground;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.mutedForeground.withValues(alpha: 0.3)
                    : AppColors.textSecondaryLight.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sessions',
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                        ),
                      ),
                      Text(
                        'Switch or create a new session',
                        style: AppTypography.bodySmall.copyWith(
                          color: isDark
                              ? AppColors.mutedForeground
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  key: const Key('entity_sessions_new_session_button'),
                  onPressed: _isCreating ? null : _createNewSession,
                  icon: _isCreating
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add, size: 16),
                  label: const Text('New Session'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.primaryForeground,
                    textStyle: AppTypography.labelSmall.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Divider(),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                _error!,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.destructive,
                ),
              ),
            ),

          // Sessions List / Loading / Empty State
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _sessions.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.forum_outlined,
                                size: 40,
                                color: AppColors.mutedForeground,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No sessions found',
                                style: AppTypography.titleSmall.copyWith(
                                  color: isDark
                                      ? AppColors.darkForeground
                                      : AppColors.lightForeground,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                'Create a new session to start chatting.',
                                style: AppTypography.bodySmall.copyWith(
                                  color: AppColors.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _sessions.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppSpacing.xs),
                        itemBuilder: (context, index) {
                          final session = _sessions[index];
                          final isSelected = session.id == widget.currentSessionId;
                          final statusColor = _getStatusColor(session.status);

                          return InkWell(
                            key: Key('entity_session_item_${session.id}'),
                            onTap: () {
                              Navigator.of(context).pop();
                              widget.onSessionSelected(session.id);
                            },
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusMd),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md,
                                vertical: AppSpacing.sm,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary.withValues(alpha: 0.12)
                                    : (isDark
                                        ? AppColors.darkBackground
                                        : AppColors.lightBackground),
                                borderRadius:
                                    BorderRadius.circular(AppSpacing.radiusMd),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : (isDark
                                          ? AppColors.darkBorder
                                          : AppColors.lightBorder),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: statusColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          session.title.isNotEmpty
                                              ? session.title
                                              : 'Session ${session.id.substring(0, session.id.length > 8 ? 8 : session.id.length)}',
                                          style: AppTypography.bodyMedium.copyWith(
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.normal,
                                            color: isDark
                                                ? AppColors.darkForeground
                                                : AppColors.lightForeground,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (session.status.isNotEmpty)
                                          Text(
                                            session.status,
                                            style: AppTypography.labelSmall.copyWith(
                                              color: AppColors.mutedForeground,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    const Icon(
                                      Icons.check_circle,
                                      color: AppColors.primary,
                                      size: 18,
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
