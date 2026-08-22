import 'dart:convert';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message.freezed.dart';

@freezed
class ApprovalRequest with _$ApprovalRequest {
  const ApprovalRequest._();

  const factory ApprovalRequest({
    required String toolCallId,
    required String toolName,
    @Default('warning') String severity,
    @Default('') String message,
    @Default(15) int timeoutSeconds,
    @Default(false) bool resolved,
    bool? approvedResult,
    Map<String, dynamic>? args,
  }) = _ApprovalRequest;

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) {
    final rawArgs = json['args'] ?? json['arguments'] ?? json['input'];
    Map<String, dynamic>? parsedArgs;
    if (rawArgs is Map<String, dynamic>) {
      parsedArgs = rawArgs;
    } else if (rawArgs is String && rawArgs.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawArgs);
        if (decoded is Map<String, dynamic>) {
          parsedArgs = decoded;
        }
      } catch (_) {}
    }

    return ApprovalRequest(
      toolCallId: (json['toolCallId'] ?? json['componentId'] ?? json['id'] ?? '') as String,
      toolName: (json['toolName'] ?? json['name'] ?? 'tool') as String,
      severity: (json['severity'] ?? 'warning') as String,
      message: (json['message'] ?? json['description'] ?? json['title'] ?? '') as String,
      timeoutSeconds: (json['timeoutSeconds'] ?? json['timeout'] ?? 15) as int,
      resolved: json['resolved'] == true,
      approvedResult: json['approvedResult'] as bool?,
      args: parsedArgs,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'toolCallId': toolCallId,
      'toolName': toolName,
      'severity': severity,
      'message': message,
      'timeoutSeconds': timeoutSeconds,
      'resolved': resolved,
      'approvedResult': approvedResult,
      if (args != null) 'args': args,
    };
  }
}

@freezed
class QuestionRequest with _$QuestionRequest {
  const QuestionRequest._();

  const factory QuestionRequest({
    required String questionId,
    required String question,
    @Default(<String>[]) List<String> options,
    @Default(true) bool allowCustom,
    @Default(false) bool isMultiSelect,
    @Default(false) bool resolved,
    List<String>? selectedOptions,
    String? customAnswer,
  }) = _QuestionRequest;

  factory QuestionRequest.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'];
    final List<String> parsedOptions = [];
    if (rawOptions is List) {
      for (final opt in rawOptions) {
        if (opt != null) parsedOptions.add(opt.toString());
      }
    }

    final rawSelected = json['selectedOptions'];
    List<String>? selectedList;
    if (rawSelected is List) {
      selectedList = rawSelected.map((e) => e.toString()).toList();
    }

    return QuestionRequest(
      questionId: (json['questionId'] ?? json['componentId'] ?? json['id'] ?? '') as String,
      question: (json['question'] ?? json['prompt'] ?? '') as String,
      options: parsedOptions,
      allowCustom: json['allowCustom'] != false,
      isMultiSelect: json['isMultiSelect'] == true,
      resolved: json['resolved'] == true,
      selectedOptions: selectedList,
      customAnswer: json['customAnswer'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'question': question,
      'options': options,
      'allowCustom': allowCustom,
      'isMultiSelect': isMultiSelect,
      'resolved': resolved,
      if (selectedOptions != null) 'selectedOptions': selectedOptions,
      if (customAnswer != null) 'customAnswer': customAnswer,
    };
  }
}

@freezed
class ToolCall with _$ToolCall {
  const ToolCall._();

  const factory ToolCall({
    required String id,
    required String name,
    @Default(<String, dynamic>{}) Map<String, dynamic> arguments,
    dynamic result,
    @Default('done') String status,
    @Default(false) bool isError,
  }) = _ToolCall;

  factory ToolCall.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> parsedArgs = {};
    final rawArgs = json['arguments'] ?? json['args'] ?? json['input'];
    if (rawArgs is Map<String, dynamic>) {
      parsedArgs = rawArgs;
    } else if (rawArgs is String && rawArgs.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawArgs);
        if (decoded is Map<String, dynamic>) {
          parsedArgs = decoded;
        }
      } catch (_) {
        parsedArgs = {'raw': rawArgs};
      }
    }

    final isErr = json['isError'] == true;
    final status = (json['status'] as String?) ??
        (isErr ? 'error' : (json['result'] != null ? 'done' : 'running'));

    return ToolCall(
      id: (json['id'] ?? json['toolCallId'] ?? '') as String,
      name: (json['name'] ?? json['toolName'] ?? '') as String,
      arguments: parsedArgs,
      result: json['result'],
      status: status,
      isError: isErr,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'arguments': arguments,
      'result': result,
      'status': status,
      'isError': isError,
    };
  }

  bool get isRunning => status == 'running';
  bool get isDone => status == 'done';
}

