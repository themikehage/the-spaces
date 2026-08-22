import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/teams/data/models/team.dart';
import 'package:spaces_mobile/features/teams/data/teams_repository.dart';
import 'package:spaces_mobile/features/teams/ui/teams_notifier.dart';

class MockTeamsRepository implements TeamsRepository {
  List<Team> teams = [];
  bool shouldThrow = false;

  @override
  Future<List<Team>> getTeams() async {
    if (shouldThrow) throw Exception('Failed to load teams');
    return teams;
  }

  @override
  Future<Team> getTeam(String id) async {
    if (shouldThrow) throw Exception('Failed to load team');
    return teams.firstWhere((t) => t.id == id,
        orElse: () => Team(id: id, name: id));
  }

  @override
  Future<Team> createTeam(Map<String, dynamic> data) async {
    if (shouldThrow) throw Exception('Failed to create team');
    final created = Team.fromJson(data);
    teams.add(created);
    return created;
  }

  @override
  Future<Team> updateTeam(String id, Map<String, dynamic> patch) async {
    if (shouldThrow) throw Exception('Failed to update team');
    final index = teams.indexWhere((t) => t.id == id);
    final updated = Team(
      id: id,
      name: patch['name']?.toString() ?? 'Updated',
    );
    if (index >= 0) teams[index] = updated;
    return updated;
  }

  @override
  Future<void> deleteTeam(String id) async {
    if (shouldThrow) throw Exception('Failed to delete team');
    teams.removeWhere((t) => t.id == id);
  }

  @override
  Future<List<Session>> getTeamSessions(String teamId) async {
    return [];
  }
}

class MockWsClient implements WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  void emit(Map<String, dynamic> event) => _controller.add(event);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockTeamsRepository repository;
  late MockWsClient wsClient;
  late TeamsNotifier notifier;

  setUp(() {
    repository = MockTeamsRepository();
    repository.teams = [
      const Team(
        id: 'team-arch',
        name: 'Architecture Team',
        description: 'Design architecture',
        mode: 'debate',
      ),
      const Team(
        id: 'team-sec',
        name: 'Security Squad',
        description: 'Security audits',
        mode: 'coordinator',
      ),
    ];
    wsClient = MockWsClient();
    notifier = TeamsNotifier(repository: repository, wsClient: wsClient);
  });

  tearDown(() {
    notifier.dispose();
  });

  group('TeamsNotifier Tests', () {
    test('initial state loads teams from repository', () async {
      await Future<void>.delayed(Duration.zero);

      expect(notifier.state.teams.length, equals(2));
      expect(notifier.state.teams[0].id, equals('team-arch'));
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('search updates searchQuery and filters teams', () async {
      await Future<void>.delayed(Duration.zero);

      notifier.search('security');
      expect(notifier.state.searchQuery, equals('security'));
      expect(notifier.state.filteredTeams.length, equals(1));
      expect(notifier.state.filteredTeams[0].name, equals('Security Squad'));

      notifier.search('');
      expect(notifier.state.filteredTeams.length, equals(2));
    });

    test('createTeam adds team and updates state', () async {
      await Future<void>.delayed(Duration.zero);

      final created = await notifier.createTeam({
        'id': 'team-data',
        'name': 'Data Team',
        'mode': 'round-robin',
      });

      expect(created, isNotNull);
      expect(created?.id, equals('team-data'));
      expect(notifier.state.teams.length, equals(3));
      expect(notifier.state.teams.any((t) => t.id == 'team-data'), isTrue);
    });

    test('updateTeam modifies existing team in state', () async {
      await Future<void>.delayed(Duration.zero);

      final updated = await notifier.updateTeam('team-arch', {
        'name': 'Architecture & Design',
      });

      expect(updated, isNotNull);
      expect(
        notifier.state.teams.firstWhere((t) => t.id == 'team-arch').name,
        equals('Architecture & Design'),
      );
    });

    test('deleteTeam removes team from state', () async {
      await Future<void>.delayed(Duration.zero);

      final success = await notifier.deleteTeam('team-arch');

      expect(success, isTrue);
      expect(notifier.state.teams.length, equals(1));
      expect(notifier.state.teams.any((t) => t.id == 'team-arch'), isFalse);
    });

    test('WS entity-updated event triggers reload', () async {
      await Future<void>.delayed(Duration.zero);

      repository.teams = [
        ...repository.teams,
        const Team(id: 'team-remote', name: 'Remote Created Team'),
      ];

      wsClient.emit({'type': 'entity-updated', 'entityType': 'team'});
      await Future<void>.delayed(Duration.zero);

      expect(notifier.state.teams.length, equals(3));
      expect(notifier.state.teams.any((t) => t.id == 'team-remote'), isTrue);
    });
  });
}
