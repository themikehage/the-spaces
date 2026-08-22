import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart' hide FileType;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/events/entity_event_bus.dart';
import '../data/chat_repository.dart';
import '../data/file_upload_repository.dart';
import '../data/models/ai_model.dart';
import '../data/models/chat_attachment.dart';
import '../data/models/chat_message.dart';
import '../data/models/subagent_session.dart';
import '../utils/file_classifier.dart';
import 'chat_state.dart';

class ChatNotifier extends StateNotifier<ChatState> {
  final String _sessionId;
  final ChatRepository _repository;
  final FileUploadRepository? _fileUploadRepository;
  final ImagePicker _imagePicker;

  StreamSubscription? _eventsSubscription;
  String? _streamingProvider;
  String? _streamingModel;
  int? _streamingInputTokens;
  int? _streamingOutputTokens;
  double? _streamingCostUsd;

  ChatNotifier({
    required String sessionId,
    required ChatRepository repository,
    FileUploadRepository? fileUploadRepository,
    ImagePicker? imagePicker,
  })  : _sessionId = sessionId,
        _repository = repository,
        _fileUploadRepository = fileUploadRepository ??
            (repository.apiClient != null
                ? FileUploadRepository(apiClient: repository.apiClient!)
                : null),
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
      _streamingProvider = null;
      _streamingModel = null;
      _streamingInputTokens = null;
      _streamingOutputTokens = null;
      _streamingCostUsd = null;
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
        if (parsedMessage.provider != null) _streamingProvider = parsedMessage.provider;
        if (parsedMessage.model != null) _streamingModel = parsedMessage.model;
        if (parsedMessage.inputTokens != null) _streamingInputTokens = parsedMessage.inputTokens;
        if (parsedMessage.outputTokens != null) _streamingOutputTokens = parsedMessage.outputTokens;
        if (parsedMessage.costUsd != null) _streamingCostUsd = parsedMessage.costUsd;

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

