import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/features/projects/data/models/project.dart';
import 'package:spaces_mobile/features/projects/data/projects_repository.dart';
import 'package:spaces_mobile/features/projects/ui/projects_notifier.dart';

class FakeProjectsRepository implements ProjectsRepository {
  List<Project> projectsList = [];
  bool shouldThrow = false;

  @override
  Future<List<Project>> getProjects() async {
    if (shouldThrow) {
      throw Exception('Network error');
    }
    return List.from(projectsList);
  }

  @override
  Future<Project> createProject({
    required String name,
    String? description,
    String? cloneUrl,
    String? avatarUrl,
    String? tag,
  }) async {
    if (shouldThrow) {
      throw Exception('Create error');
    }
    final newProj = Project(
      id: name.toLowerCase().replaceAll(' ', '-'),
      name: name,
      description: description,
      cloneUrl: cloneUrl,
      avatarUrl: avatarUrl,
      tag: tag,
    );
    projectsList.add(newProj);
    return newProj;
  }

  @override
  Future<Project> updateProject(String id, Map<String, dynamic> patch) async {
    if (shouldThrow) {
      throw Exception('Update error');
    }
    final index = projectsList.indexWhere((p) => p.id == id);
    if (index >= 0) {
      final existing = projectsList[index];
      final updated = existing.copyWith(
        name: (patch['name'] as String?) ?? existing.name,
        description: (patch['description'] as String?) ?? existing.description,
      );
      projectsList[index] = updated;
      return updated;
    }
    return Project(id: id, name: id);
  }

  @override
  Future<void> deleteProject(String id) async {
    if (shouldThrow) {
      throw Exception('Delete error');
    }
    projectsList.removeWhere((p) => p.id == id);
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

  void emit(Map<String, dynamic> event) {
    _controller.add(event);
  }

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeProjectsRepository repository;
  late FakeWsClient wsClient;
  late ProjectsNotifier notifier;

  setUp(() {
    repository = FakeProjectsRepository();
    repository.projectsList = [
      const Project(
        id: 'proj-alpha',
        name: 'Project Alpha',
        description: 'First test project',
        tag: 'frontend',
      ),
      const Project(
        id: 'proj-beta',
        name: 'Project Beta',
        description: 'Second test project',
        tag: 'backend',
      ),
    ];
    wsClient = FakeWsClient();
    notifier = ProjectsNotifier(
      repository: repository,
      wsClient: wsClient,
    );
  });

  group('ProjectsNotifier Tests', () {
    test('load populates projects state', () async {
      await notifier.load();

      expect(notifier.state.projects.length, equals(2));
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('search filters projects by name, description, or tag', () async {
      await notifier.load();

      notifier.search('alpha');
      expect(notifier.state.filteredProjects.length, equals(1));
      expect(notifier.state.filteredProjects.first.id, equals('proj-alpha'));

      notifier.search('backend');
      expect(notifier.state.filteredProjects.length, equals(1));
      expect(notifier.state.filteredProjects.first.id, equals('proj-beta'));

      notifier.search('nonexistent');
      expect(notifier.state.filteredProjects.isEmpty, isTrue);

      notifier.search('');
      expect(notifier.state.filteredProjects.length, equals(2));
    });

    test('createProject adds new project to state', () async {
      await notifier.load();

      final created = await notifier.createProject(
        name: 'Project Gamma',
        description: 'Third project',
        tag: 'fullstack',
      );

      expect(created, isNotNull);
      expect(notifier.state.projects.any((p) => p.name == 'Project Gamma'), isTrue);
    });

    test('deleteProject removes project from state', () async {
      await notifier.load();

      final success = await notifier.deleteProject('proj-alpha');

      expect(success, isTrue);
      expect(notifier.state.projects.length, equals(1));
      expect(notifier.state.projects.first.id, equals('proj-beta'));
    });

    test('WsClient entity-updated event reloads projects', () async {
      await notifier.load();
      expect(notifier.state.projects.length, equals(2));

      repository.projectsList.add(
        const Project(id: 'proj-omega', name: 'Project Omega'),
      );

      wsClient.emit({'type': 'entity-updated', 'entityType': 'project'});
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(notifier.state.projects.length, equals(3));
    });
  });
}
