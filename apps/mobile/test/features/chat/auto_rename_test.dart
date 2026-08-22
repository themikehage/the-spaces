import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/events/entity_event_bus.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/chat_notifier.dart';

class FakeChatRepository implements ChatRepository {
  final StreamController<Map<String, dynamic>> eventsController =
      StreamController<Map<String, dynamic>>.broadcast();

  String? lastUpdatedSessionId;
  String? lastUpdatedTitle;
  int updateTitleCount = 0;

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
  Future<void> updateSessionTitle(String sessionId, String title) async {
    lastUpdatedSessionId = sessionId;
    lastUpdatedTitle = title;
    updateTitleCount++;
  }

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
  group('Auto Rename Session Tests', () {
    late FakeChatRepository fakeRepository;

    setUp(() {
      fakeRepository = FakeChatRepository();
    });

    tearDown(() {
      fakeRepository.eventsController.close();
    });

    test('first sendMessage calls updateSessionTitle with first 50 chars and emits event', () async {
      final notifier = ChatNotifier(
        sessionId: 'session-rename-1',
        repository: fakeRepository,
      );

      final receivedEvents = <EntityUpdatedEvent>[];
      final subscription = EntityEventBus.listen((e) {
        receivedEvents.add(e);
      });

      const longMessage =
          'This is a very long prompt that exceeds fifty characters in total length for testing purpose';
      await notifier.sendMessage(longMessage);
      await pumpEventQueue();

      expect(fakeRepository.updateTitleCount, 1);
      expect(fakeRepository.lastUpdatedSessionId, 'session-rename-1');
      expect(fakeRepository.lastUpdatedTitle, longMessage.substring(0, 50));

      expect(
        receivedEvents.any((e) => e.rawName == 'session_renamed' || e.type == 'session_renamed'),
        isTrue,
      );

      // Subsequent message should not rename again since messages is not empty
      await notifier.sendMessage('Second message');
      await pumpEventQueue();

      expect(fakeRepository.updateTitleCount, 1);

      await subscription.cancel();
    });
  });
}
