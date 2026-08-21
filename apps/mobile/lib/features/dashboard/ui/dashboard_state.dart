import '../data/models/dashboard_project.dart';
import '../data/models/dashboard_session.dart';

class DashboardState {
  final List<DashboardSession> sessions;
  final List<DashboardProject> projects;
  final bool isLoading;
  final String? error;

  const DashboardState({
    this.sessions = const [],
    this.projects = const [],
    this.isLoading = false,
    this.error,
  });

  const DashboardState.initial()
      : sessions = const [],
        projects = const [],
        isLoading = false,
        error = null;

  const DashboardState.loading({
    List<DashboardSession> previousSessions = const [],
    List<DashboardProject> previousProjects = const [],
  })  : sessions = previousSessions,
        projects = previousProjects,
        isLoading = true,
        error = null;

  bool get hasActiveSessions => sessions.isNotEmpty;
  bool get hasProjects => projects.isNotEmpty;
  bool get isEmpty => !isLoading && sessions.isEmpty && projects.isEmpty;
  bool get isError => error != null;

  DashboardState copyWith({
    List<DashboardSession>? sessions,
    List<DashboardProject>? projects,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return DashboardState(
      sessions: sessions ?? this.sessions,
      projects: projects ?? this.projects,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! DashboardState) return false;
    if (other.isLoading != isLoading || other.error != error) return false;
    if (other.sessions.length != sessions.length ||
        other.projects.length != projects.length) {
      return false;
    }
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i] != other.sessions[i]) return false;
    }
    for (var i = 0; i < projects.length; i++) {
      if (projects[i] != other.projects[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        Object.hashAll(sessions),
        Object.hashAll(projects),
        isLoading,
        error,
      );
}
