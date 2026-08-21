import 'dart:convert';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message.freezed.dart';

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
    final extractedToolCalls = <ToolCall>[];

    if (rawContent is String) {
      extractedContent = rawContent;
    } else if (rawContent is List) {
      final textParts = <String>[];
      for (final item in rawContent) {
        if (item is Map<String, dynamic>) {
          final type = item['type'] as String?;
          if (type == 'text' && item['text'] is String) {
            textParts.add(item['text'] as String);
          } else if (type == 'tool_use' || type == 'tool_call') {
            extractedToolCalls.add(ToolCall.fromJson(item));
          } else if (type == 'thinking' && item['thinking'] is String) {
            // thinking content
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
}
