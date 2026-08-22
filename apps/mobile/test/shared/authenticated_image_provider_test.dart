import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/shared/providers/authenticated_image_provider.dart';

void main() {
  group('AuthenticatedImageProvider Tests', () {
    test('equals and hashCode return true for same configuration', () {
      const provider1 = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/test.png',
        token: 'secret-token-123',
        scale: 1.0,
      );

      const provider2 = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/test.png',
        token: 'secret-token-123',
        scale: 1.0,
      );

      expect(provider1, equals(provider2));
      expect(provider1.hashCode, equals(provider2.hashCode));
    });

    test('equals and hashCode differentiate different tokens and urls', () {
      const provider1 = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/test.png',
        token: 'secret-token-123',
      );

      const provider2 = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/test.png',
        token: 'different-token',
      );

      const provider3 = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/other.png',
        token: 'secret-token-123',
      );

      expect(provider1, isNot(equals(provider2)));
      expect(provider1, isNot(equals(provider3)));
    });

    test('obtainKey returns synchronously resolved provider key', () async {
      const provider = AuthenticatedImageProvider(
        url: 'http://localhost:3000/api/workspace/test.png',
        token: 'secret-token-123',
      );

      final key = await provider.obtainKey(ImageConfiguration.empty);
      expect(key, equals(provider));
    });
  });
}
