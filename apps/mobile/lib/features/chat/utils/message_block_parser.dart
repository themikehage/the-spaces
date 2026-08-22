import '../models/message_block.dart';

class _Token {
  final int start;
  final int end;
  final MessageBlock block;

  const _Token({
    required this.start,
    required this.end,
    required this.block,
  });
}

class MessageBlockParser {
  static final RegExp _codeBlockRegex = RegExp(
    r'```([a-zA-Z0-9_\-\.\+]*)\r?\n([\s\S]*?)```',
    multiLine: true,
  );

  static final RegExp _audioTagRegex = RegExp(
    r'<audio\s+([^>]*?)(?:>(?:[\s\S]*?)</audio>|/?>)',
    caseSensitive: false,
  );

  static final RegExp _videoTagRegex = RegExp(
    r'<video\s+([^>]*?)(?:>(?:[\s\S]*?)</video>|/?>)',
    caseSensitive: false,
  );

  static final RegExp _pdfTagRegex = RegExp(
    r'<pdf(?:\s+([^>]*?))?(?:>([\s\S]*?)</pdf>|/?>)',
    caseSensitive: false,
  );

  static final RegExp _htmlTagRegex = RegExp(
    r'<html(?:\s+[^>]*)?>([\s\S]*?)</html>',
    caseSensitive: false,
  );

  static final RegExp _standalonePdfUrlRegex = RegExp(
    r'^(https?://[^\s]+\.pdf(?:\?[^\s]*)?|/[^\s]+\.pdf(?:\?[^\s]*)?)$',
    caseSensitive: false,
  );

  static String? _extractAttribute(String rawAttrs, List<String> attrNames) {
    for (final name in attrNames) {
      final regex = RegExp(
        '$name\\s*=\\s*["\']([^"\']*)["\']',
        caseSensitive: false,
      );
      final match = regex.firstMatch(rawAttrs);
      if (match != null && match.group(1) != null) {
        return match.group(1)!.trim();
      }
    }
    return null;
  }

  static List<MessageBlock> parseBlocks(String content) {
    if (content.trim().isEmpty) {
      return content.isEmpty ? [] : [MarkdownBlockData(content: content)];
    }

    final tokens = <_Token>[];

    // 1. Code blocks
    for (final match in _codeBlockRegex.allMatches(content)) {
      final lang = match.group(1)?.trim();
      final code = match.group(2) ?? '';
      tokens.add(_Token(
        start: match.start,
        end: match.end,
        block: CodeBlockData(
          code: code.endsWith('\n') ? code.substring(0, code.length - 1) : code,
          language: lang?.isNotEmpty == true ? lang : null,
        ),
      ));
    }

    // 2. Audio tags
    for (final match in _audioTagRegex.allMatches(content)) {
      final attrs = match.group(1) ?? '';
      final url = _extractAttribute(attrs, ['src', 'url']);
      if (url != null && url.isNotEmpty) {
        final title = _extractAttribute(attrs, ['title', 'name']);
        final artist = _extractAttribute(attrs, ['artist', 'author']);
        final coverImage = _extractAttribute(attrs, ['coverimage', 'cover_image', 'cover', 'poster']);
        tokens.add(_Token(
          start: match.start,
          end: match.end,
          block: AudioBlockData(
            url: url,
            title: title,
            artist: artist,
            coverImage: coverImage,
          ),
        ));
      }
    }

    // 3. Video tags
    for (final match in _videoTagRegex.allMatches(content)) {
      final attrs = match.group(1) ?? '';
      final url = _extractAttribute(attrs, ['src', 'url']);
      if (url != null && url.isNotEmpty) {
        final title = _extractAttribute(attrs, ['title', 'name']);
        final thumbnail = _extractAttribute(attrs, ['poster', 'thumbnail', 'thumb', 'cover']);
        tokens.add(_Token(
          start: match.start,
          end: match.end,
          block: VideoBlockData(
            url: url,
            title: title,
            thumbnail: thumbnail,
          ),
        ));
      }
    }

    // 4. HTML tags
    for (final match in _htmlTagRegex.allMatches(content)) {
      final htmlContent = match.group(1) ?? '';
      tokens.add(_Token(
        start: match.start,
        end: match.end,
        block: HtmlBlockData(
          html: htmlContent.trim(),
        ),
      ));
    }

    // 5. PDF tags
    for (final match in _pdfTagRegex.allMatches(content)) {
      final attrs = match.group(1) ?? '';
      final innerText = (match.group(2) ?? '').trim();
      final url = _extractAttribute(attrs, ['src', 'url']) ?? (innerText.isNotEmpty ? innerText : null);
      if (url != null && url.isNotEmpty) {
        final title = _extractAttribute(attrs, ['title', 'name']);
        final pageRaw = _extractAttribute(attrs, ['page']);
        final scaleRaw = _extractAttribute(attrs, ['scale']);
        tokens.add(_Token(
          start: match.start,
          end: match.end,
          block: PdfBlockData(
            url: url,
            title: title,
            page: pageRaw != null ? int.tryParse(pageRaw) : null,
            scale: scaleRaw != null ? double.tryParse(scaleRaw) : null,
          ),
        ));
      }
    }

    // Remove overlapping tokens (prioritize earliest/longest)
    tokens.sort((a, b) {
      final cmp = a.start.compareTo(b.start);
      if (cmp != 0) return cmp;
      return (b.end - b.start).compareTo(a.end - a.start);
    });

    final nonOverlapping = <_Token>[];
    int currentEnd = 0;
    for (final token in tokens) {
      if (token.start >= currentEnd) {
        nonOverlapping.add(token);
        currentEnd = token.end;
      }
    }

    // Build final blocks list with intervening markdown blocks
    final result = <MessageBlock>[];
    int cursor = 0;

    for (final token in nonOverlapping) {
      if (token.start > cursor) {
        final segment = content.substring(cursor, token.start);
        _addMarkdownSegments(result, segment);
      }
      result.add(token.block);
      cursor = token.end;
    }

    if (cursor < content.length) {
      final segment = content.substring(cursor);
      _addMarkdownSegments(result, segment);
    }

    return result.isEmpty && content.isNotEmpty
        ? [MarkdownBlockData(content: content)]
        : result;
  }

  static void _addMarkdownSegments(List<MessageBlock> list, String segment) {
    // Check if the segment contains standalone PDF URLs on individual lines
    final lines = segment.split('\n');
    final currentText = StringBuffer();

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];
      final trimmed = line.trim();
      final pdfMatch = _standalonePdfUrlRegex.firstMatch(trimmed);

      if (pdfMatch != null) {
        if (currentText.isNotEmpty) {
          final text = currentText.toString().trim();
          if (text.isNotEmpty) {
            list.add(MarkdownBlockData(content: text));
          }
          currentText.clear();
        }
        final url = pdfMatch.group(1)!;
        final segments = Uri.tryParse(url)?.pathSegments;
        final fileName = (segments != null && segments.isNotEmpty) ? segments.last : 'Document.pdf';
        list.add(PdfBlockData(
          url: url,
          title: fileName,
        ));
      } else {
        if (currentText.isNotEmpty) {
          currentText.write('\n');
        }
        currentText.write(line);
      }
    }

    if (currentText.isNotEmpty) {
      final text = currentText.toString().trim();
      if (text.isNotEmpty) {
        list.add(MarkdownBlockData(content: text));
      }
    }
  }
}
