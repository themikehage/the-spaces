import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/attention/data/attention_repository.dart';
import 'package:spaces_mobile/features/attention/data/models/attention_item.dart';
import 'package:spaces_mobile/features/attention/notifications/local_notification_service.dart';
import 'package:spaces_mobile/features/attention/ui/attention_notifier.dart';

class FakeAttentionRepository implements AttentionRepository {
  List<AttentionItem> pendingItems = [];
  bool shouldThrow = false;
  bool respondSuccess = true;

  String? lastResolvedId;
  String? lastAction;
  Map<String, dynamic>? lastPayload;

  @override
  Future<List<AttentionItem>> getPending() async {
    if (shouldThrow) throw Exception('Fetch failed');
    return List.from(pendingItems);
  }

  @override
  Future<bool> respondToQuestion(
    String id, {
    List<String>? selectedOptions,
    String? customAnswer,
  }) async {
    if (shouldThrow) throw Exception('Respond failed');
    lastResolvedId = id;
    lastAction = 'submit';
    lastPayload = {
      if (selectedOptions != null) 'selectedOptions': selectedOptions,
      if (customAnswer != null) 'customAnswer': customAnswer,
    };
    return respondSuccess;
  }

  @override
  Future<bool> respondToApproval(
    String id, {
    required bool approved,
    Map<String, dynamic>? payload,
  }) async {
    if (shouldThrow) throw Exception('Approval failed');
    lastResolvedId = id;
    lastAction = approved ? 'approve' : 'deny';
    lastPayload = payload;
    return respondSuccess;
  }

  @override
  Future<bool> resolveAttention(
    String id, {
    required String action,
    Map<String, dynamic>? payload,
  }) async {
    lastResolvedId = id;
    lastAction = action;
    lastPayload = payload;
    return respondSuccess;
  }
}

class FakeWsClient extends WsClient {
  final StreamController<Map<String, dynamic>> _controller =
      StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  void emit(Map<String, dynamic> event) {
    _controller.add(event);
  }

  @override
  void dispose() {
    _controller.close();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeAttentionRepository fakeRepo;
  late FakeWsClient fakeWs;
  late LocalNotificationService notificationService;
  late AttentionNotifier notifier;
  final List<String> notificationsShown = [];

  setUp(() {
    fakeRepo = FakeAttentionRepository();
    fakeWs = FakeWsClient();
    notificationsShown.clear();

    notificationService = LocalNotificationService(
      onShowNotification: (title, body, payload) {
        notificationsShown.add('$title: $body');
      },
    );

    notifier = AttentionNotifier(
      repository: fakeRepo,
      wsClient: fakeWs,
      localNotificationService: notificationService,
    );
  });

  tearDown(() {
    notifier.dispose();
    fakeWs.dispose();
    notificationService.dispose();
  });

  group('AttentionNotifier Tests', () {
    test('load() populates items and pendingCount from repository', () async {
      fakeRepo.pendingItems = [
        const AttentionItem(
          approvalId: 'appr-1',
          sessionId: 'sess-1',
          toolName: 'bash',
          kind: 'approval',
        ),
      ];

      await notifier.load();

      expect(notifier.state.items.length, equals(1));
      expect(notifier.state.pendingCount, equals(1));
      expect(notifier.state.hasPending, isTrue);
      expect(notifier.state.isLoading, isFalse);
    });

    test('WS ask_question event adds item and increments pendingCount', () async {
      await notifier.load();
      expect(notifier.state.pendingCount, equals(0));

      fakeWs.emit({
        'type': 'ask_question',
        'item': {
          'approvalId': 'q-1',
          'sessionId': 'sess-1',
          'toolName': 'ask_question',
          'kind': 'question',
          'args': {'question': 'Deploy to production?'},
        },
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.items.length, equals(1));
      expect(notifier.state.pendingCount, equals(1));
      expect(notifier.state.items.first.approvalId, equals('q-1'));
      expect(notifier.state.items.first.questionText, equals('Deploy to production?'));
    });

    test('WS approval_resolved removes item and decrements pendingCount', () async {
      fakeRepo.pendingItems = [
        const AttentionItem(
          approvalId: 'appr-1',
          sessionId: 'sess-1',
          toolName: 'bash',
        ),
      ];
      await notifier.load();
      expect(notifier.state.pendingCount, equals(1));

      fakeWs.emit({
        'type': 'approval_resolved',
        'approvalId': 'appr-1',
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.items.isEmpty, isTrue);
      expect(notifier.state.pendingCount, equals(0));
    });

    test('respondToQuestion removes item optimistically and calls repository', () async {
      fakeRepo.pendingItems = [
        const AttentionItem(
          approvalId: 'q-1',
          sessionId: 'sess-1',
          toolName: 'ask_question',
          kind: 'question',
        ),
      ];
      await notifier.load();
      expect(notifier.state.pendingCount, equals(1));

      final success = await notifier.respondToQuestion(
        'q-1',
        selectedOptions: ['Option A'],
      );

      expect(success, isTrue);
      expect(notifier.state.pendingCount, equals(0));
      expect(fakeRepo.lastResolvedId, equals('q-1'));
      expect(fakeRepo.lastAction, equals('submit'));
    });

    test('respondToApproval removes item optimistically and calls repository', () async {
      fakeRepo.pendingItems = [
        const AttentionItem(
          approvalId: 'appr-1',
          sessionId: 'sess-1',
          toolName: 'bash',
        ),
      ];
      await notifier.load();

      final success = await notifier.respondToApproval(
        'appr-1',
        approved: true,
      );

      expect(success, isTrue);
      expect(notifier.state.pendingCount, equals(0));
      expect(fakeRepo.lastResolvedId, equals('appr-1'));
      expect(fakeRepo.lastAction, equals('approve'));
    });

    test('network failure rolls back optimistic removal', () async {
      fakeRepo.pendingItems = [
        const AttentionItem(
          approvalId: 'appr-1',
          sessionId: 'sess-1',
          toolName: 'bash',
        ),
      ];
      await notifier.load();
      fakeRepo.respondSuccess = false;

      final success = await notifier.respondToApproval(
        'appr-1',
        approved: true,
      );

      expect(success, isFalse);
      expect(notifier.state.pendingCount, equals(1));
      expect(notifier.state.items.first.approvalId, equals('appr-1'));
    });

    test('triggers notification when app is in background', () async {
      notificationService.setLifecycleStateForTesting(AppLifecycleState.paused);

      fakeWs.emit({
        'type': 'approval_request',
        'approval': {
          'approvalId': 'appr-bg',
          'sessionId': 'sess-bg',
          'toolName': 'bash',
          'args': {'command': 'git push origin main'},
        },
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notificationsShown.length, equals(1));
      expect(notificationsShown.first, contains('Spaces — Approval Required'));
    });

    test('does not trigger notification when app is in foreground', () async {
      notificationService.setLifecycleStateForTesting(AppLifecycleState.resumed);

      fakeWs.emit({
        'type': 'approval_request',
        'approval': {
          'approvalId': 'appr-fg',
          'sessionId': 'sess-fg',
          'toolName': 'bash',
        },
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notificationsShown.isEmpty, isTrue);
    });
  });
}
