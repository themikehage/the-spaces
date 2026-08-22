import 'package:freezed_annotation/freezed_annotation.dart';

part 'subagent_session.freezed.dart';

enum SubagentStatus {
  running,
  done,
  error;

  static SubagentStatus fromString(String? val) {
    if (val == null) return SubagentStatus.running;
    switch (val.toLowerCase()) {
      case 'done':
      case 'completed':
      case 'finished':
      case 'success':
        return SubagentStatus.done;
      case 'error':
      case 'failed':
        return SubagentStatus.error;
      case 'running':
      default:
        return SubagentStatus.running;
    }
  }
}

@freezed
class SubagentEvent with _$SubagentEvent {
  const SubagentEvent._();

  const factory SubagentEvent({
    required String id,
    required String type,
    required String content,
    required DateTime timestamp,
  }) = _SubagentEvent;

  factory SubagentEvent.fromJson(Map<String, dynamic> json) {
    final rawTimestamp = json['timestamp'] ?? json['createdAt'];
    DateTime ts;
    if (rawTimestamp is num) {
      ts = DateTime.fromMillisecondsSinceEpoch(rawTimestamp.toInt());
    } else if (rawTimestamp is String) {
      ts = DateTime.tryParse(rawTimestamp) ?? DateTime.now();
    } else {
      ts = DateTime.now();
    }

    return SubagentEvent(
      id: (json['id'] ?? '${ts.millisecondsSinceEpoch}_${json['type'] ?? 'evt'}').toString(),
      type: (json['type'] ?? 'info').toString(),
      content: (json['content'] ?? json['text'] ?? json['message'] ?? '').toString(),
      timestamp: ts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

@freezed
class SubagentSession with _$SubagentSession {
  const SubagentSession._();

  const factory SubagentSession({
    required String id,
    required String name,
    @Default(SubagentStatus.running) SubagentStatus status,
    @Default(<SubagentEvent>[]) List<SubagentEvent> events,
    String? result,
  }) = _SubagentSession;

  factory SubagentSession.fromJson(Map<String, dynamic> json) {
    final rawEvents = json['events'];
    final List<SubagentEvent> parsedEvents = [];
    if (rawEvents is List) {
      for (final e in rawEvents) {
        if (e is Map<String, dynamic>) {
          parsedEvents.add(SubagentEvent.fromJson(e));
        }
      }
    }

    return SubagentSession(
      id: (json['id'] ?? json['subagentSessionId'] ?? json['toolCallId'] ?? '').toString(),
      name: (json['name'] ?? json['subagentName'] ?? 'Subagent').toString(),
      status: SubagentStatus.fromString(json['status']?.toString()),
      events: parsedEvents,
      result: json['result']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'status': status.name,
      'events': events.map((e) => e.toJson()).toList(),
      if (result != null) 'result': result,
    };
  }
}
