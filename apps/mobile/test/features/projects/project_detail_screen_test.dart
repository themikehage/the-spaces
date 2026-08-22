import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/agents/data/agents_repository.dart';
import 'package:spaces_mobile/features/agents/data/models/agent.dart';
import 'package:spaces_mobile/features/chat/data/chat_repository.dart';
import 'package:spaces_mobile/features/chat/data/models/ai_model.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/projects/data/models/project.dart';
import 'package:spaces_mobile/features/projects/data/projects_repository.dart';
import 'package:spaces_mobile/features/projects/ui/project_detail_screen.dart';
import 'package:spaces_mobile/features/sessions/data/models/create_session_input.dart';
import 'package:spaces_mobile/features/sessions/data/models/paginated_sessions.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/data/sessions_repository.dart';
import 'package:spaces_mobile/shared/widgets/entity_chat_screen.dart';
import 'package:spaces_mobile/shared/widgets/entity_page_indicator.dart';

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
      const Agent(id: 'new', name: 'New');

  @override
  Future<Agent> updateAgent(String id, Map<String, dynamic> patch) async =>
      Agent(id: id, name: id);

  @override
  Future<void> deleteAgent(String id) async {}

  @override
  Future<Map<String, dynamic>> getResolvedConfig(String agentId) async => {};
}

class MockSessionsRepository implements SessionsRepository {
  List<Session> sessions = [
    const Session(
      id: 'sess-proj-1',
      title: 'Refactor UI',
      projectId: 'proj-1',
      status: 'active',
    ),
  ];

  @override
  Future<PaginatedSessions> getSessions({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
    String? agentId,
    String? projectId,
    bool archived = false,
  }) async {
    final filtered = sessions.where((s) {
      if (agentId != null && s.agentId != agentId) return false;
      if (projectId != null && s.projectId != projectId) return false;
      return true;
    }).toList();

    return PaginatedSessions(
      items: filtered,
      total: filtered.length,
      page: 1,
      perPage: limit,
    );
  }

  @override
  Future<void> archiveSession(String id) async {}

  @override
  Future<void> unarchiveSession(String id) async {}

  @override
  Future<Session> createSession(CreateSessionInput input) async {
    final newSession = Session(
      id: 'sess-${sessions.length + 1}',
      title: input.title,
      agentId: input.agentId,
      projectId: input.projectId,
      status: 'active',
    );
    sessions.add(newSession);
    return newSession;
  }

  @override
  Future<void> deleteSession(String id) async {
    sessions.removeWhere((s) => s.id == id);
  }
}

class MockChatRepository extends Fake implements ChatRepository {
  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async => [];

  @override
  Future<List<AiModel>> getModels() async => [];

  @override
  Stream<Map<String, dynamic>> sessionEvents(String sessionId) =>
      const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get events => const Stream.empty();

  @override
  Future<void> connectToSession(String sessionId) async {}

  @override
  void subscribeToSession(String sessionId) {}

  @override
  void unsubscribeFromSession(String sessionId) {}
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
  late MockChatRepository mockChatRepo;
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
    mockChatRepo = MockChatRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        appStorageProvider.overrideWithValue(storage),
        projectsRepositoryProvider.overrideWithValue(mockProjectsRepo),
        agentsRepositoryProvider.overrideWithValue(mockAgentsRepo),
        sessionsRepositoryProvider.overrideWithValue(mockSessionsRepo),
        chatRepositoryProvider.overrideWithValue(mockChatRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: ProjectDetailScreen(projectId: 'proj-1'),
      ),
    );
  }

  group('ProjectDetailScreen Entity-First Widget Tests', () {
    testWidgets('renders EntityChatScreen with PageView, AppBar, Sessions button, and Config button',
        (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.byType(EntityChatScreen), findsOneWidget);
      expect(find.text('Spaces App'), findsOneWidget);
      expect(find.byType(EntityPageIndicator), findsOneWidget);
      expect(find.byKey(const Key('entity_chat_sessions_button')), findsOneWidget);
      expect(find.byKey(const Key('entity_chat_config_button')), findsOneWidget);
    });

    testWidgets('tap on config button opens EntityConfigSheet', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('entity_chat_config_button')));
      await tester.pumpAndSettle();

      expect(find.text('Project Settings'), findsOneWidget);
      expect(find.text('Assigned Model'), findsOneWidget);
      expect(find.byKey(const Key('entity_config_sheet_delete_button')), findsOneWidget);
    });

    testWidgets('tap on Sessions button opens EntitySessionsSheet', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('entity_chat_sessions_button')));
      await tester.pumpAndSettle();

      expect(find.text('Refactor UI'), findsOneWidget);
      expect(find.byKey(const Key('entity_sessions_new_session_button')), findsOneWidget);
    });
  });
}
