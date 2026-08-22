import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/attention/data/models/attention_item.dart';
import 'package:spaces_mobile/features/attention/notifications/local_notification_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late LocalNotificationService service;
  final List<Map<String, String?>> notifications = [];
  String? lastNavigatedRoute;

  setUp(() {
    notifications.clear();
    lastNavigatedRoute = null;

    service = LocalNotificationService(
      onShowNotification: (title, body, payload) {
        notifications.add({
          'title': title,
          'body': body,
          'payload': payload,
        });
      },
      onNotificationTap: (route) {
        lastNavigatedRoute = route;
      },
    );
  });

  tearDown(() {
    service.dispose();
  });

  group('LocalNotificationService Tests', () {
    test('does NOT trigger notification when app is in foreground (resumed)', () async {
      service.setLifecycleStateForTesting(AppLifecycleState.resumed);

      const item = AttentionItem(
        approvalId: 'appr-1',
        sessionId: 'sess-1',
        toolName: 'bash',
        args: {'command': 'npm test'},
        kind: 'approval',
      );

      await service.showAttentionNotification(item);

      expect(notifications.isEmpty, isTrue);
    });

    test('triggers notification when app is paused (background)', () async {
      service.setLifecycleStateForTesting(AppLifecycleState.paused);

      const item = AttentionItem(
        approvalId: 'appr-2',
        sessionId: 'sess-2',
        toolName: 'bash',
        args: {'command': 'rm -rf dist'},
        reason: 'Clean build directory',
        kind: 'approval',
      );

      await service.showAttentionNotification(item);

      expect(notifications.length, equals(1));
      expect(notifications.first['title'], equals('Spaces — Approval Required'));
      expect(notifications.first['body'], equals('Clean build directory'));
      expect(notifications.first['payload'], equals('sess-2'));
    });

    test('triggers question notification when app is hidden or detached', () async {
      service.setLifecycleStateForTesting(AppLifecycleState.hidden);

      const item = AttentionItem(
        approvalId: 'q-1',
        sessionId: 'sess-3',
        toolName: 'ask_question',
        args: {'question': 'Should we continue with the migration?'},
        kind: 'question',
      );

      await service.showAttentionNotification(item);

      expect(notifications.length, equals(1));
      expect(notifications.first['title'], equals('Spaces — Question from Agent'));
      expect(notifications.first['body'], equals('Should we continue with the migration?'));
    });

    test('handleNotificationTap triggers route navigation to /attention', () {
      service.handleNotificationTap('sess-3');

      expect(lastNavigatedRoute, equals('/attention'));
    });

    test('lifecycle state change updates isBackground properly', () {
      service.didChangeAppLifecycleState(AppLifecycleState.resumed);
      expect(service.isBackground, isFalse);

      service.didChangeAppLifecycleState(AppLifecycleState.paused);
      expect(service.isBackground, isTrue);

      service.didChangeAppLifecycleState(AppLifecycleState.inactive);
      expect(service.isBackground, isFalse);

      service.didChangeAppLifecycleState(AppLifecycleState.detached);
      expect(service.isBackground, isTrue);
    });
  });
}
