import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/ai_model.dart';
import '../data/models/chat_attachment.dart';
import '../data/models/chat_message.dart';

part 'chat_state.freezed.dart';

enum InputMode {
  steer,
  followup,
}

@freezed
class ChatState with _$ChatState {
  const ChatState._();

  const factory ChatState({
    @Default(<ChatMessage>[]) List<ChatMessage> messages,
    @Default('') String streamingContent,
    @Default(<ToolCall>[]) List<ToolCall> activeToolCalls,
    @Default(false) bool isStreaming,
    @Default(false) bool isLoading,
    @Default(false) bool isCompacting,
    String? error,
    AiModel? currentModel,
    @Default(<AiModel>[]) List<AiModel> availableModels,
    @Default(<String>[]) List<String> selectedAttachments,
    @Default(<ChatAttachment>[]) List<ChatAttachment> pendingAttachments,
    @Default(0) int contextUsed,
    @Default(0) int contextLimit,
    @Default(InputMode.steer) InputMode inputMode,
    @Default(<String>[]) List<String> sentHistory,
    @Default(-1) int historyIndex,
  }) = _ChatState;

  double get usedRatio =>
      contextLimit > 0 ? (contextUsed / contextLimit).clamp(0.0, 1.0) : 0.0;
}
