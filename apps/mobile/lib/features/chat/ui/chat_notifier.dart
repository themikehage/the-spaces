import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/events/entity_event_bus.dart';
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
    _repository.connectToSession(_sessionId);
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
      if (messages.isNotEmpty) {
        _hasAutoRenamed = true;
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

    if (type == 'error' || type == 'auth_error') {
      state = state.copyWith(
        isStreaming: false,
        error: event['error']?.toString() ?? 'Error occurred in session communication',
      );
    } else if (type == 'agent_start') {
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
    } else if (type == 'context_usage' || type == 'context_update' || type == 'usage') {
      final rawUsed = event['used'] ?? event['contextUsed'] ?? event['totalTokens'] ?? event['tokensUsed'];
      final rawLimit = event['limit'] ?? event['contextLimit'] ?? event['maxTokens'] ?? event['tokensLimit'];
      final used = rawUsed is num ? rawUsed.toInt() : (rawUsed != null ? int.tryParse(rawUsed.toString()) : null);
      final limit = rawLimit is num ? rawLimit.toInt() : (rawLimit != null ? int.tryParse(rawLimit.toString()) : null);

      state = state.copyWith(
        contextUsed: used ?? state.contextUsed,
        contextLimit: limit ?? state.contextLimit,
      );
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
    } else if (type == 'tool_approval_required' ||
        type == 'tool_approval_request' ||
        type == 'request_approval') {
      final rawReq = event['request'] ?? event['approval'] ?? event;
      if (rawReq is Map<String, dynamic>) {
        final approval = ApprovalRequest.fromJson(rawReq);
        final approvalMsg = ChatMessage(
          id: 'approval_${approval.toolCallId.isNotEmpty ? approval.toolCallId : DateTime.now().millisecondsSinceEpoch}',
          role: 'tool_approval_request',
          approvalRequest: approval,
          createdAt: DateTime.now().toIso8601String(),
        );
        state = state.copyWith(
          messages: [...state.messages, approvalMsg],
        );
      }
    } else if (type == 'ask_question' || type == 'question_request') {
      final rawReq = event['request'] ?? event['question'] ?? event;
      if (rawReq is Map<String, dynamic>) {
        final question = QuestionRequest.fromJson(rawReq);
        final questionMsg = ChatMessage(
          id: 'question_${question.questionId.isNotEmpty ? question.questionId : DateTime.now().millisecondsSinceEpoch}',
          role: 'ask_question',
          questionRequest: question,
          createdAt: DateTime.now().toIso8601String(),
        );
        state = state.copyWith(
          messages: [...state.messages, questionMsg],
        );
      }
    } else if (type == 'message_end' || type == 'agent_end' || type == 'stream_end') {
      final rawUsed = event['used'] ?? event['contextUsed'] ?? event['totalTokens'] ?? event['tokensUsed'];
      final rawLimit = event['limit'] ?? event['contextLimit'] ?? event['maxTokens'] ?? event['tokensLimit'];
      final used = rawUsed is num ? rawUsed.toInt() : (rawUsed != null ? int.tryParse(rawUsed.toString()) : null);
      final limit = rawLimit is num ? rawLimit.toInt() : (rawLimit != null ? int.tryParse(rawLimit.toString()) : null);

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
          contextUsed: used ?? state.contextUsed,
          contextLimit: limit ?? state.contextLimit,
        );
      } else {
        state = state.copyWith(
          isStreaming: false,
          contextUsed: used ?? state.contextUsed,
          contextLimit: limit ?? state.contextLimit,
        );
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

  void resolveApproval({
    required String toolCallId,
    required bool approved,
  }) {
    _repository.sendApprovalResponse(
      sessionId: _sessionId,
      toolCallId: toolCallId,
      approved: approved,
    );

    final updated = state.messages.map((msg) {
      if (msg.approvalRequest != null &&
          (msg.approvalRequest!.toolCallId == toolCallId || msg.id.contains(toolCallId))) {
        return msg.copyWith(
          approvalRequest: msg.approvalRequest!.copyWith(
            resolved: true,
            approvedResult: approved,
          ),
        );
      }
      return msg;
    }).toList();

    state = state.copyWith(messages: updated);
  }

  void answerQuestion({
    required String questionId,
    required List<String> selectedOptions,
    String? customAnswer,
  }) {
    _repository.sendQuestionResponse(
      sessionId: _sessionId,
      questionId: questionId,
      selectedOptions: selectedOptions,
      customAnswer: customAnswer,
    );

    final updated = state.messages.map((msg) {
      if (msg.questionRequest != null &&
          (msg.questionRequest!.questionId == questionId || msg.id.contains(questionId))) {
        return msg.copyWith(
          questionRequest: msg.questionRequest!.copyWith(
            resolved: true,
            selectedOptions: selectedOptions,
            customAnswer: customAnswer,
          ),
        );
      }
      return msg;
    }).toList();

    state = state.copyWith(messages: updated);
  }

  void setInputMode(InputMode mode) {
    state = state.copyWith(inputMode: mode);
  }

  void appendToSentHistory(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final updated = [trimmed, ...state.sentHistory.where((t) => t != trimmed)];
    if (updated.length > 20) {
      updated.removeRange(20, updated.length);
    }
    state = state.copyWith(sentHistory: updated, historyIndex: -1);
  }

  String? navigateHistory(int delta) {
    if (state.sentHistory.isEmpty) return null;
    final newIndex = (state.historyIndex + delta).clamp(-1, state.sentHistory.length - 1);
    state = state.copyWith(historyIndex: newIndex);
    if (newIndex == -1) {
      return '';
    }
    return state.sentHistory[newIndex];
  }

  Future<void> compact() async {
    state = state.copyWith(isCompacting: true, error: null);
    try {
      await _repository.compactSession(_sessionId);
      await loadHistory();
    } catch (e) {
      state = state.copyWith(error: 'Failed to compact session: $e');
    } finally {
      state = state.copyWith(isCompacting: false);
    }
  }

  bool _hasAutoRenamed = false;

  Future<void> _autoRenameSession(String text) async {
    if (_hasAutoRenamed) return;
    _hasAutoRenamed = true;
    try {
      final title = text.length > 50 ? text.substring(0, 50) : text;
      await _repository.updateSessionTitle(_sessionId, title);
      EntityEventBus.emit('session_renamed');
    } catch (_) {}
  }

  Future<void> sendMessage(
    String text, {
    List<String>? attachmentPaths,
    bool? followUp,
  }) async {
    final paths = attachmentPaths ?? state.selectedAttachments;
    final trimmed = text.trim();
    if (trimmed.isEmpty && paths.isEmpty) return;

    final isFirstMessage = state.messages.isEmpty;

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

    final isFollowUp = followUp ?? (state.inputMode == InputMode.followup);
    appendToSentHistory(trimmed);

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
      followUp: isFollowUp ? true : null,
    );

    if (isFirstMessage && trimmed.isNotEmpty) {
      _autoRenameSession(trimmed);
    }
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
    _repository.unsubscribeFromSession(_sessionId);
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
