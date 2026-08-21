import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/projects/data/models/project.dart';
import 'package:spaces_mobile/features/projects/data/projects_repository.dart';
import 'package:spaces_mobile/features/projects/ui/project_detail_screen.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';

import '../../helpers/fake_secure_storage.dart';

class MockProjectsRepository implements ProjectsRepository {
  @override
  Future<List<Project>> getProjects() async => [
        const Project(
          id: 'proj-1',
          name: 'Spaces App',
          description: 'Flutter mobile application',
          tag: 'mobile',
        ),
      ];

  @override
  Future<Project> createProject({
    required String name,
    String? description,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
  }) async =>
      Project(id: name, name: name);

  @override
  Future<Project> updateProject(String id, Map<String, dynamic> patch) async =>
      Project(id: id, name: id);

  @override
  Future<void> deleteProject(String id) async {}

  @override
  Future<Map<String, dynamic>> getProjectAssignment(String id) async => {};

  @override
  Future<Map<String, dynamic>> updateProjectAssignment(
    String id,
    Map<String, dynamic> assignment,
  ) async => {};

  @override
  Future<List<Map<String, dynamic>>> getProjectAgents(String id) async => [];
}

class MockAgentsRepository implements AgentsRepository {
  @override
  Future<List<Map<String, dynamic>>> getAvailableModels() async => [
        {'id': 'claude-3-7-sonnet', 'name': 'Claude 3.7 Sonnet'},
      ];

  @override
  Future<List<Map<String, dynamic>>> getAvailableSkills({
    String? entityType,
    String? entityId,
  }) async => [
        {'name': 'web-search', 'description': 'Search web', 'scope': 'global'},
      ];

  @override
  Future<Map<String, dynamic>> getEntityConfig(
    String entityType,
    String entityId,
  ) async => {
        'defaultModel': 'claude-3-7-sonnet',
        'skills': ['web-search'],
      };

  @override
  Future<Map<String, dynamic>> getEntityToolsScope({
    String? entityType,
    String? entityId,
  }) async => {
        'resolved': ['read_file'],
      };

  @override
  Future<Map<String, dynamic>> updateEntityConfig(
    String entityType,
    String entityId,
    Map<String, dynamic> config,
  ) async => {'success': true};

  @override
  Future<Agent> getAgent(String id) async =>
      Agent(id: id, name: id, model: 'claude-3-7-sonnet');

  @override
  Future<List<Agent>> getAgents() async => [];

  @override
  Future<Agent> createAgent(Map<String, dynamic> definition) async =>
      Agent(id: 'new', name: 'New');

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async =>
      Agent(id: id, name: id);

  @override
  Future<void> deleteAgent(String id) async {}

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};
}

class MockSessionsRepository implements SessionsRepository {
  @override
  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
  }) async {
    return const PaginatedSessions(
      items: [
        Session(
          id: 'sess-100',
          title: 'Refactor UI',
          projectId: 'proj-1',
          status: 'active',
        ),
      ],
      total: 1,
      page: 1,
      perPage: 20,
    );
  }

  @override
  Future<Session> createSession(CreateSessionInput input) async =>
      const Session(id: 'new', title: 'New');

  @override
  Future<void> deleteSession(String id) async {}
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

  late MockProjectsRepository mockProjectsRepo;
  late MockAgentsRepository mockAgentsRepo;
  late MockSessionsRepository mockSessionsRepo;
  late FakeWsClient fakeWs;
  late AppStorage storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    mockProjectsRepo = MockProjectsRepository();
    mockAgentsRepo = MockAgentsRepository();
    mockSessionsRepo = MockSessionsRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        appStorageProvider.overrideWithValue(storage),
        projectsRepositoryProvider.overrideWithValue(mockProjectsRepo),
        agentsRepositoryProvider.overrideWithValue(mockAgentsRepo),
        sessionsRepositoryProvider.overrideWithValue(mockSessionsRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: ProjectDetailScreen(projectId: 'proj-1'),
      ),
    );
  }

  group('ProjectDetailScreen Widget Tests', () {
    testWidgets('renders tabs, project sessions, and switches to config tab',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Spaces App'), findsOneWidget);
      expect(find.text('Sessions (1)'), findsOneWidget);
      expect(find.text('Configuration'), findsOneWidget);
      expect(find.text('Refactor UI'), findsOneWidget);

      // Switch to Configuration tab
      await tester.tap(find.text('Configuration'));
      await tester.pumpAndSettle();

      expect(find.text('Project Configuration'), findsOneWidget);
      expect(find.text('Assigned Model'), findsOneWidget);
    });
  });
}
