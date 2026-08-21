import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/session.dart';

part 'sessions_state.freezed.dart';

@freezed
class SessionsState with _$SessionsState {
  const SessionsState._();

  const factory SessionsState({
    @Default([]) List<Session> sessions,
    @Default(true) bool isLoading,
    @Default(false) bool isLoadingMore,
    @Default(true) bool hasMore,
    @Default('all') String filter,
    @Default('') String searchQuery,
    @Default(1) int page,
    String? error,
  }) = _SessionsState;

  List<Session> get filteredSessions {
    var list = sessions;

    if (filter != 'all') {
      if (filter == 'active') {
        list = list.where((s) => s.isRunning).toList();
      } else if (filter == 'idle') {
        list = list.where((s) => s.isIdle).toList();
      }
    }

    if (searchQuery.trim().isNotEmpty) {
      final query = searchQuery.trim().toLowerCase();
      list = list.where((s) {
        final titleMatch = s.title.toLowerCase().contains(query);
        final agentMatch = s.agentId?.toLowerCase().contains(query) ?? false;
        final projectMatch = s.projectId?.toLowerCase().contains(query) ?? false;
        return titleMatch || agentMatch || projectMatch;
      }).toList();
    }

    return list;
  }
}
