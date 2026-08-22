class WorkspaceFile {
  final String path;
  final String name;
  final int size;
  final DateTime? modifiedAt;
  final String? mimeType;
  final bool isDirectory;

  const WorkspaceFile({
    required this.path,
    required this.name,
    this.size = 0,
    this.modifiedAt,
    this.mimeType,
    this.isDirectory = false,
  });

  String get extension {
    if (!name.contains('.')) return '';
    return name.split('.').last.toLowerCase();
  }

  bool get isImage {
    if (isDirectory) return false;
    if (mimeType?.toLowerCase().startsWith('image/') == true) return true;
    const imageExtensions = {
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
      'bmp',
      'ico',
      'heic',
      'avif',
    };
    return imageExtensions.contains(extension);
  }

  bool get isText {
    if (isDirectory) return false;
    if (mimeType?.toLowerCase().startsWith('text/') == true) return true;
    if (mimeType?.toLowerCase().contains('json') == true) return true;
    if (mimeType?.toLowerCase().contains('xml') == true) return true;
    if (mimeType?.toLowerCase().contains('javascript') == true) return true;
    if (mimeType?.toLowerCase().contains('typescript') == true) return true;

    const textExtensions = {
      'md',
      'txt',
      'dart',
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'yaml',
      'yml',
      'py',
      'sh',
      'bash',
      'zsh',
      'env',
      'toml',
      'html',
      'htm',
      'css',
      'scss',
      'sass',
      'less',
      'xml',
      'csv',
      'log',
      'sql',
      'c',
      'cpp',
      'h',
      'hpp',
      'go',
      'rs',
      'java',
      'kt',
      'kts',
      'swift',
      'rb',
      'php',
      'ini',
      'conf',
      'dockerfile',
      'makefile',
      'lock',
    };
    return textExtensions.contains(extension);
  }

  String get sizeFormatted {
    if (isDirectory) return '';
    if (size <= 0) return '0 B';
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) {
      final kb = size / 1024;
      return kb < 10 ? '${kb.toStringAsFixed(1)} KB' : '${kb.round()} KB';
    }
    if (size < 1024 * 1024 * 1024) {
      final mb = size / (1024 * 1024);
      return '${mb.toStringAsFixed(1)} MB';
    }
    final gb = size / (1024 * 1024 * 1024);
    return '${gb.toStringAsFixed(1)} GB';
  }

  factory WorkspaceFile.fromJson(Map<String, dynamic> json) {
    final rawPath = (json['path'] ?? json['name'] ?? '') as String;
    final rawName = (json['name'] ?? rawPath.split('/').last) as String;
    final isDir = json['isDirectory'] == true || json['type'] == 'directory';

    int parsedSize = 0;
    if (json['size'] is num) {
      parsedSize = (json['size'] as num).toInt();
    }

    DateTime? parsedModified;
    final rawDate = json['modifiedAt'] ?? json['lastModified'] ?? json['updatedAt'];
    if (rawDate is String && rawDate.isNotEmpty) {
      parsedModified = DateTime.tryParse(rawDate);
    }

    return WorkspaceFile(
      path: rawPath,
      name: rawName.isEmpty ? rawPath : rawName,
      size: parsedSize,
      modifiedAt: parsedModified,
      mimeType: json['mimeType'] as String?,
      isDirectory: isDir,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'path': path,
      'name': name,
      'size': size,
      if (modifiedAt != null) 'modifiedAt': modifiedAt!.toIso8601String(),
      if (mimeType != null) 'mimeType': mimeType,
      'isDirectory': isDirectory,
    };
  }

  WorkspaceFile copyWith({
    String? path,
    String? name,
    int? size,
    DateTime? modifiedAt,
    String? mimeType,
    bool? isDirectory,
  }) {
    return WorkspaceFile(
      path: path ?? this.path,
      name: name ?? this.name,
      size: size ?? this.size,
      modifiedAt: modifiedAt ?? this.modifiedAt,
      mimeType: mimeType ?? this.mimeType,
      isDirectory: isDirectory ?? this.isDirectory,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WorkspaceFile &&
        other.path == path &&
        other.name == name &&
        other.size == size &&
        other.modifiedAt == modifiedAt &&
        other.mimeType == mimeType &&
        other.isDirectory == isDirectory;
  }

  @override
  int get hashCode =>
      path.hashCode ^
      name.hashCode ^
      size.hashCode ^
      modifiedAt.hashCode ^
      mimeType.hashCode ^
      isDirectory.hashCode;
}
