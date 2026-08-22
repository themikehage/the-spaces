import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/chat_notifier.dart';
import 'package:spaces_mobile/features/chat/ui/chat_state.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/chat_input_bar.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/input_mode_toggle.dart';

class FakeChatRepository implements ChatRepository {
  final StreamController<Map<String, dynamic>> eventsController =
      StreamController<Map<String, dynamic>>.broadcast();

  String? lastPromptSessionId;
  String? lastPromptMessage;
  bool? lastPromptFollowUp;

  @override
  ApiClient? get apiClient => null;

  @override
  Future<void> connectToSession(String sessionId) async {}

  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async => [];

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
  Future<void> compactSession(String sessionId) async {}

  @override
  Future<void> navigateBranch(String sessionId, String targetId) async {}

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
    List<String>? tools,
  }) {
    lastPromptSessionId = sessionId;
    lastPromptMessage = message;
    lastPromptFollowUp = followUp;
  }

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
  group('InputModeToggle Widget Tests', () {
    testWidgets('renders Steer and Follow-up options and handles taps', (tester) async {
      InputMode currentMode = InputMode.steer;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return InputModeToggle(
                  currentMode: currentMode,
                  onModeChanged: (mode) {
                    setState(() {
                      currentMode = mode;
                    });
                  },
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('Steer'), findsOneWidget);
      expect(find.text('Follow-up'), findsOneWidget);

      await tester.tap(find.byKey(const Key('input_mode_followup')));
      await tester.pumpAndSettle();

      expect(currentMode, InputMode.followup);
    });
  });

  group('ChatNotifier Streaming Steering & History Tests', () {
    late FakeChatRepository fakeRepository;

    setUp(() {
      fakeRepository = FakeChatRepository();
    });

    tearDown(() {
      fakeRepository.eventsController.close();
    });

    test('sendMessage while streaming automatically tags message with steerMode steering', () async {
      final notifier = ChatNotifier(
        sessionId: 'test-session-123',
        repository: fakeRepository,
      );

      // Simulate active streaming event
      fakeRepository.eventsController.add({
        'type': 'token',
        'content': 'Generating output...',
      });
      await pumpEventQueue();
      expect(notifier.state.isStreaming, true);

      await notifier.sendMessage('Focus on unit tests');

      expect(fakeRepository.lastPromptSessionId, 'test-session-123');
      expect(fakeRepository.lastPromptMessage, 'Focus on unit tests');
      expect(notifier.state.messages.last.steerMode, 'steering');
    });

    test('sentHistory stores up to 20 messages and navigateHistory steps through them', () async {
      final notifier = ChatNotifier(
        sessionId: 'test-session-123',
        repository: fakeRepository,
      );

      notifier.appendToSentHistory('Message 1');
      notifier.appendToSentHistory('Message 2');
      notifier.appendToSentHistory('Message 3');

      expect(notifier.state.sentHistory, ['Message 3', 'Message 2', 'Message 1']);

      final firstUp = notifier.navigateHistory(1);
      expect(firstUp, 'Message 3');

      final secondUp = notifier.navigateHistory(1);
      expect(secondUp, 'Message 2');

      final down = notifier.navigateHistory(-1);
      expect(down, 'Message 3');

      final backToEmpty = notifier.navigateHistory(-1);
      expect(backToEmpty, '');
    });
  });

  group('ChatInputBar History Navigation Widget Tests', () {
    testWidgets('navigates history on up/down button tap', (tester) async {
      final sentHistory = ['Hello world', 'Second prompt'];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ChatInputBar(
              isStreaming: false,
              sentHistory: sentHistory,
              onNavigateHistory: (delta) {
                if (delta > 0) return sentHistory.first;
                return '';
              },
              onSend: (_) {},
              onStop: () {},
              onPickAttachment: () {},
              onRemoveAttachment: (_) {},
              onOpenModelSelector: () {},
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('history_up_button')), findsOneWidget);
      await tester.tap(find.byKey(const Key('history_up_button')));
      await tester.pump();

      expect(find.text('Hello world'), findsOneWidget);
    });
  });
}
