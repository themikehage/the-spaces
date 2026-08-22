enum FileType {
  inlineImage,
  inlineText,
  uploadRequired,
}

class FileClassifier {
  static const int maxInlineTextSizeBytes = 100 * 1024; // 100 KB

  static const Set<String> imageExtensions = {
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
  };

  static const Set<String> textExtensions = {
    'js',
    'ts',
    'jsx',
    'tsx',
    'py',
    'go',
    'rs',
    'java',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'sh',
    'bash',
    'sql',
    'yaml',
    'yml',
    'json',
    'md',
    'txt',
    'ini',
    'conf',
    'cfg',
    'xml',
    'css',
    'html',
    'htm',
    'dart',
    'env',
    'svg',
    'toml',
    'lock',
    'log',
  };

  static const Map<String, String> _languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'sh': 'bash',
    'bash': 'bash',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'md': 'markdown',
    'txt': 'text',
    'xml': 'xml',
    'css': 'css',
    'html': 'html',
    'htm': 'html',
    'dart': 'dart',
    'toml': 'toml',
    'svg': 'xml',
  };

  static String getExtension(String path) {
    final cleanPath = path.split('?').first;
    final fileName = cleanPath.split('/').last.split('\\').last;
    if (!fileName.contains('.')) return '';
    return fileName.split('.').last.toLowerCase();
  }

  static FileType classifyFile(String path, int sizeBytes) {
    final ext = getExtension(path);

    if (imageExtensions.contains(ext)) {
      return FileType.inlineImage;
    }

    if (textExtensions.contains(ext) && sizeBytes <= maxInlineTextSizeBytes) {
      return FileType.inlineText;
    }

    return FileType.uploadRequired;
  }

  static String getMarkdownLanguage(String fileName) {
    final ext = getExtension(fileName);
    return _languageMap[ext] ?? '';
  }

  static String formatFileSize(int bytes) {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
