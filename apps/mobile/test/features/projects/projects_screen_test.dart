import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/projects/data/models/project.dart';
import 'package:spaces_mobile/features/projects/data/projects_repository.dart';
import 'package:spaces_mobile/features/projects/ui/projects_screen.dart';

class MockProjectsRepository implements ProjectsRepository {
  List<Project> projects = [
    const Project(
      id: 'proj-1',
      name: 'Spaces App',
      description: 'Flutter mobile application',
      tag: 'mobile',
      sessionCount: 3,
    ),
    const Project(
      id: 'proj-2',
      name: 'Server Backend',
      description: 'Bun + Hono API',
      tag: 'backend',
      sessionCount: 1,
    ),
  ];

  @override
  Future<List<Project>> getProjects() async => List.from(projects);

  @override
  Future<Project> createProject({
    required String name,
    String? description,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
  }) async {
    final p = Project(
      id: name.toLowerCase().replaceAll(' ', '-'),
      name: name,
      description: description,
      cloneUrl: cloneUrl,
    );
    projects.add(p);
    return p;
  }

  @override
  Future<Project> updateProject(String id, Map<String, dynamic> patch) async =>
      Project(id: id, name: id);

  @override
  Future<void> deleteProject(String id) async {
    projects.removeWhere((p) => p.id == id);
  }

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

  late MockProjectsRepository mockRepo;
  late FakeWsClient fakeWs;

  setUp(() {
    mockRepo = MockProjectsRepository();
    fakeWs = FakeWsClient();
  });

  Widget createWidget() {
    return ProviderScope(
      overrides: [
        projectsRepositoryProvider.overrideWithValue(mockRepo),
        wsClientProvider.overrideWithValue(fakeWs),
      ],
      child: const MaterialApp(
        home: ProjectsScreen(),
      ),
    );
  }

  group('ProjectsScreen Widget Tests', () {
    testWidgets('renders projects list and search bar', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Projects'), findsOneWidget);
      expect(find.byKey(const Key('projects_search_input')), findsOneWidget);
      expect(find.text('Spaces App'), findsOneWidget);
      expect(find.text('Server Backend'), findsOneWidget);
      expect(find.text('3 sessions'), findsOneWidget);
      expect(find.byKey(const Key('create_project_fab')), findsOneWidget);
    });

    testWidgets('search input filters displayed projects', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final searchInput = find.byKey(const Key('projects_search_input'));
      await tester.enterText(searchInput, 'backend');
      await tester.pumpAndSettle();

      expect(find.text('Server Backend'), findsOneWidget);
      expect(find.text('Spaces App'), findsNothing);
    });

    testWidgets('tapping FAB opens create project modal', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final fab = find.byKey(const Key('create_project_fab'));
      await tester.tap(fab);
      await tester.pumpAndSettle();

      expect(find.text('Create New Project'), findsOneWidget);
      expect(find.byKey(const Key('create_project_name_input')), findsOneWidget);
      expect(find.byKey(const Key('create_project_desc_input')), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('create_project_name_input')),
        'Alpha Project',
      );
      await tester.tap(find.byKey(const Key('create_project_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Alpha Project'), findsOneWidget);
    });
  });
}
