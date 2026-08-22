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
  Map<String, List<WorkspaceFile>> mockChildren = {};
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

  @override
  Future<List<WorkspaceFile>> listChildren({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    if (shouldThrow) {
      throw Exception('Failed to load children');
    }
    return mockChildren[path] ?? [];
  }

  @override
  Future<WorkspaceFile> createFile({
    required String entityType,
    required String entityId,
    required String path,
    String content = '',
  }) async {
    if (shouldThrow) throw Exception('Create failed');
    final file = WorkspaceFile(path: path, name: path.split('/').last);
    mockFiles.add(file);
    return file;
  }

  @override
  Future<WorkspaceFile> createFolder({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    if (shouldThrow) throw Exception('Create folder failed');
    final folder = WorkspaceFile(path: path, name: path.split('/').last, isDirectory: true);
    mockFiles.add(folder);
    return folder;
  }

  @override
  Future<WorkspaceFile> renameFile({
    required String entityType,
    required String entityId,
    required String oldPath,
    required String newPath,
  }) async {
    if (shouldThrow) throw Exception('Rename failed');
    mockFiles.removeWhere((f) => f.path == oldPath);
    final file = WorkspaceFile(path: newPath, name: newPath.split('/').last);
    mockFiles.add(file);
    return file;
  }

  @override
  Future<void> deleteFile({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    if (shouldThrow) throw Exception('Delete failed');
    mockFiles.removeWhere((f) => f.path == path);
  }

  @override
  Future<WorkspaceFile> saveFile({
    required String entityType,
    required String entityId,
    required String path,
    required String content,
  }) async {
    if (shouldThrow) throw Exception('Save failed');
    return WorkspaceFile(path: path, name: path.split('/').last, size: content.length);
  }

  @override
  Future<List<int>> downloadFileBytes({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    if (shouldThrow) throw Exception('Download failed');
    return [1, 2, 3, 4];
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

    test('toggles folder and lazy-loads children', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'docs', name: 'docs', isDirectory: true),
      ];
      fakeRepo.mockChildren = {
        'docs': [
          const WorkspaceFile(path: 'docs/intro.md', name: 'intro.md'),
        ],
      };

      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isExpanded('docs'), isFalse);

      await notifier.toggleFolder('docs');
      expect(notifier.state.isExpanded('docs'), isTrue);
      expect(notifier.state.getChildren('docs').length, equals(1));
      expect(notifier.state.getChildren('docs').first.name, equals('intro.md'));

      await notifier.toggleFolder('docs');
      expect(notifier.state.isExpanded('docs'), isFalse);
    });

    test('executes createFile successfully', () async {
      fakeRepo.mockFiles = [];
      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      final success = await notifier.createFile('notes.txt', content: 'hello');
      expect(success, isTrue);
      expect(notifier.state.files.any((f) => f.path == 'notes.txt'), isTrue);
    });

    test('executes createFolder successfully', () async {
      fakeRepo.mockFiles = [];
      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      final success = await notifier.createFolder('src');
      expect(success, isTrue);
      expect(notifier.state.files.any((f) => f.path == 'src' && f.isDirectory), isTrue);
    });

    test('executes renameFile successfully', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'old.md', name: 'old.md'),
      ];
      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      final success = await notifier.renameFile('old.md', 'new.md');
      expect(success, isTrue);
      expect(notifier.state.files.any((f) => f.path == 'new.md'), isTrue);
      expect(notifier.state.files.any((f) => f.path == 'old.md'), isFalse);
    });

    test('executes deleteFile successfully', () async {
      fakeRepo.mockFiles = [
        const WorkspaceFile(path: 'delete_me.txt', name: 'delete_me.txt'),
      ];
      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      final success = await notifier.deleteFile('delete_me.txt');
      expect(success, isTrue);
      expect(notifier.state.files.isEmpty, isTrue);
    });

    test('downloads file bytes', () async {
      final notifier = WorkspaceNotifier(repository: fakeRepo, args: testArgs);
      await Future.delayed(const Duration(milliseconds: 50));

      final bytes = await notifier.downloadFile('sample.png');
      expect(bytes, equals([1, 2, 3, 4]));
    });
  });
}
