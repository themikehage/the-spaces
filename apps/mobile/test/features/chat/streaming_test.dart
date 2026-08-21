import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/chat_notifier.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/streaming_bubble.dart';

class FakeApiClient extends Fake implements ApiClient {
  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    dynamic result;
    if (path.contains('/messages')) {
      result = {'messages': <Map<String, dynamic>>[]};
    } else if (path.contains('/models')) {
      result = {'models': <Map<String, dynamic>>[]};
    } else {
      result = <String, dynamic>{};
    }
    if (fromJson != null) {
      return fromJson(result);
    }
    return result as T;
  }

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    final result = {'success': true};
    if (fromJson != null) {
      return fromJson(result);
    }
    return result as T;
  }

  @override
  Future<T> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    final result = {'success': true};
    if (fromJson != null) {
      return fromJson(result);
    }
    return result as T;
  }
}

class FakeWsClient extends Fake implements WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();
  final List<Map<String, dynamic>> sentMessages = [];

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  @override
  bool get connected => true;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}

  @override
  void send(Map<String, dynamic> message) {
    sentMessages.add(message);
  }

  void emit(Map<String, dynamic> event) {
    _controller.add(event);
  }

  @override
  void dispose() {
    _controller.close();
  }
}

void main() {
  group('Streaming in ChatNotifier', () {
    late FakeApiClient apiClient;
    late FakeWsClient wsClient;
    late ChatRepository repository;
    late ChatNotifier notifier;

    setUp(() {
      apiClient = FakeApiClient();
      wsClient = FakeWsClient();
      repository = ChatRepository(apiClient: apiClient, wsClient: wsClient);
      notifier = ChatNotifier(sessionId: 'test-session-1', repository: repository);
    });

    tearDown(() {
      notifier.dispose();
      wsClient.dispose();
    });

    test('accumulates streamed tokens reactively on WS events', () async {
      await Future<void>.delayed(const Duration(milliseconds: 10));

      // 1. agent_start event
      wsClient.emit({'type': 'agent_start', 'sessionId': 'test-session-1'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.isStreaming, true);
      expect(notifier.state.streamingContent, '');

      // 2. message_update event
      wsClient.emit({
        'type': 'message_update',
        'sessionId': 'test-session-1',
        'message': {
          'id': 'resp-1',
          'role': 'assistant',
          'content': 'Hello, here is the answer.',
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.isStreaming, true);
      expect(notifier.state.streamingContent, 'Hello, here is the answer.');

      // 3. stream_end event commits message to messages list
      wsClient.emit({'type': 'stream_end', 'sessionId': 'test-session-1'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.isStreaming, false);
      expect(notifier.state.streamingContent, '');
      expect(notifier.state.messages.length, 1);
      expect(notifier.state.messages.first.content, 'Hello, here is the answer.');
      expect(notifier.state.messages.first.isAssistant, true);
    });

    test('stopStreaming aborts backend request and resets streaming state', () async {
      await Future<void>.delayed(const Duration(milliseconds: 10));

      wsClient.emit({'type': 'agent_start', 'sessionId': 'test-session-1'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.isStreaming, true);

      await notifier.stopStreaming();
      expect(notifier.state.isStreaming, false);
      expect(
        wsClient.sentMessages.any((m) => m['type'] == 'abort' && m['sessionId'] == 'test-session-1'),
        true,
      );
    });

    test('handles tool_execution_start and tool_execution_end during stream', () async {
      await Future<void>.delayed(const Duration(milliseconds: 10));

      wsClient.emit({
        'type': 'tool_execution_start',
        'sessionId': 'test-session-1',
        'toolCall': {
          'id': 'tc-99',
          'name': 'search',
          'arguments': {'query': 'Flutter riverpod'},
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.activeToolCalls.length, 1);
      expect(notifier.state.activeToolCalls.first.name, 'search');
      expect(notifier.state.activeToolCalls.first.isRunning, true);

      wsClient.emit({
        'type': 'tool_execution_end',
        'sessionId': 'test-session-1',
        'toolCallId': 'tc-99',
        'result': 'Found 10 results',
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state.activeToolCalls.first.isDone, true);
      expect(notifier.state.activeToolCalls.first.result, 'Found 10 results');
    });
  });

  group('StreamingBubble widget', () {
    testWidgets('renders streaming content with animated cursor', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: StreamingBubble(
              content: 'Generating response...',
              toolCalls: [
                ToolCall(
                  id: 'tc-stream',
                  name: 'compile',
                  arguments: {},
                  status: 'running',
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Generating response...', findRichText: true), findsOneWidget);
      expect(find.text('compile'), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 300));
    });
  });
}
