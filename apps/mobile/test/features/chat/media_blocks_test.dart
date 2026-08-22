import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_blocks/audio_block.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_blocks/code_block.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_blocks/html_block.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_blocks/pdf_block.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_blocks/video_block.dart';

void main() {
  group('Media Blocks Widget Tests', () {
    testWidgets('renders AudioBlockWidget with title and artist', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: AudioBlockWidget(
              url: 'https://example.com/sound.mp3',
              title: 'Epic Podcast',
              artist: 'Host',
            ),
          ),
        ),
      );

      expect(find.text('Epic Podcast'), findsOneWidget);
      expect(find.text('Host'), findsOneWidget);
      expect(find.text('Play / Open Audio'), findsOneWidget);
      expect(find.byIcon(Icons.audiotrack_rounded), findsOneWidget);
    });

    testWidgets('renders VideoBlockWidget with title and play button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: VideoBlockWidget(
              url: 'https://example.com/video.mp4',
              title: 'Product Demo',
            ),
          ),
        ),
      );

      expect(find.text('Product Demo'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
      expect(find.byIcon(Icons.open_in_new_rounded), findsOneWidget);
    });

    testWidgets('renders PdfBlockWidget with title, page info, and open button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: PdfBlockWidget(
              url: 'https://example.com/doc.pdf',
              title: 'Annual Report',
              page: 5,
              scale: 1.0,
            ),
          ),
        ),
      );

      expect(find.text('Annual Report'), findsOneWidget);
      expect(find.text('Page 5'), findsOneWidget);
      expect(find.text('Open PDF Document'), findsOneWidget);
      expect(find.byIcon(Icons.picture_as_pdf_rounded), findsOneWidget);
    });

    testWidgets('renders HtmlBlockWidget and toggles RAW / FORMATTED mode', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: HtmlBlockWidget(
              html: '<h1>Hello World</h1><p>Test paragraph</p>',
            ),
          ),
        ),
      );

      expect(find.text('HTML PREVIEW'), findsOneWidget);
      expect(find.text('Hello World Test paragraph'), findsOneWidget);
      expect(find.text('RAW'), findsOneWidget);

      await tester.tap(find.text('RAW'));
      await tester.pumpAndSettle();

      expect(find.text('FORMATTED'), findsOneWidget);
      expect(find.text('<h1>Hello World</h1><p>Test paragraph</p>'), findsOneWidget);
    });

    testWidgets('renders CodeBlockWidget with language badge and code text', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: CodeBlockWidget(
              code: "final x = 42;\nprint(x);",
              language: 'dart',
            ),
          ),
        ),
      );

      expect(find.text('DART'), findsOneWidget);
      expect(find.text("final x = 42;\nprint(x);"), findsOneWidget);
      expect(find.byIcon(Icons.code_rounded), findsOneWidget);
      expect(find.byIcon(Icons.copy_rounded), findsOneWidget);
    });
  });
}
