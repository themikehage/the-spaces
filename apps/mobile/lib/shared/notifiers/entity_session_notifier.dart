import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/sessions/data/models/create_session_input.dart';
import '../../features/sessions/data/models/session.dart';
import '../../features/sessions/data/sessions_repository.dart';
import 'entity_session_state.dart';

class EntitySessionArgs {
  final String entityType;
  final String entityId;
  final String? initialSessionId;

  const EntitySessionArgs({
    required this.entityType,
    required this.entityId,
    this.initialSessionId,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EntitySessionArgs &&
          runtimeType == other.runtimeType &&
          entityType == other.entityType &&
          entityId == other.entityId &&
          initialSessionId == other.initialSessionId;

  @override
  int get hashCode => Object.hash(entityType, entityId, initialSessionId);
}

class EntitySessionNotifier extends StateNotifier<EntitySessionState> {
  final SessionsRepository _repository;
  final EntitySessionArgs _args;

  EntitySessionNotifier({
    required SessionsRepository repository,
    required EntitySessionArgs args,
  })  : _repository = repository,
        _args = args,
        super(EntitySessionState(
          currentSessionId: args.initialSessionId,
          isLoading: args.initialSessionId == null,
        )) {
    if (args.initialSessionId == null || args.initialSessionId!.isEmpty) {
      resolveActiveSession();
    }
  }

  Future<void> resolveActiveSession() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final isAgent = _args.entityType.toLowerCase() == 'agent';
      final isProject = _args.entityType.toLowerCase() == 'project';

      final result = await _repository.getSessions(
        agentId: isAgent ? _args.entityId : null,
        projectId: isProject ? _args.entityId : null,
        limit: 1,
      );

      if (result.items.isNotEmpty) {
        state = state.copyWith(
          currentSessionId: result.items.first.id,
          isLoading: false,
          error: null,
        );
      } else {
        await createSession();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void selectSession(String sessionId) {
    state = state.copyWith(
      currentSessionId: sessionId,
      error: null,
    );
  }

  Future<Session?> createSession({String? title}) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final isAgent = _args.entityType.toLowerCase() == 'agent';
      final isProject = _args.entityType.toLowerCase() == 'project';

      final defaultTitle = title ??
          '${isAgent ? "Agent" : isProject ? "Project" : "Entity"} Session';

      final input = CreateSessionInput(
        title: defaultTitle,
        agentId: isAgent ? _args.entityId : null,
        projectId: isProject ? _args.entityId : null,
      );

      final session = await _repository.createSession(input);
      state = state.copyWith(
        currentSessionId: session.id,
        isLoading: false,
        error: null,
      );
      return session;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }
}

final entitySessionNotifierProvider = StateNotifierProvider.family<
    EntitySessionNotifier, EntitySessionState, EntitySessionArgs>((ref, args) {
  final repository = ref.watch(sessionsRepositoryProvider);
  return EntitySessionNotifier(
    repository: repository,
    args: args,
  );
});
