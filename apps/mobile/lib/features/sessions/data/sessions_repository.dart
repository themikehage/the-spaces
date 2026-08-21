import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/create_session_input.dart';
import 'models/paginated_sessions.dart';
import 'models/session.dart';

class SessionsRepository {
  final ApiClient _apiClient;

  SessionsRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'perPage': limit,
    };

    if (status != null && status.isNotEmpty && status.toLowerCase() != 'all') {
      queryParams['status'] = status.toLowerCase();
    }

    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    final response = await _apiClient.get<dynamic>(
      '/api/sessions',
      queryParameters: queryParams,
    );

    if (response is Map<String, dynamic>) {
      return PaginatedSessions.fromJson(response);
    } else if (response is List) {
      return PaginatedSessions.fromJson({'sessions': response, 'total': response.length});
    }

    return const PaginatedSessions();
  }

  Future<Session> createSession(CreateSessionInput input) async {
    final response = await _apiClient.post<dynamic>(
      '/api/sessions',
      data: input.toJson(),
    );

    if (response is Map<String, dynamic>) {
      return Session.fromJson(response);
    }

    throw StateError('Unexpected response format when creating session');
  }

  Future<void> deleteSession(String id) async {
    await _apiClient.delete<dynamic>('/api/sessions/$id');
  }
}

final sessionsRepositoryProvider = Provider<SessionsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SessionsRepository(apiClient: apiClient);
});
