import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/chat/models/message_block.dart';
import 'package:spaces_mobile/features/chat/utils/message_block_parser.dart';

void main() {
  group('MessageBlockParser Unit Tests', () {
    test('returns empty list for empty content', () {
      expect(MessageBlockParser.parseBlocks(''), isEmpty);
    });

    test('parses pure markdown text', () {
      const content = 'Hello world! This is a simple *markdown* message.';
      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 1);
      expect(blocks.first, isA<MarkdownBlockData>());
      expect((blocks.first as MarkdownBlockData).content, content);
    });

    test('parses code blocks with language', () {
      const content = '''
Here is the implementation:
```dart
void main() {
  print('Hello Spaces');
}
```
Let me know what you think!
''';

      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 3);
      expect(blocks[0], isA<MarkdownBlockData>());
      expect((blocks[0] as MarkdownBlockData).content, 'Here is the implementation:');

      expect(blocks[1], isA<CodeBlockData>());
      final codeBlock = blocks[1] as CodeBlockData;
      expect(codeBlock.language, 'dart');
      expect(codeBlock.code, "void main() {\n  print('Hello Spaces');\n}");

      expect(blocks[2], isA<MarkdownBlockData>());
      expect((blocks[2] as MarkdownBlockData).content, 'Let me know what you think!');
    });

    test('parses audio tags with attributes', () {
      const content = '''
Listen to this track:
<audio src="https://cdn.example.com/podcast.mp3" title="Episode 1" artist="Spaces Host" coverImage="https://cdn.example.com/cover.jpg"></audio>
Enjoy!
''';

      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 3);
      expect(blocks[0], isA<MarkdownBlockData>());
      expect(blocks[1], isA<AudioBlockData>());

      final audio = blocks[1] as AudioBlockData;
      expect(audio.url, 'https://cdn.example.com/podcast.mp3');
      expect(audio.title, 'Episode 1');
      expect(audio.artist, 'Spaces Host');
      expect(audio.coverImage, 'https://cdn.example.com/cover.jpg');

      expect(blocks[2], isA<MarkdownBlockData>());
    });

    test('parses video tags with poster', () {
      const content = '''
Check out this video demo:
<video src="/api/workspace/demo.mp4" poster="/api/workspace/thumb.jpg" title="Demo Reel"/>
''';

      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 2);
      expect(blocks[0], isA<MarkdownBlockData>());
      expect(blocks[1], isA<VideoBlockData>());

      final video = blocks[1] as VideoBlockData;
      expect(video.url, '/api/workspace/demo.mp4');
      expect(video.thumbnail, '/api/workspace/thumb.jpg');
      expect(video.title, 'Demo Reel');
    });

    test('parses pdf tags and standalone pdf url lines', () {
      const content = '''
Here is the requested specification document:
<pdf src="/api/workspace/architecture.pdf" title="Architecture Spec" page="2" scale="1.5"></pdf>

Also refer to the reference manual:
https://example.com/manual.pdf
''';

      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 4);
      expect(blocks[0], isA<MarkdownBlockData>());

      expect(blocks[1], isA<PdfBlockData>());
      final pdf1 = blocks[1] as PdfBlockData;
      expect(pdf1.url, '/api/workspace/architecture.pdf');
      expect(pdf1.title, 'Architecture Spec');
      expect(pdf1.page, 2);
      expect(pdf1.scale, 1.5);

      expect(blocks[2], isA<MarkdownBlockData>());

      expect(blocks[3], isA<PdfBlockData>());
      final pdf2 = blocks[3] as PdfBlockData;
      expect(pdf2.url, 'https://example.com/manual.pdf');
      expect(pdf2.title, 'manual.pdf');
    });

    test('parses html blocks', () {
      const content = '''
Resulting HTML markup:
<html>
<div class="header"><h1>Welcome</h1></div>
</html>
End of preview.
''';

      final blocks = MessageBlockParser.parseBlocks(content);

      expect(blocks.length, 3);
      expect(blocks[0], isA<MarkdownBlockData>());

      expect(blocks[1], isA<HtmlBlockData>());
      final html = blocks[1] as HtmlBlockData;
      expect(html.html, '<div class="header"><h1>Welcome</h1></div>');

      expect(blocks[2], isA<MarkdownBlockData>());
    });
  });
}
