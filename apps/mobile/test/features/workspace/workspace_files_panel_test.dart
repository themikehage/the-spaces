import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/workspace/data/models/workspace_file.dart';
import 'package:spaces_mobile/features/workspace/data/workspace_repository.dart';
import 'package:spaces_mobile/shared/widgets/workspace_files_panel.dart';

import '../../helpers/fake_secure_storage.dart';

class MockWorkspaceRepository extends WorkspaceRepository {
  List<WorkspaceFile> filesToReturn = [];
  bool throwError = false;

  MockWorkspaceRepository({required super.apiClient, required super.storage});

  @override
  Future<List<WorkspaceFile>> getFiles({
    required String entityType,
    required String entityId,
  }) async {
    if (throwError) {
      throw Exception('Server unreachable');
    }
    return filesToReturn;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockWorkspaceRepository mockRepo;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = AppStorage(secureStorage: FakeSecureStorage(), prefs: prefs);
    final apiClient = ApiClient(storage: storage);
    mockRepo = MockWorkspaceRepository(apiClient: apiClient, storage: storage);
  });

  Widget createWidget({
    String entityType = 'agent',
    String entityId = 'agent-123',
    void Function(WorkspaceFile)? onFileTap,
  }) {
    return ProviderScope(
      overrides: [
        workspaceRepositoryProvider.overrideWithValue(mockRepo),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: WorkspaceFilesPanel(
            entityType: entityType,
            entityId: entityId,
            onFileTap: onFileTap,
          ),
        ),
      ),
    );
  }

  group('WorkspaceFilesPanel Widget Tests', () {
    testWidgets('renders empty state when files list is empty', (tester) async {
      mockRepo.filesToReturn = [];

      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Workspace Files'), findsOneWidget);
      expect(find.text('No files in workspace'), findsOneWidget);
    });

    testWidgets('renders list of files and filters with search input', (tester) async {
      mockRepo.filesToReturn = [
        const WorkspaceFile(path: 'README.md', name: 'README.md', size: 1024),
        const WorkspaceFile(path: 'pubspec.yaml', name: 'pubspec.yaml', size: 2048),
        const WorkspaceFile(path: 'assets/icon.png', name: 'icon.png', size: 4096),
      ];

      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('README.md'), findsOneWidget);
      expect(find.text('pubspec.yaml'), findsOneWidget);
      expect(find.text('icon.png'), findsOneWidget);
      expect(find.text('3'), findsOneWidget); // Badge counter

      // Enter search term
      await tester.enterText(find.byType(TextField), 'README');
      await tester.pumpAndSettle();

      expect(find.text('README.md'), findsOneWidget);
      expect(find.text('pubspec.yaml'), findsNothing);
      expect(find.text('icon.png'), findsNothing);
    });

    testWidgets('shows error state with retry button on failure', (tester) async {
      mockRepo.throwError = true;

      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      expect(find.text('Failed to load files'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      // Now fix error and tap retry
      mockRepo.throwError = false;
      mockRepo.filesToReturn = [
        const WorkspaceFile(path: 'index.ts', name: 'index.ts', size: 500),
      ];

      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(find.text('index.ts'), findsOneWidget);
    });

    testWidgets('triggers onFileTap callback on item tap', (tester) async {
      WorkspaceFile? tappedFile;
      mockRepo.filesToReturn = [
        const WorkspaceFile(path: 'app.dart', name: 'app.dart', size: 100),
      ];

      await tester.pumpWidget(createWidget(
        onFileTap: (file) => tappedFile = file,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('app.dart'));
      await tester.pumpAndSettle();

      expect(tappedFile, isNotNull);
      expect(tappedFile!.name, equals('app.dart'));
    });
  });
}
