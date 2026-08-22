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
import 'package:spaces_mobile/features/teams/ui/team_detail_screen.dart';

class MockTeamsRepository implements TeamsRepository {
  final Team team = const Team(
    id: 'team-arch',
    name: 'Architecture Team',
    description: 'System design and architecture',
    mode: 'debate',
    teamType: 'Orchestration',
    maxRounds: 8,
    members: [
      TeamMember(agentId: 'agent-lead', role: 'lead', title: 'Principal Architect'),
      TeamMember(agentId: 'agent-coder', role: 'member', title: 'Senior Developer'),
    ],
  );

  final List<Session> sessions = [
    const Session(
      id: 'session-101',
      title: 'Sprint 1 Planning',
      teamId: 'team-arch',
      status: 'idle',
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
    ),
  ];

  @override
  Future<List<Team>> getTeams() async => [team];

  @override
  Future<Team> getTeam(String id) async => team;

  @override
  Future<Team> createTeam(Map<String, dynamic> data) async => Team.fromJson(data);

  @override
  Future<Team> updateTeam(String id, Map<String, dynamic> patch) async => team;

  @override
  Future<void> deleteTeam(String id) async {}

  @override
  Future<List<Session>> getTeamSessions(String teamId) async => sessions;
}

class MockAgentsRepository implements AgentsRepository {
  @override
  Future<List<Agent>> getAgents() async => [
        const Agent(id: 'agent-lead', name: 'Lead Architect', status: 'ready'),
        const Agent(id: 'agent-coder', name: 'Frontend Dev', status: 'ready'),
      ];

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};

  @override
  Future<Map<String, dynamic>> getEntityConfig(String entityType, String entityId) async => {
        'defaultModel': 'claude-3-7-sonnet',
      };

  @override
  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async => {'success': true};

  @override
  Future<List<Map<String, dynamic>>> getAvailableModels() async => [
        {'id': 'claude-3-7-sonnet', 'name': 'Claude 3.7 Sonnet'},
      ];

  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async => [];

  @override
  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async => {};

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

  late MockTeamsRepository mockTeamsRepo;
  late MockAgentsRepository mockAgentsRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockTeamsRepo = MockTeamsRepository();
    mockAgentsRepo = MockAgentsRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        teamsRepositoryProvider.overrideWithValue(mockTeamsRepo),
        agentsRepositoryProvider.overrideWithValue(mockAgentsRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: TeamDetailScreen(teamId: 'team-arch'),
      ),
    );
  }

  group('TeamDetailScreen Widget Tests', () {
    testWidgets('renders team details, members, and tabs', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Architecture Team'), findsWidgets);
      expect(find.text('System design and architecture'), findsOneWidget);
      expect(find.text('Max Rounds: 8'), findsOneWidget);
      expect(find.text('Lead Architect'), findsOneWidget);
      expect(find.text('Frontend Dev'), findsOneWidget);
      expect(find.text('Principal Architect'), findsOneWidget);
      expect(find.text('LEAD'), findsOneWidget);
      expect(find.text('MEMBER'), findsOneWidget);
    });

    testWidgets('can switch to sessions tab and see team sessions', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();

      expect(find.text('Sprint 1 Planning'), findsOneWidget);
      expect(find.text('Status: idle'), findsOneWidget);
    });

    testWidgets('can switch to config tab and see EntityConfigEditor',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Config'));
      await tester.pumpAndSettle();

      expect(find.text('Team Configuration Overrides'), findsOneWidget);
    });
  });
}
