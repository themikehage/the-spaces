import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/ai_model.dart';
import '../data/models/chat_message.dart';

part 'chat_state.freezed.dart';

@freezed
class ChatState with _$ChatState {
  const ChatState._();

  const factory ChatState({
    @Default(<ChatMessage>[]) List<ChatMessage> messages,
    @Default('') String streamingContent,
    @Default(<ToolCall>[]) List<ToolCall> activeToolCalls,
    @Default(false) bool isStreaming,
    @Default(false) bool isLoading,
    String? error,
    AiModel? currentModel,
    @Default(<AiModel>[]) List<AiModel> availableModels,
    @Default(<String>[]) List<String> selectedAttachments,
  }) = _ChatState;
}
