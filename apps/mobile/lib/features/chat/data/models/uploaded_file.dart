class UploadedFile {
  final String path;
  final String url;
  final int sizeBytes;
  final String name;
  final String extension;
  final String? mimeType;

  const UploadedFile({
    required this.path,
    required this.url,
    required this.sizeBytes,
    required this.name,
    required this.extension,
    this.mimeType,
  });

  factory UploadedFile.fromJson(Map<String, dynamic> json, {String? baseUrl}) {
    final rawPath = (json['path'] ?? '').toString();
    final name = (json['name'] ?? rawPath.split('/').last).toString();
    final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
    final rawUrl = json['url']?.toString();
    final effectiveUrl = rawUrl != null && rawUrl.isNotEmpty
        ? rawUrl
        : (baseUrl != null ? '$baseUrl/$rawPath' : rawPath);

    return UploadedFile(
      path: rawPath,
      url: effectiveUrl,
      sizeBytes: (json['size'] as num?)?.toInt() ?? 0,
      name: name,
      extension: ext,
      mimeType: json['mimeType']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'path': path,
      'url': url,
      'size': sizeBytes,
      'name': name,
      'extension': extension,
      if (mimeType != null) 'mimeType': mimeType,
    };
  }

  String get formattedSize {
    if (sizeBytes <= 0) return '0 B';
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  bool get isImage {
    final ext = extension.toLowerCase();
    return ext == 'jpg' || ext == 'jpeg' || ext == 'png' || ext == 'gif' || ext == 'webp';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UploadedFile &&
          runtimeType == other.runtimeType &&
          path == other.path &&
          url == other.url &&
          sizeBytes == other.sizeBytes &&
          name == other.name &&
          extension == other.extension &&
          mimeType == other.mimeType;

  @override
  int get hashCode =>
      path.hashCode ^
      url.hashCode ^
      sizeBytes.hashCode ^
      name.hashCode ^
      extension.hashCode ^
      mimeType.hashCode;

  @override
  String toString() =>
      'UploadedFile(path: $path, url: $url, sizeBytes: $sizeBytes, name: $name, extension: $extension)';
}