@freezed
class ChatMessage with _$ChatMessage {
  const ChatMessage._();

  const factory ChatMessage({
    required String id,
    required String role,
    @Default('') String content,
    @Default('') String thinking,
    ApprovalRequest? approvalRequest,
    QuestionRequest? questionRequest,
    @Default(<ToolCall>[]) List<ToolCall> toolCalls,
    @Default('') String createdAt,
    @Default(false) bool isError,
    @Default(false) bool isStreaming,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'] ?? json['responseId'] ?? '';
    final rawRole = (json['role'] ?? 'user') as String;
    final rawContent = json['content'];
    final isStreaming = json['isStreaming'] == true;
    final isError = json['isError'] == true;
    final timestamp = json['timestamp'] ?? json['createdAt'];
    String createdAt = '';
    if (timestamp is String) {
      createdAt = timestamp;
    } else if (timestamp is num) {
      createdAt = DateTime.fromMillisecondsSinceEpoch(timestamp.toInt()).toIso8601String();
    } else {
      createdAt = DateTime.now().toIso8601String();
    }

    String extractedContent = '';
    String extractedThinking = (json['thinking'] as String?) ?? '';
    final extractedToolCalls = <ToolCall>[];
    ApprovalRequest? extractedApproval;
    QuestionRequest? extractedQuestion;

    if (json['approvalRequest'] is Map<String, dynamic>) {
      extractedApproval = ApprovalRequest.fromJson(json['approvalRequest'] as Map<String, dynamic>);
    }

    if (json['questionRequest'] is Map<String, dynamic>) {
      extractedQuestion = QuestionRequest.fromJson(json['questionRequest'] as Map<String, dynamic>);
    }

    if (rawContent is String) {
      extractedContent = rawContent;
      final thinkingMatch = RegExp(r'<thinking>([\s\S]*?)</thinking>').firstMatch(extractedContent);
      if (thinkingMatch != null) {
        if (extractedThinking.isEmpty) {
          extractedThinking = thinkingMatch.group(1)?.trim() ?? '';
        }
        extractedContent = extractedContent.replaceAll(RegExp(r'<thinking>[\s\S]*?</thinking>'), '').trim();
      }
    } else if (rawContent is List) {
      final textParts = <String>[];
      for (final item in rawContent) {
        if (item is Map<String, dynamic>) {
          final type = item['type'] as String?;
          if (type == 'text' && item['text'] is String) {
            textParts.add(item['text'] as String);
          } else if (type == 'tool_use' || type == 'tool_call') {
            extractedToolCalls.add(ToolCall.fromJson(item));
          } else if (type == 'thinking') {
            final t = (item['thinking'] ?? item['text']) as String?;
            if (t != null && t.isNotEmpty) {
              extractedThinking = t;
            }
          } else if (type == 'approval_request' || type == 'tool_approval_request') {
            extractedApproval = ApprovalRequest.fromJson(item);
          } else if (type == 'question_request' || type == 'ask_question') {
            extractedQuestion = QuestionRequest.fromJson(item);
          }
        } else if (item is String) {
          textParts.add(item);
        }
      }
      extractedContent = textParts.join('\n');
    }

    if (json['toolCalls'] is List) {
      for (final tc in json['toolCalls'] as List) {
        if (tc is Map<String, dynamic>) {
          extractedToolCalls.add(ToolCall.fromJson(tc));
        }
      }
    }

    return ChatMessage(
      id: rawId.toString(),
      role: rawRole,
      content: extractedContent,
      thinking: extractedThinking,
      approvalRequest: extractedApproval,
      questionRequest: extractedQuestion,
      toolCalls: extractedToolCalls,
      createdAt: createdAt,
      isError: isError,
      isStreaming: isStreaming,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'content': content,
      'thinking': thinking,
      if (approvalRequest != null) 'approvalRequest': approvalRequest!.toJson(),
      if (questionRequest != null) 'questionRequest': questionRequest!.toJson(),
      'toolCalls': toolCalls.map((t) => t.toJson()).toList(),
      'createdAt': createdAt,
      'isError': isError,
      'isStreaming': isStreaming,
    };
  }

  bool get isUser => role.toLowerCase() == 'user';
  bool get isAssistant => role.toLowerCase() == 'assistant';
  bool get isSystem => role.toLowerCase() == 'system';
  bool get isTool =>
      role.toLowerCase() == 'tool' ||
      role.toLowerCase() == 'tool_result' ||
      role.toLowerCase() == 'toolresult';
  bool get isApprovalRequest =>
      approvalRequest != null || role.toLowerCase() == 'tool_approval_request';
  bool get isQuestionRequest =>
      questionRequest != null || role.toLowerCase() == 'ask_question';
}
