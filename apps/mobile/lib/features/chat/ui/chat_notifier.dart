import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../data/chat_repository.dart';
import '../data/models/ai_model.dart';
import '../data/models/chat_message.dart';
import 'chat_state.dart';

class ChatNotifier extends StateNotifier<ChatState> {
  final String _sessionId;
  final ChatRepository _repository;
  final ImagePicker _imagePicker;

  StreamSubscription? _eventsSubscription;

  ChatNotifier({
    required String sessionId,
    required ChatRepository repository,
    ImagePicker? imagePicker,
  })  : _sessionId = sessionId,
        _repository = repository,
        _imagePicker = imagePicker ?? ImagePicker(),
        super(const ChatState()) {
    _init();
  }

  void _init() {
    loadHistory();
    _listenToEvents();
  }

  Future<void> loadHistory() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final messages = await _repository.getMessages(_sessionId);
      final models = await _repository.getModels();
      AiModel? initialModel;
      if (models.isNotEmpty) {
        initialModel = models.first;
      }
      state = state.copyWith(
        messages: messages,
        availableModels: models,
        currentModel: state.currentModel ?? initialModel,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void _listenToEvents() {
    _eventsSubscription?.cancel();
    _eventsSubscription = _repository.sessionEvents(_sessionId).listen(
      (event) {
        _handleWsEvent(event);
      },
      onError: (error) {
        state = state.copyWith(error: error.toString());
      },
    );
  }

  void _handleWsEvent(Map<String, dynamic> event) {
    final type = event['type'] as String?;

    if (type == 'agent_start') {
      state = state.copyWith(
        isStreaming: true,
        streamingContent: '',
        activeToolCalls: [],
        error: null,
      );
    } else if (type == 'message_start' || type == 'message_update') {
      final rawMessage = event['message'];
      if (rawMessage is Map<String, dynamic>) {
        final parsedMessage = ChatMessage.fromJson(rawMessage);
        if (parsedMessage.isAssistant) {
          final content = parsedMessage.content;
          final toolCalls = parsedMessage.toolCalls;
          state = state.copyWith(
            isStreaming: true,
            streamingContent: content.isNotEmpty ? content : state.streamingContent,
            activeToolCalls: toolCalls.isNotEmpty ? toolCalls : state.activeToolCalls,
          );
        }
      }
    } else if (type == 'tool_execution_start') {
      final rawTc = event['toolCall'] ?? event;
      if (rawTc is Map<String, dynamic>) {
        final tc = ToolCall.fromJson(rawTc).copyWith(status: 'running');
        final currentCalls = List<ToolCall>.from(state.activeToolCalls);
        final index = currentCalls.indexWhere((item) => item.id == tc.id);
        if (index >= 0) {
          currentCalls[index] = tc;
        } else {
          currentCalls.add(tc);
        }
        state = state.copyWith(activeToolCalls: currentCalls, isStreaming: true);
      }
    } else if (type == 'tool_execution_end') {
      final rawTc = event['toolCall'] ?? event;
      final toolCallId = event['toolCallId'] ?? (rawTc is Map ? rawTc['id'] : null);
      if (toolCallId != null) {
        final currentCalls = List<ToolCall>.from(state.activeToolCalls);
        final index = currentCalls.indexWhere((item) => item.id == toolCallId);
        final result = event['result'] ?? (rawTc is Map ? rawTc['result'] : null);
        final isError = event['isError'] == true || (rawTc is Map && rawTc['isError'] == true);

        if (index >= 0) {
          currentCalls[index] = currentCalls[index].copyWith(
            result: result,
            isError: isError,
            status: isError ? 'error' : 'done',
          );
        } else {
          currentCalls.add(
            ToolCall(
              id: toolCallId.toString(),
              name: (rawTc is Map ? rawTc['name'] : '')?.toString() ?? 'tool',
              result: result,
              isError: isError,
              status: isError ? 'error' : 'done',
            ),
          );
        }
        state = state.copyWith(activeToolCalls: currentCalls);
      }
    } else if (type == 'message_end' || type == 'agent_end' || type == 'stream_end') {
      if (state.streamingContent.isNotEmpty || state.activeToolCalls.isNotEmpty) {
        final completedMessage = ChatMessage(
          id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
          role: 'assistant',
          content: state.streamingContent,
          toolCalls: state.activeToolCalls,
          createdAt: DateTime.now().toIso8601String(),
        );
        state = state.copyWith(
          messages: [...state.messages, completedMessage],
          streamingContent: '',
          activeToolCalls: [],
          isStreaming: false,
        );
      } else {
        state = state.copyWith(isStreaming: false);
      }
    } else if (type == 'agent_error') {
      state = state.copyWith(
        isStreaming: false,
        error: event['error']?.toString() ?? 'Unknown agent error',
      );
    } else if (type == 'aborted') {
      if (state.streamingContent.isNotEmpty || state.activeToolCalls.isNotEmpty) {
        final partialMessage = ChatMessage(
          id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
          role: 'assistant',
          content: '${state.streamingContent}\n\n*[Generation stopped]*',
          toolCalls: state.activeToolCalls,
          createdAt: DateTime.now().toIso8601String(),
        );
        state = state.copyWith(
          messages: [...state.messages, partialMessage],
          streamingContent: '',
          activeToolCalls: [],
          isStreaming: false,
        );
      } else {
        state = state.copyWith(isStreaming: false);
      }
    }
  }

  Future<void> sendMessage(String text, {List<String>? attachmentPaths}) async {
    final paths = attachmentPaths ?? state.selectedAttachments;
    final trimmed = text.trim();
    if (trimmed.isEmpty && paths.isEmpty) return;

    final userMessage = ChatMessage(
      id: 'user_${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: trimmed,
      createdAt: DateTime.now().toIso8601String(),
    );

    final List<Map<String, dynamic>> images = [];
    for (final path in paths) {
      try {
        if (!kIsWeb) {
          final file = File(path);
          if (await file.exists()) {
            final bytes = await file.readAsBytes();
            final base64String = base64Encode(bytes);
            final ext = path.split('.').last.toLowerCase();
            final mime = ext == 'png'
                ? 'image/png'
                : (ext == 'jpg' || ext == 'jpeg' ? 'image/jpeg' : 'image/png');
            images.add({
              'type': 'image',
              'data': base64String,
              'mimeType': mime,
            });
          }
        }
      } catch (_) {}
    }

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      selectedAttachments: [],
      isStreaming: true,
      streamingContent: '',
      activeToolCalls: [],
      error: null,
    );

    _repository.sendPrompt(
      sessionId: _sessionId,
      message: trimmed,
      images: images.isNotEmpty ? images : null,
    );
  }