      if (event['provider'] != null) _streamingProvider = event['provider'].toString();
      if (event['model'] != null) _streamingModel = event['model'].toString();
      if (event['inputTokens'] is num) _streamingInputTokens = (event['inputTokens'] as num).toInt();
      if (event['outputTokens'] is num) _streamingOutputTokens = (event['outputTokens'] as num).toInt();
      if (event['costUsd'] is num) _streamingCostUsd = (event['costUsd'] as num).toDouble();

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
    } else if (type == 'tool_execution_update') {
      _handleToolExecutionUpdate(event);
    } else if (type == 'subagent_event') {
      _handleSubagentEvent(event);
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
        final toolName = (rawTc is Map ? rawTc['name'] : '')?.toString().toLowerCase() ?? '';
        if (toolName.contains('write') || toolName.contains('file') || toolName.contains('edit')) {
          EntityEventBus.emit(const EntityUpdatedEvent(type: 'workspace', action: 'file_written'));
        }
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
    } else if (type == 'delegation' || type == 'delegation_notification') {
      final rawDetails = event['details'] ?? event['data'] ?? event;
      Map<String, dynamic>? detailsMap;
      if (rawDetails is Map<String, dynamic>) {
        detailsMap = rawDetails;
      }
      final delegationMsg = ChatMessage(
        id: 'delegation_${event['toolCallId'] ?? DateTime.now().millisecondsSinceEpoch}',
        role: 'delegation',
        content: (event['summary'] ?? event['executiveSummary'] ?? '') as String,
        details: detailsMap,
        createdAt: DateTime.now().toIso8601String(),
      );
      state = state.copyWith(
        messages: [...state.messages, delegationMsg],
      );
    } else if (type == 'message_end' || type == 'agent_end' || type == 'stream_end') {
      EntityEventBus.emit(const EntityUpdatedEvent(type: 'workspace', action: 'agent_end'));
      final rawUsed = event['used'] ?? event['contextUsed'] ?? event['totalTokens'] ?? event['tokensUsed'];
      final rawLimit = event['limit'] ?? event['contextLimit'] ?? event['maxTokens'] ?? event['tokensLimit'];
      final used = rawUsed is num ? rawUsed.toInt() : (rawUsed != null ? int.tryParse(rawUsed.toString()) : null);
      final limit = rawLimit is num ? rawLimit.toInt() : (rawLimit != null ? int.tryParse(rawLimit.toString()) : null);

      final rawMsg = event['message'];
      ChatMessage? endMsg;
      if (rawMsg is Map<String, dynamic>) {
        endMsg = ChatMessage.fromJson(rawMsg);
      }

      final provider = endMsg?.provider ?? _streamingProvider ?? state.currentModel?.provider;
      final model = endMsg?.model ?? _streamingModel ?? state.currentModel?.id;
      final inTokens = endMsg?.inputTokens ?? _streamingInputTokens;
      final outTokens = endMsg?.outputTokens ?? _streamingOutputTokens;
      final cost = endMsg?.costUsd ?? _streamingCostUsd;

      if (state.streamingContent.isNotEmpty || state.activeToolCalls.isNotEmpty || endMsg != null) {
        final completedMessage = ChatMessage(
          id: endMsg?.id.isNotEmpty == true ? endMsg!.id : 'msg_${DateTime.now().millisecondsSinceEpoch}',
          role: 'assistant',
          content: state.streamingContent.isNotEmpty ? state.streamingContent : (endMsg?.content ?? ''),
          toolCalls: state.activeToolCalls.isNotEmpty ? state.activeToolCalls : (endMsg?.toolCalls ?? []),
          createdAt: DateTime.now().toIso8601String(),
          provider: provider,
          model: model,
          inputTokens: inTokens,
          outputTokens: outTokens,
          costUsd: cost,
          siblings: endMsg?.siblings,
          details: endMsg?.details,
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
          provider: _streamingProvider ?? state.currentModel?.provider,
          model: _streamingModel ?? state.currentModel?.id,
          inputTokens: _streamingInputTokens,
          outputTokens: _streamingOutputTokens,
          costUsd: _streamingCostUsd,
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

  void _handleToolExecutionUpdate(Map<String, dynamic> event) {
    final rawTc = event['toolCall'] ?? event;
    final toolCallId = (event['toolCallId'] ?? (rawTc is Map ? rawTc['id'] : null))?.toString();
    if (toolCallId == null || toolCallId.isEmpty) return;

    final toolName = (event['toolName'] ?? (rawTc is Map ? rawTc['name'] : null))?.toString() ?? 'tool';
    final partial = event['partialResult'] ?? (rawTc is Map ? rawTc['partialResult'] : null) ?? event['result'];

    String formattedOutput = '';
    if (partial is String) {
      formattedOutput = partial;
    } else if (partial is Map) {
      if (partial.containsKey('output') && partial['output'] is String) {
        formattedOutput = partial['output'] as String;
      } else if (partial.containsKey('text') && partial['text'] is String) {
        formattedOutput = partial['text'] as String;
      } else if (partial.containsKey('content') && partial['content'] is String) {
        formattedOutput = partial['content'] as String;
      } else {
        formattedOutput = jsonEncode(partial);
      }
    } else if (partial != null) {
      formattedOutput = partial.toString();
    }

    final currentCalls = List<ToolCall>.from(state.activeToolCalls);
    final index = currentCalls.indexWhere((item) => item.id == toolCallId);

    if (index >= 0) {
      final existing = currentCalls[index];
      currentCalls[index] = existing.copyWith(
        liveOutput: formattedOutput,
        status: 'running',
      );
    } else {
      currentCalls.add(
        ToolCall(
          id: toolCallId,
          name: toolName,
          status: 'running',
          liveOutput: formattedOutput,
        ),
      );
    }

    state = state.copyWith(activeToolCalls: currentCalls, isStreaming: true);
  }

  void _handleSubagentEvent(Map<String, dynamic> event) {
    final toolCallId = (event['toolCallId'] ?? event['id'])?.toString() ?? '';
    final subagentSessionId = (event['subagentSessionId'] ?? event['sessionId'])?.toString() ?? '';
    final rawInner = event['event'] ?? event;
    final innerEvt = rawInner is Map<String, dynamic> ? rawInner : <String, dynamic>{};

    final evtType = (innerEvt['type'] ?? 'info').toString();
    String formattedContent = '';

    if (evtType == 'token' || evtType == 'thinking') {
      formattedContent = (innerEvt['text'] ?? innerEvt['content'] ?? '').toString();
    } else if (evtType == 'tool_call_start') {
      final name = innerEvt['name'] ?? 'tool';
      final argsStr = innerEvt['arguments'] != null ? jsonEncode(innerEvt['arguments']) : '{}';
      formattedContent = '🔨 Running: $name($argsStr)';
    } else if (evtType == 'tool_call_end') {
      final name = innerEvt['name'] ?? 'tool';
      final res = innerEvt['result'] != null
          ? (innerEvt['result'] is String ? innerEvt['result'] : jsonEncode(innerEvt['result']))
          : '';
      final truncated = res.length > 250 ? '${res.substring(0, 250)}...' : res;
      formattedContent = '✅ Result ($name): $truncated';
    } else if (evtType == 'error') {
      formattedContent = '❌ Error: ${innerEvt['error'] ?? 'Unknown subagent error'}';
    } else if (evtType == 'agent_start') {
      formattedContent = '🚀 Subagent execution started';
    } else if (evtType == 'agent_end' || evtType == 'done') {
      formattedContent = '🏁 Subagent execution finished';
    } else {
      formattedContent = (innerEvt['text'] ?? innerEvt['content'] ?? innerEvt['message'] ?? '').toString();
    }

    final newSubagentEvent = SubagentEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}_$evtType',
      type: evtType,
      content: formattedContent,
      timestamp: DateTime.now(),
    );

    final status = (evtType == 'agent_end' || evtType == 'done')
        ? SubagentStatus.done
        : (evtType == 'error' ? SubagentStatus.error : SubagentStatus.running);

    final currentCalls = List<ToolCall>.from(state.activeToolCalls);
    final index = currentCalls.indexWhere((item) =>
        (toolCallId.isNotEmpty && item.id == toolCallId) ||
        (subagentSessionId.isNotEmpty && item.id == subagentSessionId));

    if (index >= 0) {
      final existing = currentCalls[index];
      final currentEvents = List<SubagentEvent>.from(existing.subagentEvents ?? []);

      if (currentEvents.isNotEmpty &&
          (evtType == 'token' || evtType == 'thinking') &&
          currentEvents.last.type == evtType) {
        final last = currentEvents.last;
        currentEvents[currentEvents.length - 1] = last.copyWith(
          content: '${last.content}$formattedContent',
        );
      } else if (formattedContent.isNotEmpty) {
        currentEvents.add(newSubagentEvent);
      }

      final existingSession = existing.subagentSession ??
          SubagentSession(
            id: subagentSessionId.isNotEmpty ? subagentSessionId : existing.id,
            name: existing.name.isNotEmpty ? existing.name : 'Subagent',
            status: status,
            events: currentEvents,
          );

      currentCalls[index] = existing.copyWith(
        status: status == SubagentStatus.done ? 'done' : (status == SubagentStatus.error ? 'error' : 'running'),
        subagentEvents: currentEvents,
        subagentSession: existingSession.copyWith(
          status: status,
          events: currentEvents,
          result: evtType == 'agent_end' ? innerEvt['result']?.toString() : existingSession.result,
        ),
      );
    } else {
      final effectiveId = toolCallId.isNotEmpty
          ? toolCallId
          : (subagentSessionId.isNotEmpty ? subagentSessionId : 'sub_${DateTime.now().millisecondsSinceEpoch}');
      final events = formattedContent.isNotEmpty ? [newSubagentEvent] : <SubagentEvent>[];
      final session = SubagentSession(
        id: effectiveId,
        name: (event['toolName'] ?? 'spawn_subagent').toString(),
        status: status,
        events: events,
      );

      currentCalls.add(
        ToolCall(
          id: effectiveId,
          name: session.name,
          status: status == SubagentStatus.done ? 'done' : (status == SubagentStatus.error ? 'error' : 'running'),
          subagentEvents: events,
          subagentSession: session,
        ),
      );
    }

    state = state.copyWith(activeToolCalls: currentCalls, isStreaming: status == SubagentStatus.running);
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
    List<String>? tools,
  }) async {
    final pending = List<ChatAttachment>.from(state.pendingAttachments);
    final legacyPaths = attachmentPaths ?? state.selectedAttachments;
    final trimmed = text.trim();
    if (trimmed.isEmpty && pending.isEmpty && legacyPaths.isEmpty) return;

    final isFirstMessage = state.messages.isEmpty;
    final isStreamingCurrently = state.isStreaming;
    final isFollowUp = followUp ?? false;

    final List<Map<String, dynamic>> images = [];
    String extraPromptText = '';

    if (pending.isNotEmpty) {
      for (final att in pending) {
        if (att.isImage) {
          try {
            if (!kIsWeb && att.localPath.isNotEmpty) {
              final file = File(att.localPath);
              if (await file.exists()) {
                final bytes = await file.readAsBytes();
                final base64String = base64Encode(bytes);
                final ext = att.extension.toLowerCase();
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
          if (att.serverPath != null && att.serverPath!.isNotEmpty) {
            extraPromptText +=
                '\n[Attached File: ${att.serverPath}] (I have uploaded this image to your workspace at: ${att.serverPath})';
          }
        } else if (att.type == FileType.inlineText) {
          if (att.textContent != null && att.textContent!.isNotEmpty) {
            final lang = FileClassifier.getMarkdownLanguage(att.name);
            extraPromptText +=
                '\n\n[File Content of ${att.name}]:\n```$lang\n${att.textContent}\n```';
          }
          if (att.serverPath != null && att.serverPath!.isNotEmpty) {
            extraPromptText +=
                '\n[Attached File: ${att.serverPath}] (I have uploaded this file to your workspace at: ${att.serverPath})';
          }
        } else if (att.type == FileType.uploadRequired) {
          if (att.serverPath != null && att.serverPath!.isNotEmpty) {
            extraPromptText +=
                '\n\n[Attached File: ${att.serverPath}] (I have uploaded this file to your workspace at: ${att.serverPath})';
          }
        }
      }
    } else {
      // Fallback legacy paths
      for (final path in legacyPaths) {
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
    }

    final effectiveUserContent = (trimmed + extraPromptText).trim();

    final userMessage = ChatMessage(
      id: 'user_${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: effectiveUserContent.isNotEmpty ? effectiveUserContent : trimmed,
      createdAt: DateTime.now().toIso8601String(),
      steerMode: isStreamingCurrently ? 'steering' : (isFollowUp ? 'follow_up' : null),
    );

    appendToSentHistory(trimmed.isNotEmpty ? trimmed : effectiveUserContent);

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      selectedAttachments: [],
      pendingAttachments: [],
      isStreaming: true,
      streamingContent: '',
      activeToolCalls: [],
      error: null,
    );

    _repository.sendPrompt(
      sessionId: _sessionId,
      message: effectiveUserContent.isNotEmpty ? effectiveUserContent : trimmed,
      images: images.isNotEmpty ? images : null,
      followUp: isFollowUp ? true : null,
      tools: tools,
    );

    if (isFirstMessage && trimmed.isNotEmpty) {
      _autoRenameSession(trimmed);
    }
  }

  Future<void> navigateBranch(String targetId) async {
    try {
      await _repository.navigateBranch(_sessionId, targetId);
      await loadHistory();
    } catch (e) {
      state = state.copyWith(error: 'Failed to navigate branch: $e');
    }
  }

  Future<void> stopStreaming() async {
    state = state.copyWith(isStreaming: false);
    await _repository.abortSession(_sessionId);
  }

  Future<void> pickAttachment({
    String? projectName,
    String? agentId,
    String? teamId,
    String? channelId,
  }) async {
    try {
      FilePickerResult? result;
      try {
        result = await FilePicker.platform.pickFiles(
          allowMultiple: false,
          withData: kIsWeb,
        );
      } catch (_) {
        final pickedImage = await _imagePicker.pickImage(
          source: ImageSource.gallery,
          imageQuality: 80,
        );
        if (pickedImage != null) {
          final file = File(pickedImage.path);
          final size = await file.exists() ? await file.length() : 0;
          final att = ChatAttachment(
            localPath: pickedImage.path,
            name: pickedImage.name,
            sizeBytes: size,
            type: FileType.inlineImage,
          );
          state = state.copyWith(
            pendingAttachments: [...state.pendingAttachments, att],
            selectedAttachments: [...state.selectedAttachments, att.localPath],
            error: null,
          );
          return;
        }
      }

      if (result != null && result.files.isNotEmpty) {
        final picked = result.files.first;
        final path = picked.path ?? '';
        final name = picked.name;
        final size = picked.size;

        final fileType = FileClassifier.classifyFile(path.isNotEmpty ? path : name, size);

        if (fileType == FileType.inlineImage) {
          final att = ChatAttachment(
            localPath: path,
            name: name,
            sizeBytes: size,
            type: FileType.inlineImage,
          );
          state = state.copyWith(
            pendingAttachments: [...state.pendingAttachments, att],
            selectedAttachments: [...state.selectedAttachments, att.localPath],
            error: null,
          );
        } else if (fileType == FileType.inlineText) {
          String textContent = '';
          if (path.isNotEmpty && !kIsWeb) {
            final file = File(path);
            if (await file.exists()) {
              textContent = await file.readAsString();
            }
          } else if (picked.bytes != null) {
            textContent = utf8.decode(picked.bytes!, allowMalformed: true);
          }

          final att = ChatAttachment(
            localPath: path,
            name: name,
            sizeBytes: size,
            type: FileType.inlineText,
            textContent: textContent,
          );
          state = state.copyWith(
            pendingAttachments: [...state.pendingAttachments, att],
            selectedAttachments: [...state.selectedAttachments, att.localPath],
            error: null,
          );
        } else {
          final initialAtt = ChatAttachment(
            localPath: path,
            name: name,
            sizeBytes: size,
            type: FileType.uploadRequired,
            isUploading: true,
          );
          state = state.copyWith(
            pendingAttachments: [...state.pendingAttachments, initialAtt],
            error: null,
          );

          if (path.isNotEmpty && !kIsWeb && _fileUploadRepository != null) {
            try {
              final uploaded = await _fileUploadRepository!.uploadFile(
                filePath: path,
                projectName: projectName,
                agentId: agentId,
                teamId: teamId,
                channelId: channelId,
              );
              final updatedAttachments = state.pendingAttachments.map((a) {
                if (a.localPath == path) {
                  return a.copyWith(
                    isUploading: false,
                    serverPath: uploaded.path,
                  );
                }
                return a;
              }).toList();

              state = state.copyWith(
                pendingAttachments: updatedAttachments,
                selectedAttachments: [...state.selectedAttachments, path],
                error: null,
              );
            } catch (e) {
              final updatedAttachments =
                  state.pendingAttachments.where((a) => a.localPath != path).toList();
              state = state.copyWith(
                pendingAttachments: updatedAttachments,
                error: 'Failed to upload ${initialAtt.name}: $e',
              );
            }
          } else if (_fileUploadRepository == null) {
            // Offline / stub mode
            final updatedAttachments = state.pendingAttachments.map((a) {
              if (a.localPath == path) {
                return a.copyWith(isUploading: false);
              }
              return a;
            }).toList();
            state = state.copyWith(
              pendingAttachments: updatedAttachments,
              selectedAttachments: [...state.selectedAttachments, path],
            );
          }
        }
      }
    } catch (e) {
      state = state.copyWith(error: 'Failed to select attachment: $e');
    }
  }

  void removeAttachment(int index) {
    if (index >= 0 && index < state.pendingAttachments.length) {
      final att = state.pendingAttachments[index];
      final updatedPending = List<ChatAttachment>.from(state.pendingAttachments)..removeAt(index);
      final updatedSelected = List<String>.from(state.selectedAttachments)..remove(att.localPath);
      state = state.copyWith(
        pendingAttachments: updatedPending,
        selectedAttachments: updatedSelected,
      );
    } else if (index >= 0 && index < state.selectedAttachments.length) {
      final updatedSelected = List<String>.from(state.selectedAttachments)..removeAt(index);
      state = state.copyWith(selectedAttachments: updatedSelected);
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
    final uploadRepository = ref.watch(fileUploadRepositoryProvider);
    return ChatNotifier(
      sessionId: sessionId,
      repository: repository,
      fileUploadRepository: uploadRepository,
    );
  },
);
