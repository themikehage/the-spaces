import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/teams/data/teams_repository.dart';

import '../../helpers/fake_secure_storage.dart';

class MockHttpAdapter implements HttpClientAdapter {
  ResponseBody? responseBody;
  DioException? exceptionToThrow;
  RequestOptions? lastRequestOptions;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequestOptions = options;
    if (exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return responseBody ??
        ResponseBody.fromString(
          jsonEncode({'ok': true}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late MockHttpAdapter mockAdapter;
  late Dio dio;
  late ApiClient apiClient;
  late TeamsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;

    apiClient = ApiClient(storage: storage, dio: dio);
    repository = TeamsRepository(apiClient: apiClient);
  });

  group('TeamsRepository Tests', () {
    test('getTeams returns list of teams on 200 OK', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'teams': [
            {
              'id': 'team-dev',
              'name': 'Dev Team',
              'description': 'Main engineering team',
              'mode': 'debate',
              'teamType': 'Orchestration',
              'sessionCount': 4,
              'members': [
                {'agentId': 'agent-architect', 'role': 'lead'},
                {'agentId': 'agent-coder', 'role': 'member'},
              ],
            },
            {
              'id': 'team-qa',
              'name': 'QA Team',
              'mode': 'round-robin',
              'teamType': 'Autonomous',
              'members': [
                {'agentId': 'agent-tester', 'role': 'lead'},
              ],
            }
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final result = await repository.getTeams();

      expect(result.length, equals(2));
      expect(result[0].id, equals('team-dev'));
      expect(result[0].name, equals('Dev Team'));
      expect(result[0].members.length, equals(2));
      expect(result[0].members[0].agentId, equals('agent-architect'));
      expect(result[0].members[0].role, equals('lead'));
      expect(result[0].sessionCount, equals(4));
      expect(result[1].name, equals('QA Team'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/teams'));
    });

    test('getTeam returns single team', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'team-dev',
          'name': 'Dev Team',
          'mode': 'debate',
          'teamType': 'Orchestration',
          'maxRounds': 10,
          'members': [
            {'agentId': 'agent-architect', 'role': 'lead'},
          ],
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final team = await repository.getTeam('team-dev');

      expect(team.id, equals('team-dev'));
      expect(team.name, equals('Dev Team'));
      expect(team.maxRounds, equals(10));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/teams/team-dev'));
    });

    test('createTeam posts team data', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'team-new',
          'name': 'New AI Team',
          'mode': 'coordinator',
        }),
        201,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final created = await repository.createTeam({
        'id': 'team-new',
        'name': 'New AI Team',
        'mode': 'coordinator',
      });

      expect(created.id, equals('team-new'));
      expect(created.name, equals('New AI Team'));
      expect(mockAdapter.lastRequestOptions?.method, equals('POST'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/teams'));
    });

    test('updateTeam patches team', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'id': 'team-dev',
          'name': 'Updated Dev Team',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final updated = await repository.updateTeam(
        'team-dev',
        {'name': 'Updated Dev Team'},
      );

      expect(updated.id, equals('team-dev'));
      expect(updated.name, equals('Updated Dev Team'));
      expect(mockAdapter.lastRequestOptions?.method, equals('PATCH'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/teams/team-dev'));
    });

    test('deleteTeam sends DELETE', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({'ok': true}),
        204,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      await repository.deleteTeam('team-dev');

      expect(mockAdapter.lastRequestOptions?.method, equals('DELETE'));
      expect(mockAdapter.lastRequestOptions?.path, equals('/api/teams/team-dev'));
    });

    test('getTeamSessions returns sessions filtered by teamId', () async {
      mockAdapter.responseBody = ResponseBody.fromString(
        jsonEncode({
          'sessions': [
            {
              'id': 'session-1',
              'title': 'Team Dev Session 1',
              'teamId': 'team-dev',
              'status': 'idle',
              'createdAt': '2026-08-20T10:00:00Z',
              'updatedAt': '2026-08-20T10:00:00Z',
            },
            {
              'id': 'session-2',
              'title': 'Other Session',
              'teamId': 'team-other',
              'status': 'idle',
              'createdAt': '2026-08-20T10:00:00Z',
              'updatedAt': '2026-08-20T10:00:00Z',
            },
          ]
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

      final sessions = await repository.getTeamSessions('team-dev');

      expect(sessions.length, equals(1));
      expect(sessions[0].id, equals('session-1'));
      expect(sessions[0].teamId, equals('team-dev'));
    });
  });
}
