import 'package:freezed_annotation/freezed_annotation.dart';

import 'session.dart';

part 'paginated_sessions.freezed.dart';

@freezed
class PaginatedSessions with _$PaginatedSessions {
  const PaginatedSessions._();

  const factory PaginatedSessions({
    @Default(<Session>[]) List<Session> items,
    @Default(0) int total,
    @Default(1) int page,
    @Default(20) int perPage,
  }) = _PaginatedSessions;

  bool get hasMore => items.isNotEmpty && (page * perPage) < total;

  factory PaginatedSessions.fromJson(Map<String, dynamic> json) {
    final rawSessions = json['sessions'];
    final List<Session> list;
    if (rawSessions is List) {
      list = rawSessions
          .whereType<Map<String, dynamic>>()
          .map(Session.fromJson)
          .toList();
    } else {
      list = const [];
    }

    final total = json['total'] is num
        ? (json['total'] as num).toInt()
        : list.length;
    final page = json['page'] is num ? (json['page'] as num).toInt() : 1;
    final perPage = json['perPage'] is num
        ? (json['perPage'] as num).toInt()
        : (list.isNotEmpty ? list.length : 20);

    return PaginatedSessions(
      items: list,
      total: total,
      page: page,
      perPage: perPage,
    );
  }
}
