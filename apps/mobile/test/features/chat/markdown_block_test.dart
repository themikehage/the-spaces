import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/markdown_block.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';

void main() {
  group('MarkdownBlock Widget Tests', () {
    testWidgets('renders markdown paragraph and bold text properly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MarkdownBlock(
              data: 'Hello **World** from Spaces Agent!',
            ),
          ),
        ),
      );

      expect(find.textContaining('Hello World from Spaces Agent!'), findsOneWidget);
    });

    testWidgets('renders authenticated image provider for workspace images when token is present', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MarkdownBlock(
              data: '![Diagram](/api/workspace/diagram.png)',
              authToken: 'test-bearer-token',
            ),
          ),
        ),
      );

      final imageFinder = find.byType(Image);
      expect(imageFinder, findsOneWidget);

      final imageWidget = tester.widget<Image>(imageFinder);
      expect(imageWidget.image, isA<AuthenticatedImageProvider>());
      final authProvider = imageWidget.image as AuthenticatedImageProvider;
      expect(authProvider.token, equals('test-bearer-token'));
      expect(authProvider.url, contains('/api/workspace/diagram.png'));
    });

    testWidgets('renders network image for external image URLs', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MarkdownBlock(
              data: '![External](https://example.com/banner.png)',
              authToken: 'test-bearer-token',
            ),
          ),
        ),
      );

      final imageFinder = find.byType(Image);
      expect(imageFinder, findsOneWidget);

      final imageWidget = tester.widget<Image>(imageFinder);
      expect(imageWidget.image, isA<NetworkImage>());
      final networkProvider = imageWidget.image as NetworkImage;
      expect(networkProvider.url, equals('https://example.com/banner.png'));
    });

    testWidgets('renders fallback network image for workspace image when token is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MarkdownBlock(
              data: '![Diagram](/api/workspace/diagram.png)',
              authToken: null,
            ),
          ),
        ),
      );

      final imageFinder = find.byType(Image);
      expect(imageFinder, findsOneWidget);

      final imageWidget = tester.widget<Image>(imageFinder);
      expect(imageWidget.image, isA<NetworkImage>());
    });
  });
}
