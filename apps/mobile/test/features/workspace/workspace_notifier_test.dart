import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/workspace/data/models/workspace_file.dart';
import 'package:spaces_mobile/features/workspace/data/workspace_repository.dart';
import 'package:spaces_mobile/features/workspace/ui/workspace_notifier.dart';

import '../../helpers/fake_secure_storage.dart';

class FakeWorkspaceRepository extends WorkspaceRepository {
  List<WorkspaceFile> mockFiles = [];
  bool shouldThrow = false;

  FakeWorkspaceRepository({
    required super.apiClient,
    required super.storage,
  });

  @override
  Future<List<WorkspaceFile>> getFiles({
    required String entityType,
    required String entityId,
  }) async {
    if (shouldThrow) {
      throw Exception('Network connection failed');
    }
    return mockFiles;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('WorkspaceNotifier Tests', () {
    late FakeWorkspaceRepository fakeRepo;
    const testArgs = WorkspaceArgs(entityType: 'agent', entityId: 'agent-1');

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final storage = AppStorage(secureStorage: FakeSecureStorage(), prefs: prefs);
      final apiClient = ApiClient(storage: storage);
      fakeRepo = FakeWorkspaceRepository(apiClient: apiClient, storage: storage);
    });

    test('initial state loads files and updates state', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'README.md', name: 'README.md', size: 100),
        const WorkspaceFile(path: 'main.dart', name: 'main.dart', size: 200),
      ];

      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);

      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
      expect(notifier.state.files.length, equals(2));
      expect(notifier.state.filteredFiles.length, equals(2));
    });

    test('filters files client-side using setQuery', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'docs/guide.md', name: 'guide.md', size: 100),
        const WorkspaceFile(path: 'src/index.ts', name: 'index.ts', size: 200),
        const WorkspaceFile(path: 'assets/hero.png', name: 'hero.png', size: 300),
      ];

      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.filteredFiles.length, equals(3));

      notifier.setQuery('guide');
      expect(notifier.state.filteredFiles.length, equals(1));
      expect(notifier.state.filteredFiles.first.name, equals('guide.md'));

      notifier.setQuery('.ts');
      expect(notifier.state.filteredFiles.length, equals(1));
      expect(notifier.state.filteredFiles.first.name, equals('index.ts'));

      notifier.setQuery('nonexistent');
      expect(notifier.state.filteredFiles.isEmpty, isTrue);

      notifier.setQuery('');
      expect(notifier.state.filteredFiles.length, equals(3));
    });

    test('handles error on repository failure', () async {
      fakeRepo.shouldThrow = true;

      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, contains('Network connection failed'));
      expect(notifier.state.files, isEmpty);
    });

    test('refresh reloads files successfully', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'initial.txt', name: 'initial.txt'),
      ];

      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(notifier.state.files.length, equals(1));

      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'initial.txt', name: 'initial.txt'),
        const WorkspaceFile(path: 'new_file.txt', name: 'new_file.txt'),
      ];

      await notifier.refresh();
      expect(notifier.state.files.length, equals(2));
    });
  });
}
