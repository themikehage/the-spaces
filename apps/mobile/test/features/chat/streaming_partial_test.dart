import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/data/models/subagent_session.dart';
import 'package:spaces_mobile/features/chat/ui/chat_notifier.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/subagent_live_view.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tool_call_card.dart';

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
}

class FakeWsClient extends Fake implements WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

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

  void emit(Map<String, dynamic> event) {
    _controller.add(event);
  }

  @override
  void dispose() {
    _controller.close();
  }
}

void main() {
  group('M08 - Subagent & Partial Streaming Models', () {
    test('SubagentStatus fromString maps correctly', () {
      expect(SubagentStatus.fromString('running'), SubagentStatus.running);
      expect(SubagentStatus.fromString('done'), SubagentStatus.done);
      expect(SubagentStatus.fromString('completed'), SubagentStatus.done);
      expect(SubagentStatus.fromString('error'), SubagentStatus.error);
      expect(SubagentStatus.fromString('failed'), SubagentStatus.error);
      expect(SubagentStatus.fromString(null), SubagentStatus.running);
    });

    test('SubagentEvent serializes and deserializes', () {
      final now = DateTime.now();
      final event = SubagentEvent(
        id: 'evt_1',
        type: 'tool_start',
        content: 'Running tool...',
        timestamp: now,
      );

      final json = event.toJson();
      expect(json['id'], 'evt_1');
      expect(json['type'], 'tool_start');
      expect(json['content'], 'Running tool...');

      final deserialized = SubagentEvent.fromJson(json);
      expect(deserialized.id, 'evt_1');
      expect(deserialized.type, 'tool_start');
      expect(deserialized.content, 'Running tool...');
    });

    test('SubagentSession serializes and deserializes', () {
      final session = SubagentSession(
        id: 'sub_123',
        name: 'Research Agent',
        status: SubagentStatus.running,
        events: [
          SubagentEvent(
            id: 'e1',
            type: 'agent_start',
            content: 'Starting',
            timestamp: DateTime.now(),
          ),
        ],
        result: 'Final findings',
      );

      final json = session.toJson();
      expect(json['id'], 'sub_123');
      expect(json['name'], 'Research Agent');
      expect(json['status'], 'running');
      expect(json['result'], 'Final findings');

      final deserialized = SubagentSession.fromJson(json);
      expect(deserialized.id, 'sub_123');
      expect(deserialized.name, 'Research Agent');
      expect(deserialized.events.length, 1);
      expect(deserialized.result, 'Final findings');
    });

    test('ToolCall supports liveOutput and subagentEvents in JSON', () {
      const tc = ToolCall(
        id: 'call_99',
        name: 'bash',
        arguments: {'command': 'ls -la'},
        status: 'running',
        liveOutput: 'total 32\ndrwxr-xr-x',
      );

      final json = tc.toJson();
      expect(json['liveOutput'], 'total 32\ndrwxr-xr-x');

      final parsed = ToolCall.fromJson(json);
      expect(parsed.liveOutput, 'total 32\ndrwxr-xr-x');
      expect(parsed.isRunning, isTrue);
    });

    test('ChatMessage supports subagentSessions in JSON', () {
      const msg = ChatMessage(
        id: 'msg_100',
        role: 'assistant',
        content: 'Task completed',
        subagentSessions: [
          SubagentSession(
            id: 'sub_1',
            name: 'Coder',
            status: SubagentStatus.done,
          ),
        ],
      );

      final json = msg.toJson();
      expect(json['subagentSessions'], isNotNull);

      final parsed = ChatMessage.fromJson(json);
      expect(parsed.subagentSessions, isNotNull);
      expect(parsed.subagentSessions!.first.name, 'Coder');
      expect(parsed.subagentSessions!.first.status, SubagentStatus.done);
    });
  });

  group('M08 - ChatNotifier Partial & Subagent WS Handlers', () {
    late FakeApiClient apiClient;
    late FakeWsClient wsClient;
    late ChatRepository repository;
    late ChatNotifier notifier;

    setUp(() {
      apiClient = FakeApiClient();
      wsClient = FakeWsClient();
      repository = ChatRepository(apiClient: apiClient, wsClient: wsClient);
      notifier = ChatNotifier(sessionId: 'test-session', repository: repository);
    });

    tearDown(() {
      notifier.dispose();
      wsClient.dispose();
    });

    test('handles tool_execution_update by updating liveOutput in activeToolCalls', () async {
      // 1. Tool execution start
      wsClient.emit({
        'type': 'tool_execution_start',
        'toolCall': {
          'id': 'tool_1',
          'name': 'run_command',
          'arguments': {'cmd': 'npm test'},
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.activeToolCalls.length, 1);
      expect(notifier.state.activeToolCalls.first.id, 'tool_1');
      expect(notifier.state.activeToolCalls.first.liveOutput, isNull);

      // 2. Partial live update arrives
      wsClient.emit({
        'type': 'tool_execution_update',
        'toolCallId': 'tool_1',
        'toolName': 'run_command',
        'partialResult': 'PASS test/auth.test.ts (2.4s)',
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.activeToolCalls.length, 1);
      expect(notifier.state.activeToolCalls.first.liveOutput, 'PASS test/auth.test.ts (2.4s)');
      expect(notifier.state.activeToolCalls.first.status, 'running');

      // 3. Second partial live update updates the tool call
      wsClient.emit({
        'type': 'tool_execution_update',
        'toolCallId': 'tool_1',
        'toolName': 'run_command',
        'partialResult': 'PASS test/auth.test.ts (2.4s)\nPASS test/chat.test.ts (1.1s)',
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(
        notifier.state.activeToolCalls.first.liveOutput,
        'PASS test/auth.test.ts (2.4s)\nPASS test/chat.test.ts (1.1s)',
      );
    });

    test('handles subagent_event by accumulating events and updating status', () async {
      // 1. Subagent event: agent_start
      wsClient.emit({
        'type': 'subagent_event',
        'sessionId': 'test-session',
        'subagentSessionId': 'sub_123',
        'toolCallId': 'call_delegation_1',
        'event': {
          'type': 'agent_start',
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.activeToolCalls.length, 1);
      final tc = notifier.state.activeToolCalls.first;
      expect(tc.id, 'call_delegation_1');
      expect(tc.status, 'running');
      expect(tc.subagentEvents?.length, 1);
      expect(tc.subagentEvents?.first.content, '🚀 Subagent execution started');

      // 2. Subagent event: tool_call_start
      wsClient.emit({
        'type': 'subagent_event',
        'sessionId': 'test-session',
        'subagentSessionId': 'sub_123',
        'toolCallId': 'call_delegation_1',
        'event': {
          'type': 'tool_call_start',
          'name': 'search_code',
          'arguments': {'query': 'auth'},
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final tc2 = notifier.state.activeToolCalls.first;
      expect(tc2.subagentEvents?.length, 2);
      expect(tc2.subagentEvents?[1].content, contains('🔨 Running: search_code'));

      // 3. Subagent event: token chunks concatenated
      wsClient.emit({
        'type': 'subagent_event',
        'sessionId': 'test-session',
        'subagentSessionId': 'sub_123',
        'toolCallId': 'call_delegation_1',
        'event': {
          'type': 'token',
          'text': 'Found 3 ',
        },
      });
      wsClient.emit({
        'type': 'subagent_event',
        'sessionId': 'test-session',
        'subagentSessionId': 'sub_123',
        'toolCallId': 'call_delegation_1',
        'event': {
          'type': 'token',
          'text': 'occurrences.',
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final tc3 = notifier.state.activeToolCalls.first;
      // Should have concatenated the second token to the same log entry
      expect(tc3.subagentEvents?.length, 3);
      expect(tc3.subagentEvents?[2].content, 'Found 3 occurrences.');

      // 4. Subagent event: agent_end
      wsClient.emit({
        'type': 'subagent_event',
        'sessionId': 'test-session',
        'subagentSessionId': 'sub_123',
        'toolCallId': 'call_delegation_1',
        'event': {
          'type': 'agent_end',
          'result': 'Successfully completed search',
        },
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final tcDone = notifier.state.activeToolCalls.first;
      expect(tcDone.status, 'done');
      expect(tcDone.subagentSession?.status, SubagentStatus.done);
      expect(tcDone.subagentSession?.result, 'Successfully completed search');
    });
  });

  group('M08 - ToolCallCard & SubagentLiveView Widget Tests', () {
    testWidgets('ToolCallCard renders LIVE OUTPUT when tool is running with liveOutput', (tester) async {
      const tc = ToolCall(
        id: 'tc-live',
        name: 'bash',
        status: 'running',
        liveOutput: 'Compiling assets...\nBuilt in 350ms',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: ToolCallCard(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.text('bash'), findsOneWidget);
      expect(find.text('Running'), findsOneWidget);
      expect(find.text('LIVE OUTPUT'), findsOneWidget);
      expect(find.textContaining('Compiling assets...'), findsOneWidget);
    });

    testWidgets('ToolCallCard truncates liveOutput exceeding 20 lines with toggle button', (tester) async {
      final manyLines = List.generate(30, (i) => 'Log line #$i').join('\n');
      final tc = ToolCall(
        id: 'tc-long',
        name: 'build_task',
        status: 'running',
        liveOutput: manyLines,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: ToolCallCard(toolCall: tc),
            ),
          ),
        ),
      );

      expect(find.text('LIVE OUTPUT'), findsOneWidget);
      expect(find.text('Ver más (30 líneas)'), findsOneWidget);
      expect(find.textContaining('Log line #0'), findsOneWidget);
      expect(find.textContaining('Log line #19'), findsOneWidget);

      // Tap "Ver más"
      await tester.tap(find.text('Ver más (30 líneas)'));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Ver menos'), findsOneWidget);
      expect(find.textContaining('Log line #29'), findsOneWidget);
    });

    testWidgets('SubagentLiveView renders interactive expandable event log', (tester) async {
      final now = DateTime.now();
      final session = SubagentSession(
        id: 'sub_live',
        name: 'Backend Subagent',
        status: SubagentStatus.running,
        events: [
          SubagentEvent(
            id: 'e1',
            type: 'agent_start',
            content: 'Subagent started',
            timestamp: now,
          ),
          SubagentEvent(
            id: 'e2',
            type: 'tool_start',
            content: 'Running: git status',
            timestamp: now,
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: SubagentLiveView(
                session: session,
                initiallyExpanded: true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Backend Subagent'), findsOneWidget);
      expect(find.text('LIVE'), findsOneWidget);
      expect(find.textContaining('Subagent started'), findsOneWidget);
      expect(find.textContaining('Running: git status'), findsOneWidget);

      // Tap to collapse
      await tester.tap(find.text('Backend Subagent'));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.textContaining('Running: git status'), findsNothing);
    });

    testWidgets('SubagentLiveView completed status shows Done badge and final result', (tester) async {
      final session = SubagentSession(
        id: 'sub_done',
        name: 'Code Reviewer',
        status: SubagentStatus.done,
        events: [
          SubagentEvent(
            id: 'e1',
            type: 'info',
            content: 'Review in progress',
            timestamp: DateTime.now(),
          ),
        ],
        result: 'LGTM! 0 defects found.',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: SubagentLiveView(
                session: session,
                initiallyExpanded: true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Code Reviewer'), findsOneWidget);
      expect(find.text('Done'), findsOneWidget);
      expect(find.text('Result:'), findsOneWidget);
      expect(find.text('LGTM! 0 defects found.'), findsOneWidget);
    });
  });
}
