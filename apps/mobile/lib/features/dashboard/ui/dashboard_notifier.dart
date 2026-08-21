import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/ws/ws_client.dart';
import '../data/dashboard_repository.dart';
import '../data/models/dashboard_project.dart';
import '../data/models/dashboard_session.dart';
import 'dashboard_state.dart';

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;
  final WsClient? _wsClient;
  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  DashboardNotifier({
    required DashboardRepository repository,
    WsClient? wsClient,
    bool autoLoad = true,
  })  : _repository = repository,
        _wsClient = wsClient,
        super(const DashboardState.initial()) {
    _listenToWsEvents();
    if (autoLoad) {
      load();
    }
  }

  void _listenToWsEvents() {
    final client = _wsClient;
    if (client == null) return;

    _wsSubscription?.cancel();
    _wsSubscription = client.events.listen((event) {
      final type = event['type'] as String?;
      if (type == 'session_status') {
        _handleSessionStatusEvent(event);
      }
    });
  }

  void _handleSessionStatusEvent(Map<String, dynamic> event) {
    final sessionId = (event['sessionId'] ?? event['id']) as String?;
    final newStatus = (event['status'] ?? event['state']) as String?;

    if (sessionId == null || newStatus == null) return;

    final currentSessions = List<DashboardSession>.from(state.sessions);
    final index = currentSessions.indexWhere((s) => s.id == sessionId);

    if (index != -1) {
      final existingSession = currentSessions[index];
      currentSessions[index] = existingSession.copyWith(status: newStatus);
      state = state.copyWith(sessions: currentSessions);
    } else if (newStatus == 'running' ||
        newStatus == 'active' ||
        newStatus == 'streaming') {
      final newSession = DashboardSession.fromJson(event);
      currentSessions.insert(0, newSession);
      state = state.copyWith(sessions: currentSessions);
    }
  }

  Future<void> load() async {
    state = DashboardState.loading(
      previousSessions: state.sessions,
      previousProjects: state.projects,
    );

    try {
      final results = await Future.wait([
        _repository.getActiveSessions(),
        _repository.getRecentProjects(),
      ]);

      final sessions = results[0] as List<DashboardSession>;
      final projects = results[1] as List<DashboardProject>;

      state = DashboardState(
        sessions: sessions,
        projects: projects,
        isLoading: false,
        error: null,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load dashboard data: $e',
      );
    }
  }

  Future<void> refresh() async {
    try {
      final results = await Future.wait([
        _repository.getActiveSessions(),
        _repository.getRecentProjects(),
      ]);

      final sessions = results[0] as List<DashboardSession>;
      final projects = results[1] as List<DashboardProject>;

      state = state.copyWith(
        sessions: sessions,
        projects: projects,
        isLoading: false,
        clearError: true,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to refresh dashboard: $e',
      );
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    _wsSubscription = null;
    super.dispose();
  }
}

final dashboardNotifierProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  final repository = ref.watch(dashboardRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  return DashboardNotifier(
    repository: repository,
    wsClient: wsClient,
  );
});
