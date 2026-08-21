import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/app_storage.dart';
import '../../../core/ws/ws_client.dart';
import '../data/models/create_session_input.dart';
import '../data/models/session.dart';
import '../data/sessions_repository.dart';
import 'sessions_state.dart';

class SessionsNotifier extends StateNotifier<SessionsState> {
  final SessionsRepository _repository;
  final AppStorage _storage;
  final WsClient? _wsClient;

  StreamSubscription? _wsSubscription;
  static const int _pageSize = 20;

  SessionsNotifier({
    required SessionsRepository repository,
    required AppStorage storage,
    WsClient? wsClient,
  })  : _repository = repository,
        _storage = storage,
        _wsClient = wsClient,
        super(const SessionsState()) {
    _init();
  }

  void _init() {
    final savedFilter = _storage.prefRead(StorageKey.sessionFilter);
    if (savedFilter != null && savedFilter.isNotEmpty) {
      state = state.copyWith(filter: savedFilter);
    }
    _listenToWsEvents();
    load();
  }

  void _listenToWsEvents() {
    final client = _wsClient;
    if (client == null) return;
    _wsSubscription?.cancel();
    _wsSubscription = client.events.listen((event) {
      final type = event['type']?.toString();
      if (type == null) return;

      if (type == 'session_created') {
        final sessionData = event['session'] ?? event['data'];
        if (sessionData is Map<String, dynamic>) {
          final newSession = Session.fromJson(sessionData);
          final exists = state.sessions.any((s) => s.id == newSession.id);
          if (!exists) {
            state = state.copyWith(
              sessions: [newSession, ...state.sessions],
            );
          }
        } else {
          load();
        }
      } else if (type == 'session_deleted') {
        final sessionId = (event['sessionId'] ?? event['id'])?.toString();
        if (sessionId != null) {
          state = state.copyWith(
            sessions: state.sessions.where((s) => s.id != sessionId).toList(),
          );
        }
      } else if (type == 'session_status') {
        final sessionId = event['sessionId']?.toString();
        final status = event['status']?.toString();
        if (sessionId != null && status != null) {
          state = state.copyWith(
            sessions: state.sessions.map((s) {
              if (s.id == sessionId) {
                return s.copyWith(status: status);
              }
              return s;
            }).toList(),
          );
        }
      } else if (type == 'entity-updated') {
        final entityType = event['entityType']?.toString();
        if (entityType == 'session' || entityType == 'all' || entityType == null) {
          load();
        }
      }
    });
  }

  Future<void> load() async {
    try {
      state = state.copyWith(
        isLoading: true,
        error: null,
        page: 1,
      );

      final result = await _repository.getSessions(
        page: 1,
        limit: _pageSize,
        status: state.filter,
      );

      state = state.copyWith(
        sessions: result.items,
        isLoading: false,
        hasMore: result.hasMore,
        page: 1,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore || state.isLoading) {
      return;
    }

    try {
      state = state.copyWith(isLoadingMore: true);
      final nextPage = state.page + 1;

      final result = await _repository.getSessions(
        page: nextPage,
        limit: _pageSize,
        status: state.filter,
      );

      final existingIds = state.sessions.map((s) => s.id).toSet();
      final newItems = result.items.where((s) => !existingIds.contains(s.id)).toList();

      state = state.copyWith(
        sessions: [...state.sessions, ...newItems],
        isLoadingMore: false,
        hasMore: result.hasMore,
        page: nextPage,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingMore: false,
        error: e.toString(),
      );
    }
  }

  Future<void> setFilter(String status) async {
    if (state.filter == status) return;
    state = state.copyWith(filter: status);
    await _storage.prefWrite(StorageKey.sessionFilter, status);
    await load();
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<Session> createSession(CreateSessionInput input) async {
    try {
      final created = await _repository.createSession(input);
      final exists = state.sessions.any((s) => s.id == created.id);
      if (!exists) {
        state = state.copyWith(
          sessions: [created, ...state.sessions],
        );
      }
      await load();
      return created;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteSession(String id) async {
    try {
      state = state.copyWith(
        sessions: state.sessions.where((s) => s.id != id).toList(),
      );
      await _repository.deleteSession(id);
      await load();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      await load();
      rethrow;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final sessionsNotifierProvider =
    StateNotifierProvider<SessionsNotifier, SessionsState>((ref) {
  final repository = ref.watch(sessionsRepositoryProvider);
  final storage = ref.watch(appStorageProvider);
  final wsClient = ref.watch(wsClientProvider);

  return SessionsNotifier(
    repository: repository,
    storage: storage,
    wsClient: wsClient,
  );
});
