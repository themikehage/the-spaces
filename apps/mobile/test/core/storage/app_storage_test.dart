import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';

import '../../helpers/fake_secure_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);
  });

  group('AppStorage Tests', () {
    test('secureWrite and secureRead for authToken', () async {
      await storage.secureWrite(StorageKey.authToken, 'jwt-xyz-123');
      final token = await storage.secureRead(StorageKey.authToken);
      expect(token, equals('jwt-xyz-123'));
    });

    test('secureDelete removes stored key', () async {
      await storage.secureWrite(StorageKey.authToken, 'jwt-xyz-123');
      await storage.secureDelete(StorageKey.authToken);
      final token = await storage.secureRead(StorageKey.authToken);
      expect(token, isNull);
    });

    test('prefWrite and prefRead for preferences', () async {
      await storage.prefWrite(StorageKey.themeMode, 'dark');
      final mode = storage.prefRead(StorageKey.themeMode);
      expect(mode, equals('dark'));
    });
  });
}
