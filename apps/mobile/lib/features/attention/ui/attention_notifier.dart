import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';
import '../data/attention_repository.dart';
import '../data/models/attention_item.dart';
import '../notifications/local_notification_service.dart';
import 'attention_state.dart';

class AttentionNotifier extends StateNotifier<AttentionState> {
  final AttentionRepository _repository;
  final WsClient _wsClient;
  final LocalNotificationService? _localNotificationService;
  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  AttentionNotifier({
    required AttentionRepository repository,
    required WsClient wsClient,
    LocalNotificationService? localNotificationService,
  })  : _repository = repository,
        _wsClient = wsClient,
        _localNotificationService = localNotificationService,
        super(const AttentionState(isLoading: true)) {
    _init();
  }

  void _init() {
    _listenToWsEvents();
    load();
  }

  void _listenToWsEvents() {
    _wsSubscription?.cancel();
    _wsSubscription = _wsClient.events.listen((event) {
      final type = event['type']?.toString();
      if (type == null) return;

      if (type == 'approval_request' ||
          type == 'attention_item_created' ||
          type == 'ask_question' ||
          type == 'approval_required') {
        final dynamic rawItem = event['approval'] ?? event['item'] ?? event;
        if (rawItem is Map<String, dynamic>) {
          final item = AttentionItem.fromJson(rawItem);
          _addItem(item);
        }
      } else if (type == 'approval_resolved' ||
          type == 'attention_item_resolved' ||
          type == 'question_answered') {
        final approvalId = event['approvalId']?.toString() ??
            event['itemId']?.toString() ??
            event['id']?.toString();
        if (approvalId != null && approvalId.isNotEmpty) {
          _removeItem(approvalId);
        }
      }
    });
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final pending = await _repository.getPending();
      state = state.copyWith(
        items: pending,
        pendingCount: pending.length,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void _addItem(AttentionItem item) {
    if (state.items.any((i) => i.approvalId == item.approvalId)) {
      return;
    }

    final updated = [item, ...state.items];
    state = state.copyWith(
      items: updated,
      pendingCount: updated.length,
    );

    _localNotificationService?.showAttentionNotification(item);
  }

  void _removeItem(String approvalId) {
    if (!state.items.any((i) => i.approvalId == approvalId)) {
      return;
    }

    final updated = state.items.where((i) => i.approvalId != approvalId).toList();
    state = state.copyWith(
      items: updated,
      pendingCount: updated.length,
    );
  }

  Future<bool> respondToQuestion(
    String id, {
    List<String>? selectedOptions,
    String? customAnswer,
  }) async {
    final previousItems = state.items;
    _removeItem(id);

    try {
      final success = await _repository.respondToQuestion(
        id,
        selectedOptions: selectedOptions,
        customAnswer: customAnswer,
      );
      if (!success) {
        state = state.copyWith(
          items: previousItems,
          pendingCount: previousItems.length,
        );
        return false;
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        items: previousItems,
        pendingCount: previousItems.length,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> respondToApproval(
    String id, {
    required bool approved,
    Map<String, dynamic>? payload,
  }) async {
    final previousItems = state.items;
    _removeItem(id);

    try {
      final success = await _repository.respondToApproval(
        id,
        approved: approved,
        payload: payload,
      );
      if (!success) {
        state = state.copyWith(
          items: previousItems,
          pendingCount: previousItems.length,
        );
        return false;
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        items: previousItems,
        pendingCount: previousItems.length,
        error: e.toString(),
      );
      return false;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

final attentionNotifierProvider =
    StateNotifierProvider<AttentionNotifier, AttentionState>((ref) {
  final repository = ref.watch(attentionRepositoryProvider);
  final wsClient = ref.watch(wsClientProvider);
  final notificationService = ref.watch(localNotificationServiceProvider);

  return AttentionNotifier(
    repository: repository,
    wsClient: wsClient,
    localNotificationService: notificationService,
  );
});
