import '../../utils/file_classifier.dart';

class ChatAttachment {
  final String localPath;
  final String name;
  final int sizeBytes;
  final FileType type;
  final bool isUploading;
  final double uploadProgress;
  final String? serverPath;
  final String? textContent;
  final String? error;

  const ChatAttachment({
    required this.localPath,
    required this.name,
    required this.sizeBytes,
    required this.type,
    this.isUploading = false,
    this.uploadProgress = 0.0,
    this.serverPath,
    this.textContent,
    this.error,
  });

  String get extension => FileClassifier.getExtension(localPath);

  String get formattedSize => FileClassifier.formatFileSize(sizeBytes);

  bool get isImage => type == FileType.inlineImage;

  ChatAttachment copyWith({
    String? localPath,
    String? name,
    int? sizeBytes,
    FileType? type,
    bool? isUploading,
    double? uploadProgress,
    String? serverPath,
    String? textContent,
    String? error,
  }) {
    return ChatAttachment(
      localPath: localPath ?? this.localPath,
      name: name ?? this.name,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      type: type ?? this.type,
      isUploading: isUploading ?? this.isUploading,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      serverPath: serverPath ?? this.serverPath,
      textContent: textContent ?? this.textContent,
      error: error ?? this.error,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatAttachment &&
          runtimeType == other.runtimeType &&
          localPath == other.localPath &&
          name == other.name &&
          sizeBytes == other.sizeBytes &&
          type == other.type &&
          isUploading == other.isUploading &&
          uploadProgress == other.uploadProgress &&
          serverPath == other.serverPath &&
          textContent == other.textContent &&
          error == other.error;

  @override
  int get hashCode =>
      localPath.hashCode ^
      name.hashCode ^
      sizeBytes.hashCode ^
      type.hashCode ^
      isUploading.hashCode ^
      uploadProgress.hashCode ^
      serverPath.hashCode ^
      textContent.hashCode ^
      error.hashCode;

  @override
  String toString() =>
      'ChatAttachment(name: $name, size: $sizeBytes, type: $type, isUploading: $isUploading, serverPath: $serverPath)';
}
