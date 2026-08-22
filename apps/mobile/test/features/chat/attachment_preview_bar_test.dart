import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_attachment.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/attachment_preview_bar.dart';
import 'package:spaces_mobile/features/chat/utils/file_classifier.dart';

void main() {
  group('AttachmentPreviewBar Widget Tests', () {
    testWidgets('renders nothing when attachments list is empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AttachmentPreviewBar(
              attachments: const [],
              onRemove: (_) {},
            ),
          ),
        ),
      );

      expect(find.byType(ListView), findsNothing);
    });

    testWidgets('renders attachment chips with name, size and extension', (tester) async {
      int? removedIndex;

      final attachments = [
        const ChatAttachment(
          localPath: '/tmp/notes.md',
          name: 'notes.md',
          sizeBytes: 2048,
          type: FileType.inlineText,
        ),
        const ChatAttachment(
          localPath: '/tmp/report.pdf',
          name: 'report.pdf',
          sizeBytes: 150000,
          type: FileType.uploadRequired,
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AttachmentPreviewBar(
              attachments: attachments,
              onRemove: (idx) => removedIndex = idx,
            ),
          ),
        ),
      );

      expect(find.text('notes.md'), findsOneWidget);
      expect(find.text('report.pdf'), findsOneWidget);
      expect(find.text('MD · 2.0 KB'), findsOneWidget);
      expect(find.text('PDF · 146.5 KB'), findsOneWidget);

      final removeBtn = find.byKey(const Key('attachment_remove_0'));
      expect(removeBtn, findsOneWidget);

      await tester.tap(removeBtn);
      await tester.pump();

      expect(removedIndex, equals(0));
    });

    testWidgets('renders uploading progress state when isUploading is true', (tester) async {
      final attachments = [
        const ChatAttachment(
          localPath: '/tmp/large_file.zip',
          name: 'large_file.zip',
          sizeBytes: 10 * 1024 * 1024,
          type: FileType.uploadRequired,
          isUploading: true,
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AttachmentPreviewBar(
              attachments: attachments,
              onRemove: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('large_file.zip'), findsOneWidget);
      expect(find.text('Uploading...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
