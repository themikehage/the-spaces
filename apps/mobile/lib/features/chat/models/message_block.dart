sealed class MessageBlock {
  const MessageBlock();
}

class MarkdownBlockData extends MessageBlock {
  final String content;

  const MarkdownBlockData({required this.content});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkdownBlockData &&
          runtimeType == other.runtimeType &&
          content == other.content;

  @override
  int get hashCode => content.hashCode;

  @override
  String toString() => 'MarkdownBlockData(content: $content)';
}

class AudioBlockData extends MessageBlock {
  final String url;
  final String? title;
  final String? artist;
  final String? coverImage;

  const AudioBlockData({
    required this.url,
    this.title,
    this.artist,
    this.coverImage,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AudioBlockData &&
          runtimeType == other.runtimeType &&
          url == other.url &&
          title == other.title &&
          artist == other.artist &&
          coverImage == other.coverImage;

  @override
  int get hashCode => Object.hash(url, title, artist, coverImage);

  @override
  String toString() =>
      'AudioBlockData(url: $url, title: $title, artist: $artist, coverImage: $coverImage)';
}

class VideoBlockData extends MessageBlock {
  final String url;
  final String? title;
  final String? thumbnail;

  const VideoBlockData({
    required this.url,
    this.title,
    this.thumbnail,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is VideoBlockData &&
          runtimeType == other.runtimeType &&
          url == other.url &&
          title == other.title &&
          thumbnail == other.thumbnail;

  @override
  int get hashCode => Object.hash(url, title, thumbnail);

  @override
  String toString() =>
      'VideoBlockData(url: $url, title: $title, thumbnail: $thumbnail)';
}

class PdfBlockData extends MessageBlock {
  final String url;
  final String? title;
  final int? page;
  final double? scale;

  const PdfBlockData({
    required this.url,
    this.title,
    this.page,
    this.scale,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PdfBlockData &&
          runtimeType == other.runtimeType &&
          url == other.url &&
          title == other.title &&
          page == other.page &&
          scale == other.scale;

  @override
  int get hashCode => Object.hash(url, title, page, scale);

  @override
  String toString() =>
      'PdfBlockData(url: $url, title: $title, page: $page, scale: $scale)';
}

class HtmlBlockData extends MessageBlock {
  final String html;
  final String? title;

  const HtmlBlockData({
    required this.html,
    this.title,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HtmlBlockData &&
          runtimeType == other.runtimeType &&
          html == other.html &&
          title == other.title;

  @override
  int get hashCode => Object.hash(html, title);

  @override
  String toString() => 'HtmlBlockData(html: $html, title: $title)';
}

class CodeBlockData extends MessageBlock {
  final String code;
  final String? language;

  const CodeBlockData({
    required this.code,
    this.language,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CodeBlockData &&
          runtimeType == other.runtimeType &&
          code == other.code &&
          language == other.language;

  @override
  int get hashCode => Object.hash(code, language);

  @override
  String toString() => 'CodeBlockData(code: $code, language: $language)';
}
