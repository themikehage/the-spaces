import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/chat_notifier.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/compact_button.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/context_ring.dart';

class FakeChatRepository implements ChatRepository {
  final StreamController<Map<String, dynamic>> eventsController =
      StreamController<Map<String, dynamic>>.broadcast();
  int compactCallCount = 0;
  int getMessagesCallCount = 0;
  String? lastCompactedSessionId;

  @override
  Future<void> connectToSession(String sessionId) async {}

  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async {
    getMessagesCallCount++;
    return [];
  }

  @override
  Future<List<AiModel>> getModels() async => [];

  @override
  Stream<Map<String, dynamic>> sessionEvents(String sessionId) =>
      eventsController.stream;

  @override
  Stream<Map<String, dynamic>> get events => eventsController.stream;

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}

  @override
  Future<void> compactSession(String sessionId) async {
    compactCallCount++;
    lastCompactedSessionId = sessionId;
  }

  @override
  Future<void> updateSessionTitle(String sessionId, String title) async {}

  @override
  Future<void> abortSession(String sessionId) async {}

  @override
  Future<void> postPrompt({required String sessionId, required String message}) async {}

  @override
  void sendPrompt({
    required String sessionId,
    required String message,
    List<Map<String, dynamic>>? images,
    bool? followUp,
  }) {}

  @override
  void sendApprovalResponse({
    required String sessionId,
    required String toolCallId,
    required bool approved,
  }) {}

  @override
  void sendQuestionResponse({
    required String sessionId,
    required String questionId,
    required List<String> selectedOptions,
    String? customAnswer,
  }) {}

  @override
  Future<void> setModel(
    String sessionId, {
    required String provider,
    required String modelId,
    String? thinkingLevel,
  }) async {}
}

void main() {
  group('ContextRing Widget Tests', () {
    testWidgets('renders green color when context usage < 60%', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ContextRing(used: 500, limit: 1000),
          ),
        ),
      );

      final ring = tester.widget<ContextRing>(find.byType(ContextRing));
      expect(ring.ratio, 0.5);
      expect(ring.ringColor, AppColors.success);
      expect(find.text('50%'), findsOneWidget);
    });

    testWidgets('renders warning color when context usage is between 60% and 85%', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ContextRing(used: 750, limit: 1000),
          ),
        ),
      );

      final ring = tester.widget<ContextRing>(find.byType(ContextRing));
      expect(ring.ratio, 0.75);
      expect(ring.ringColor, AppColors.warning);
      expect(find.text('75%'), findsOneWidget);
    });

    testWidgets('renders destructive color when context usage > 85%', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ContextRing(used: 900, limit: 1000),
          ),
        ),
      );

      final ring = tester.widget<ContextRing>(find.byType(ContextRing));
      expect(ring.ratio, 0.9);
      expect(ring.ringColor, AppColors.destructive);
      expect(find.text('90%'), findsOneWidget);
    });

    testWidgets('tapping ContextRing displays SnackBar with token usage', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ContextRing(used: 850, limit: 1000),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('context_ring_button')));
      await tester.pump();

      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.textContaining('850 / 1000 tokens'), findsOneWidget);
    });
  });

  group('CompactButton Widget Tests', () {
    testWidgets('renders Compact label and triggers callback on tap', (tester) async {
      var compacted = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CompactButton(
              onCompact: () {
                compacted = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Compact'), findsOneWidget);
      await tester.tap(find.byKey(const Key('compact_context_button')));
      await tester.pump();

      expect(compacted, isTrue);
    });
  });

  group('ChatNotifier Context & Compaction Tests', () {
    late FakeChatRepository fakeRepository;

    setUp(() {
      fakeRepository = FakeChatRepository();
    });

    tearDown(() {
      fakeRepository.eventsController.close();
    });

    test('updates contextUsed and contextLimit on context_usage WS event', () async {
      final notifier = ChatNotifier(
        sessionId: 'test-session-123',
        repository: fakeRepository,
      );

      expect(notifier.state.contextUsed, 0);
      expect(notifier.state.contextLimit, 0);

      fakeRepository.eventsController.add({
        'type': 'context_usage',
        'used': 6500,
        'limit': 10000,
      });

      await pumpEventQueue();

      expect(notifier.state.contextUsed, 6500);
      expect(notifier.state.contextLimit, 10000);
      expect(notifier.state.usedRatio, 0.65);
    });

    test('compact() calls compactSession on repository and refreshes history', () async {
      final notifier = ChatNotifier(
        sessionId: 'test-session-123',
        repository: fakeRepository,
      );

      await notifier.compact();

      expect(fakeRepository.compactCallCount, 1);
      expect(fakeRepository.lastCompactedSessionId, 'test-session-123');
      expect(fakeRepository.getMessagesCallCount, 2); // initial load + after compact
    });
  });
}
