import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ws/ws_client.dart';

class ConsoleEvent {
  final String id;
  final String type; // 'messages', 'reasoning', 'tools', 'errors', 'system'
  final String source;
  final String content;
  final DateTime timestamp;
  final String? sessionId;

  const ConsoleEvent({
    required this.id,
    required this.type,
    required this.source,
    required this.content,
    required this.timestamp,
    this.sessionId,
  });

  @override
  String toString() =>
      'ConsoleEvent(id: $id, type: $type, source: $source, content: $content, timestamp: $timestamp)';
}

class SessionsConsoleState {
  final List<ConsoleEvent> events;
  final Set<String> activeFilters;
  final bool isFrozen;
  final bool isConnected;

  const SessionsConsoleState({
    this.events = const <ConsoleEvent>[],
    this.activeFilters = const <String>{'messages', 'reasoning', 'tools', 'errors'},
    this.isFrozen = false,
    this.isConnected = false,
  });

  SessionsConsoleState copyWith({
    List<ConsoleEvent>? events,
    Set<String>? activeFilters,
    bool? isFrozen,
    bool? isConnected,
  }) {
    return SessionsConsoleState(
      events: events ?? this.events,
      activeFilters: activeFilters ?? this.activeFilters,
      isFrozen: isFrozen ?? this.isFrozen,
      isConnected: isConnected ?? this.isConnected,
    );
  }

  List<ConsoleEvent> get filteredEvents {
    if (activeFilters.isEmpty) return const [];
    return events.where((e) => activeFilters.contains(e.type)).toList();
  }
}

class SessionsConsoleNotifier extends StateNotifier<SessionsConsoleState> {
  final WsClient _wsClient;
  StreamSubscription? _eventsSubscription;
  StreamSubscription? _statusSubscription;

  static const int maxEvents = 500;

  SessionsConsoleNotifier({
    required WsClient wsClient,
  })  : _wsClient = wsClient,
        super(const SessionsConsoleState()) {
    _init();
  }

  void _init() {
    state = state.copyWith(isConnected: _wsClient.connected);

    _statusSubscription = _wsClient.isConnected.listen((connected) {
      state = state.copyWith(isConnected: connected);
    });

    _eventsSubscription = _wsClient.events.listen((event) {
      _processIncomingEvent(event);
    });
  }

  void _processIncomingEvent(Map<String, dynamic> event) {
    final rawType = event['type']?.toString() ?? 'unknown';
    final sessionId = event['sessionId']?.toString();

    String category = 'messages';
    String content = '';
    String source = sessionId != null
        ? 'Session ${sessionId.substring(0, sessionId.length > 6 ? 6 : sessionId.length)}'
        : 'Global WS';

    if (rawType == 'text_delta' ||
        rawType == 'message_start' ||
        rawType == 'message_update' ||
        rawType == 'message_end' ||
        rawType == 'prompt') {
      category = 'messages';
      content = event['delta']?.toString() ??
          event['content']?.toString() ??
          event['message']?.toString() ??
          '[$rawType]';
    } else if (rawType == 'thinking_delta' ||
        rawType == 'reasoning' ||
        rawType == 'thinking') {
      category = 'reasoning';
      content = event['delta']?.toString() ??
          event['thought']?.toString() ??
          event['content']?.toString() ??
          '[$rawType]';
    } else if (rawType == 'tool_start' ||
        rawType == 'tool_end' ||
        rawType == 'tool_execution_start' ||
        rawType == 'tool_execution_end' ||
        rawType == 'tool_call') {
      category = 'tools';
      final toolName = event['toolName'] ??
          (event['toolCall'] is Map ? event['toolCall']['name'] : null) ??
          event['name'] ??
          'tool';
      final result = event['result']?.toString() ?? '';
      content = 'Tool: $toolName ${result.isNotEmpty ? "-> $result" : ""}';
    } else if (rawType == 'error' ||
        rawType == 'agent_error' ||
        rawType == 'auth_error') {
      category = 'errors';
      content = event['error']?.toString() ?? 'Error occurred';
    } else if (rawType == 'global_log' || rawType == 'log') {
      final logCat = event['category']?.toString();
      if (logCat == 'reasoning') {
        category = 'reasoning';
      } else if (logCat == 'tools' || logCat == 'tool') {
        category = 'tools';
      } else if (logCat == 'error' || logCat == 'errors') {
        category = 'errors';
      } else {
        category = 'messages';
      }
      content = event['message']?.toString() ?? event['content']?.toString() ?? '[$rawType]';
      if (event['source'] != null) {
        source = event['source'].toString();
      }
    } else {
      category = 'messages';
      content = 'Event: $rawType';
    }

    addEvent(
      ConsoleEvent(
        id: 'evt_${DateTime.now().microsecondsSinceEpoch}_${state.events.length}',
        type: category,
        source: source,
        content: content,
        timestamp: DateTime.now(),
        sessionId: sessionId,
      ),
    );
  }

  void addEvent(ConsoleEvent newEvent) {
    final updatedList = List<ConsoleEvent>.from(state.events)..add(newEvent);
    // Ring buffer: enforce max 500 events
    if (updatedList.length > maxEvents) {
      updatedList.removeRange(0, updatedList.length - maxEvents);
    }
    state = state.copyWith(events: updatedList);
  }

  void toggleFilter(String category) {
    final updatedFilters = Set<String>.from(state.activeFilters);
    if (updatedFilters.contains(category)) {
      updatedFilters.remove(category);
    } else {
      updatedFilters.add(category);
    }
    state = state.copyWith(activeFilters: updatedFilters);
  }

  void toggleFreeze() {
    state = state.copyWith(isFrozen: !state.isFrozen);
  }

  void clear() {
    state = state.copyWith(events: const []);
  }

  @override
  void dispose() {
    _eventsSubscription?.cancel();
    _statusSubscription?.cancel();
    super.dispose();
  }
}

final sessionsConsoleNotifierProvider =
    StateNotifierProvider<SessionsConsoleNotifier, SessionsConsoleState>((ref) {
  final wsClient = ref.watch(wsClientProvider);
  return SessionsConsoleNotifier(wsClient: wsClient);
});
