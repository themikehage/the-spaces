import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/chat/utils/file_classifier.dart';

void main() {
  group('FileClassifier Tests', () {
    test('classifies image files as inlineImage regardless of size', () {
      expect(
        FileClassifier.classifyFile('photos/vacation.jpg', 500000),
        equals(FileType.inlineImage),
      );
      expect(
        FileClassifier.classifyFile('screenshots/avatar.png', 50000),
        equals(FileType.inlineImage),
      );
      expect(
        FileClassifier.classifyFile('images/diagram.webp', 1024 * 1024),
        equals(FileType.inlineImage),
      );
    });

    test('classifies text and code files <= 100 KB as inlineText', () {
      expect(
        FileClassifier.classifyFile('src/main.ts', 5000),
        equals(FileType.inlineText),
      );
      expect(
        FileClassifier.classifyFile('lib/widget.dart', 99 * 1024),
        equals(FileType.inlineText),
      );
      expect(
        FileClassifier.classifyFile('config.json', 100 * 1024),
        equals(FileType.inlineText),
      );
      expect(
        FileClassifier.classifyFile('README.md', 2048),
        equals(FileType.inlineText),
      );
    });

    test('classifies text and code files > 100 KB as uploadRequired', () {
      expect(
        FileClassifier.classifyFile('bundle.js', (100 * 1024) + 1),
        equals(FileType.uploadRequired),
      );
      expect(
        FileClassifier.classifyFile('large_dataset.json', 500 * 1024),
        equals(FileType.uploadRequired),
      );
    });

    test('classifies non-text, non-image binary files as uploadRequired', () {
      expect(
        FileClassifier.classifyFile('report.pdf', 50 * 1024),
        equals(FileType.uploadRequired),
      );
      expect(
        FileClassifier.classifyFile('archive.zip', 2 * 1024 * 1024),
        equals(FileType.uploadRequired),
      );
      expect(
        FileClassifier.classifyFile('video.mp4', 10 * 1024 * 1024),
        equals(FileType.uploadRequired),
      );
    });

    test('maps file extensions to correct markdown languages', () {
      expect(FileClassifier.getMarkdownLanguage('app.ts'), equals('typescript'));
      expect(FileClassifier.getMarkdownLanguage('script.py'), equals('python'));
      expect(FileClassifier.getMarkdownLanguage('query.sql'), equals('sql'));
      expect(FileClassifier.getMarkdownLanguage('main.dart'), equals('dart'));
      expect(FileClassifier.getMarkdownLanguage('document.md'), equals('markdown'));
      expect(FileClassifier.getMarkdownLanguage('unknown.xyz'), equals(''));
    });

    test('formats file sizes accurately into B, KB, and MB', () {
      expect(FileClassifier.formatFileSize(0), equals('0 B'));
      expect(FileClassifier.formatFileSize(512), equals('512 B'));
      expect(FileClassifier.formatFileSize(1024 * 50), equals('50.0 KB'));
      expect(FileClassifier.formatFileSize((1.5 * 1024 * 1024).toInt()), equals('1.5 MB'));
    });
  });
}
