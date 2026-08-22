import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/teams/data/models/team.dart';
import 'package:spaces_mobile/features/teams/data/teams_repository.dart';
import 'package:spaces_mobile/features/teams/ui/teams_screen.dart';

class MockTeamsRepository implements TeamsRepository {
  List<Team> teams = [
    const Team(
      id: 'team-arch',
      name: 'Architecture Team',
      description: 'System design and architecture',
      mode: 'debate',
      teamType: 'Orchestration',
      sessionCount: 3,
      members: [
        TeamMember(agentId: 'agent-lead', role: 'lead'),
      ],
    ),
    const Team(
      id: 'team-sec',
      name: 'Security Squad',
      description: 'Audits and vulnerability fixes',
      mode: 'coordinator',
      teamType: 'Autonomous',
      sessionCount: 1,
      members: [],
    ),
  ];

  @override
  Future<List<Team>> getTeams() async => List.from(teams);

  @override
  Future<Team> getTeam(String id) async =>
      teams.firstWhere((t) => t.id == id, orElse: () => Team(id: id, name: id));

  @override
  Future<Team> createTeam(Map<String, dynamic> data) async {
    final t = Team.fromJson(data);
    teams.add(t);
    return t;
  }

  @override
  Future<Team> updateTeam(String id, Map<String, dynamic> patch) async =>
      Team(id: id, name: id);

  @override
  Future<void> deleteTeam(String id) async {
    teams.removeWhere((t) => t.id == id);
  }

  @override
  Future<List<Session>> getTeamSessions(String teamId) async => [];
}

class MockAgentsRepo implements AgentsRepository {
  @override
  Future<List<Agent>> getAgents() async => [
        const Agent(id: 'agent-lead', name: 'Lead Agent', status: 'ready'),
      ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeWsClient extends WsClient {
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  @override
  Stream<Map<String, dynamic>> get events => _controller.stream;

  @override
  Future<void> connect({String? sessionId, String? token}) async {}

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockTeamsRepository mockRepo;
  late MockAgentsRepo mockAgentsRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockRepo = MockTeamsRepository();
    mockAgentsRepo = MockAgentsRepo();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        teamsRepositoryProvider.overrideWithValue(mockRepo),
        agentsRepositoryProvider.overrideWithValue(mockAgentsRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: TeamsScreen(),
      ),
    );
  }

  group('TeamsScreen Widget Tests', () {
    testWidgets('renders list of teams and search input', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Teams'), findsOneWidget);
      expect(find.byKey(const Key('teams_search_input')), findsOneWidget);
      expect(find.text('Architecture Team'), findsOneWidget);
      expect(find.text('Security Squad'), findsOneWidget);
      expect(find.text('DEBATE'), findsOneWidget);
      expect(find.byKey(const Key('create_team_fab')), findsOneWidget);
    });

    testWidgets('search input filters displayed teams', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final searchInput = find.byKey(const Key('teams_search_input'));
      await tester.enterText(searchInput, 'security');
      await tester.pumpAndSettle();

      expect(find.text('Security Squad'), findsOneWidget);
      expect(find.text('Architecture Team'), findsNothing);
    });

    testWidgets('tapping FAB opens create team modal and creates team',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final fab = find.byKey(const Key('create_team_fab'));
      await tester.tap(fab);
      await tester.pumpAndSettle();

      expect(find.text('Create New Team'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('create_team_id_input')),
        'team-frontend',
      );
      await tester.enterText(
        find.byKey(const Key('create_team_name_input')),
        'Frontend Squad',
      );
      await tester.tap(find.byKey(const Key('create_team_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Frontend Squad'), findsOneWidget);
    });
  });
}
