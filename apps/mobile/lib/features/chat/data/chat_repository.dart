import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/ws/ws_client.dart';
import 'models/ai_model.dart';
import 'models/chat_message.dart';

class ChatRepository {
  final ApiClient _apiClient;
  final WsClient _wsClient;

  ChatRepository({
    required ApiClient apiClient,
    required WsClient wsClient,
  })  : _apiClient = apiClient,
        _wsClient = wsClient;

  Future<List<ChatMessage>> getMessages(String sessionId) async {
    final response = await _apiClient.get<dynamic>('/api/sessions/$sessionId/messages');

    if (response is Map<String, dynamic>) {
      final messagesList = response['messages'];
      if (messagesList is List) {
        return messagesList
            .whereType<Map<String, dynamic>>()
            .map((json) => ChatMessage.fromJson(json))
            .toList();
      }
    } else if (response is List) {
      return response
          .whereType<Map<String, dynamic>>()
          .map((json) => ChatMessage.fromJson(json))
          .toList();
    }

    return const [];
  }

  Future<List<AiModel>> getModels() async {
    try {
      final response = await _apiClient.get<dynamic>('/api/models');
      if (response is Map<String, dynamic>) {
        final modelsList = response['models'];
        if (modelsList is List) {
          return modelsList
              .whereType<Map<String, dynamic>>()
              .map((json) => AiModel.fromJson(json))
              .toList();
        }
      }
    } catch (_) {}
    return const [];
  }

  Future<void> setModel(
    String sessionId, {
    required String provider,
    required String modelId,
    String? thinkingLevel,
  }) async {
    await _apiClient.post<dynamic>(
      '/api/sessions/$sessionId/model',
      data: {
        'provider': provider,
        'modelId': modelId,
        'thinkingLevel': thinkingLevel ?? 'off',
      },
    );
  }

  Future<void> abortSession(String sessionId) async {
    try {
      await _apiClient.post<dynamic>('/api/sessions/$sessionId/abort');
    } catch (_) {}
    _wsClient.send({
      'type': 'abort',
      'sessionId': sessionId,
    });
  }

  Future<void> compactSession(String sessionId) async {
    await _apiClient.post<dynamic>('/api/sessions/$sessionId/compact');
  }

  Future<void> updateSessionTitle(String sessionId, String title) async {
    await _apiClient.patch<dynamic>(
      '/api/sessions/$sessionId',
      data: {'name': title},
    );
  }

  Future<void> connectToSession(String sessionId) async {
    await _wsClient.connect(sessionId: sessionId);
    _wsClient.subscribeToSession(sessionId);
  }

  void subscribeToSession(String sessionId) {
    _wsClient.subscribeToSession(sessionId);
  }

  void unsubscribeFromSession(String sessionId) {
    _wsClient.unsubscribeFromSession(sessionId);
  }

  void sendPrompt({
    required String sessionId,
    required String message,
    List<Map<String, dynamic>>? images,
    bool? followUp,
  }) {
    _wsClient.send({
      'type': 'prompt',
      'sessionId': sessionId,
      'message': message,
      if (images != null && images.isNotEmpty) 'images': images,
      if (followUp == true) 'followUp': true,
    });
  }

  Future<void> postPrompt({
    required String sessionId,
    required String message,
  }) async {
    await _apiClient.post<dynamic>(
      '/api/sessions/$sessionId/prompt',
      data: {'message': message},
    );
  }

  void sendApprovalResponse({
    required String sessionId,
    required String toolCallId,
    required bool approved,
  }) {
    _wsClient.send({
      'type': 'tool_approval',
      'sessionId': sessionId,
      'toolCallId': toolCallId,
      'approved': approved,
    });
    _wsClient.send({
      'type': 'ui_action',
      'sessionId': sessionId,
      'componentId': toolCallId,
      'action': approved ? 'confirm' : 'cancel',
    });
  }

  void sendQuestionResponse({
    required String sessionId,
    required String questionId,
    required List<String> selectedOptions,
    String? customAnswer,
  }) {
    _wsClient.send({
      'type': 'ask_question_response',
      'sessionId': sessionId,
      'questionId': questionId,
      'selectedOptions': selectedOptions,
      if (customAnswer != null) 'customAnswer': customAnswer,
    });
    _wsClient.send({
      'type': 'ui_action',
      'sessionId': sessionId,
      'componentId': questionId,
      'action': 'submit',
      'payload': {
        'selectedOptions': selectedOptions,
        if (customAnswer != null) 'customAnswer': customAnswer,
      },
    });
  }

  Stream<Map<String, dynamic>> get events => _wsClient.events;

  Stream<Map<String, dynamic>> sessionEvents(String sessionId) {
    return _wsClient.events.where((event) {
      final eventSessionId = event['sessionId'] as String?;
      return eventSessionId == null || eventSessionId == sessionId;
    });
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final wsClient = ref.watch(wsClientProvider);
  return ChatRepository(apiClient: apiClient, wsClient: wsClient);
});
