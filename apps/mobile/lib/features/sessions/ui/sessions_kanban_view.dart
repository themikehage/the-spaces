import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../data/models/session.dart';
import 'sessions_notifier.dart';
import 'widgets/kanban_column.dart';
import 'widgets/sessions_skeleton.dart';

class SessionsKanbanView extends ConsumerWidget {
  const SessionsKanbanView({super.key});

  bool _isWorking(Session session) {
    return session.isRunning || session.isWaitingApproval;
  }

  bool _isDone(Session session) {
    final status = session.status.toLowerCase();
    return status == 'done' ||
        status == 'completed' ||
        status == 'finished' ||
        status == 'aborted' ||
        session.isError;
  }

  bool _isIdle(Session session) {
    return !_isWorking(session) && !_isDone(session);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionsNotifierProvider);

    if (state.isLoading) {
      return const SessionsSkeleton();
    }

    final activeSessions = state.sessions.where((s) => !s.archived).toList();

    final idleSessions = activeSessions.where(_isIdle).toList();
    final workingSessions = activeSessions.where(_isWorking).toList();
    final doneSessions = activeSessions.where(_isDone).toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(sessionsNotifierProvider.notifier).load(),
      color: AppColors.primary,
      backgroundColor: AppColors.darkCard,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: KanbanColumn(
                key: const Key('kanban_column_idle'),
                title: 'Idle',
                sessions: idleSessions,
                color: AppColors.mutedForeground,
              ),
            ),
            const SizedBox(width: AppSpacing.xs + 2),
            Expanded(
              child: KanbanColumn(
                key: const Key('kanban_column_working'),
                title: 'Working',
                sessions: workingSessions,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.xs + 2),
            Expanded(
              child: KanbanColumn(
                key: const Key('kanban_column_done'),
                title: 'Done',
                sessions: doneSessions,
                color: AppColors.success,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
