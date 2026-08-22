import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/sessions/ui/sessions_console_notifier.dart';
import 'package:spaces_mobile/features/sessions/ui/sessions_console_screen.dart';

class FakeWsClient implements WsClient {
  final StreamController<Map<String, dynamic>> _eventsCtrl =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<bool> _statusCtrl =
      StreamController<bool>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _eventsCtrl.stream;

  @override
  Stream<bool> get isConnected => _statusCtrl.stream;

  @override
  bool get connected => true;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  Future<void> disconnect() async {}

  @override
  void send(Map<String, dynamic> message) {}

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}

  @override
  void dispose() {
    _eventsCtrl.close();
    _statusCtrl.close();
  }
}

void main() {
  group('SessionsConsoleNotifier Tests', () {
    late FakeWsClient fakeWs;
    late SessionsConsoleNotifier notifier;

    setUp(() {
      fakeWs = FakeWsClient();
      notifier = SessionsConsoleNotifier(wsClient: fakeWs);
    });

    tearDown(() {
      notifier.dispose();
      fakeWs.dispose();
    });

    test('ring buffer caps events at 500 and drops the oldest', () {
      for (int i = 0; i < 505; i++) {
        notifier.addEvent(
          ConsoleEvent(
            id: 'evt_$i',
            type: 'messages',
            source: 'test',
            content: 'Event $i',
            timestamp: DateTime.now(),
          ),
        );
      }

      expect(notifier.state.events.length, 500);
      expect(notifier.state.events.first.id, 'evt_5');
      expect(notifier.state.events.last.id, 'evt_504');
    });

    test('toggleFreeze toggles isFrozen state', () {
      expect(notifier.state.isFrozen, isFalse);
      notifier.toggleFreeze();
      expect(notifier.state.isFrozen, isTrue);
      notifier.toggleFreeze();
      expect(notifier.state.isFrozen, isFalse);
    });

    test('toggleFilter removes and adds categories from activeFilters', () {
      expect(notifier.state.activeFilters.contains('tools'), isTrue);

      notifier.addEvent(
        ConsoleEvent(
          id: '1',
          type: 'tools',
          source: 'test',
          content: 'Running bash',
          timestamp: DateTime.now(),
        ),
      );

      expect(notifier.state.filteredEvents.length, 1);

      notifier.toggleFilter('tools');
      expect(notifier.state.activeFilters.contains('tools'), isFalse);
      expect(notifier.state.filteredEvents.length, 0);

      notifier.toggleFilter('tools');
      expect(notifier.state.activeFilters.contains('tools'), isTrue);
      expect(notifier.state.filteredEvents.length, 1);
    });

    test('clear removes all events from state', () {
      notifier.addEvent(
        ConsoleEvent(
          id: '1',
          type: 'messages',
          source: 'test',
          content: 'Hello',
          timestamp: DateTime.now(),
        ),
      );

      expect(notifier.state.events.isNotEmpty, isTrue);
      notifier.clear();
      expect(notifier.state.events.isEmpty, isTrue);
    });
  });

  group('SessionsConsoleScreen Widget Tests', () {
    late FakeWsClient fakeWs;

    setUp(() {
      fakeWs = FakeWsClient();
    });

    tearDown(() {
      fakeWs.dispose();
    });

    testWidgets('renders empty state initially and updates on incoming events', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            wsClientProvider.overrideWithValue(fakeWs),
          ],
          child: const MaterialApp(
            home: SessionsConsoleScreen(),
          ),
        ),
      );

      expect(find.byKey(const Key('console_empty_state')), findsOneWidget);

      fakeWs._eventsCtrl.add({
        'type': 'text_delta',
        'delta': 'Streaming live token from assistant',
      });

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Streaming live token from assistant'), findsOneWidget);
    });

    testWidgets('freeze button toggles freeze indicator', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            wsClientProvider.overrideWithValue(fakeWs),
          ],
          child: const MaterialApp(
            home: SessionsConsoleScreen(),
          ),
        ),
      );

      expect(find.text('FROZEN'), findsNothing);

      await tester.tap(find.byKey(const Key('console_freeze_fab')));
      await tester.pump();

      expect(find.text('FROZEN'), findsOneWidget);
    });
  });
}