  Future<void> stopStreaming() async {
    state = state.copyWith(isStreaming: false);
    await _repository.abortSession(_sessionId);
  }

  Future<void> pickAttachment() async {
    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );
      if (picked != null) {
        state = state.copyWith(
          selectedAttachments: [...state.selectedAttachments, picked.path],
        );
      }
    } catch (e) {
      state = state.copyWith(error: 'Failed to select image: $e');
    }
  }

  void removeAttachment(int index) {
    if (index >= 0 && index < state.selectedAttachments.length) {
      final updated = List<String>.from(state.selectedAttachments)..removeAt(index);
      state = state.copyWith(selectedAttachments: updated);
    }
  }

  Future<void> changeModel(AiModel model) async {
    try {
      await _repository.setModel(
        _sessionId,
        provider: model.provider,
        modelId: model.id,
      );
      state = state.copyWith(currentModel: model);
    } catch (e) {
      state = state.copyWith(error: 'Failed to update model: $e');
    }
  }

  @override
  void dispose() {
    _eventsSubscription?.cancel();
    super.dispose();
  }
}

final chatNotifierProvider =
    StateNotifierProvider.autoDispose.family<ChatNotifier, ChatState, String>(
  (ref, sessionId) {
    final repository = ref.watch(chatRepositoryProvider);
    return ChatNotifier(sessionId: sessionId, repository: repository);
  },
);
