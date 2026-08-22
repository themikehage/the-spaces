import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/attached_file_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';

void main() {
  group('AttachedFileCard Widget Tests', () {
    testWidgets('renders file name, extension badge, and path', (tester) async {
      bool downloadTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: AttachedFileCard(
              path: 'assets/uploads/architecture_design.pdf',
              onDownload: () => downloadTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('architecture_design.pdf'), findsOneWidget);
      expect(find.text('PDF'), findsOneWidget);
      expect(find.text('assets/uploads/architecture_design.pdf'), findsOneWidget);

      final downloadBtn = find.byType(IconButton);
      expect(downloadBtn, findsOneWidget);

      await tester.tap(downloadBtn);
      await tester.pump();

      expect(downloadTapped, isTrue);
    });
  });

  group('MessageBubble Attachment Parsing Tests', () {
    testWidgets('parses [Attached File: ...] in user bubble and renders AttachedFileCard', (tester) async {
      const userMsg = ChatMessage(
        id: 'user_1',
        role: 'user',
        content:
            'Please review this document:\n[Attached File: assets/uploads/specs.pdf] (I have uploaded this file to your workspace at: assets/uploads/specs.pdf)',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: MessageBubble(
                message: userMsg,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(AttachedFileCard), findsOneWidget);
      expect(find.text('specs.pdf'), findsOneWidget);
      expect(find.text('PDF'), findsOneWidget);

      // Verify raw attached file markdown is not displayed in the bubble
      expect(find.textContaining('[Attached File:'), findsNothing);
      expect(find.textContaining('I have uploaded this file'), findsNothing);
      expect(find.textContaining('Please review this document:'), findsOneWidget);
    });
  });
}
