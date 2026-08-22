import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/workspace/data/models/workspace_file.dart';
import 'package:spaces_mobile/features/workspace/data/workspace_repository.dart';
import 'package:spaces_mobile/features/workspace/ui/widgets/file_preview_sheet.dart';
import 'package:spaces_mobile/features/workspace/ui/widgets/image_lightbox.dart';
import 'package:spaces_mobile/features/workspace/ui/widgets/workspace_file_item.dart';

import '../../helpers/fake_secure_storage.dart';

class MockWorkspaceRepositoryForPreview extends WorkspaceRepository {
  String contentToReturn = '';
  bool throwError = false;

  MockWorkspaceRepositoryForPreview({
    required super.apiClient,
    required super.storage,
  });

  @override
  Future<String> getFileContent({
    required String entityType,
    required String entityId,
    required String path,
  }) async {
    if (throwError) {
      throw Exception('Failed to read file');
    }
    return contentToReturn;
  }

  @override
  String getImageUrl({
    required String entityType,
    required String entityId,
    required String path,
  }) {
    return 'http://localhost:3000/api/workspace/$path?agentId=$entityId&raw=true';
  }

  @override
  Future<String?> getAuthToken() async {
    return 'mock-token';
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockWorkspaceRepositoryForPreview mockRepo;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = AppStorage(secureStorage: FakeSecureStorage(), prefs: prefs);
    final apiClient = ApiClient(storage: storage);
    mockRepo = MockWorkspaceRepositoryForPreview(apiClient: apiClient, storage: storage);
  });

  group('FilePreviewSheet Tests', () {
    testWidgets('loads and displays file content in monospace SelectableText', (tester) async {
      mockRepo.contentToReturn = 'const int x = 42;\nprint(x);';

      const file = WorkspaceFile(
        path: 'main.dart',
        name: 'main.dart',
        size: 120,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceRepositoryProvider.overrideWithValue(mockRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FilePreviewSheet(
                file: file,
                entityType: 'agent',
                entityId: 'agent-1',
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('main.dart'), findsOneWidget);
      expect(find.text('const int x = 42;\nprint(x);'), findsOneWidget);
      expect(find.byType(SelectableText), findsOneWidget);
    });

    testWidgets('shows error and retry button on fetch failure', (tester) async {
      mockRepo.throwError = true;

      const file = WorkspaceFile(
        path: 'broken.txt',
        name: 'broken.txt',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceRepositoryProvider.overrideWithValue(mockRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: FilePreviewSheet(
                file: file,
                entityType: 'agent',
                entityId: 'agent-1',
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Could not load file content'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      // Fix error and retry
      mockRepo.throwError = false;
      mockRepo.contentToReturn = 'Recovered content';

      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(find.text('Recovered content'), findsOneWidget);
    });
  });

  group('ImageLightbox Tests', () {
    testWidgets('renders image lightbox with close button and title', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ImageLightbox(
            imageUrl: 'http://localhost:3000/api/workspace/hero.png',
            fileName: 'hero.png',
          ),
        ),
      );

      expect(find.text('hero.png'), findsOneWidget);
      expect(find.byType(InteractiveViewer), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
    });
  });

  group('WorkspaceFileItem preview triggers', () {
    testWidgets('tapping text file triggers preview bottom sheet', (tester) async {
      mockRepo.contentToReturn = '# Documentation';

      const file = WorkspaceFile(
        path: 'doc.md',
        name: 'doc.md',
        size: 50,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceRepositoryProvider.overrideWithValue(mockRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: WorkspaceFileItem(
                file: file,
                entityType: 'agent',
                entityId: 'agent-1',
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('doc.md'));
      await tester.pumpAndSettle();

      expect(find.byType(FilePreviewSheet), findsOneWidget);
      expect(find.text('# Documentation'), findsOneWidget);
    });
  });
}
