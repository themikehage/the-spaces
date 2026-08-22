import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/settings/data/models/app_settings.dart';
import 'package:spaces_mobile/features/settings/data/models/provider_config.dart';
import 'package:spaces_mobile/features/settings/data/settings_repository.dart';
import 'package:spaces_mobile/features/settings/ui/settings_notifier.dart';

import '../../helpers/fake_secure_storage.dart';

class FakeSettingsRepository implements SettingsRepository {
  AppSettings currentSettings = const AppSettings(
    responseLanguage: 'en',
    memoryEnabled: true,
    memoryAutoStore: false,
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
  );

  List<ProviderConfig> currentProviders = [
    const ProviderConfig(
      id: 'openai',
      name: 'OpenAI',
      isConfigured: false,
      models: ['gpt-4o'],
    ),
    const ProviderConfig(
      id: 'anthropic',
      name: 'Anthropic',
      isConfigured: false,
      models: ['claude-3-5-sonnet'],
    ),
  ];

  Map<String, dynamic>? lastUpdatePatch;
  String? lastSavedProviderId;
  String? lastSavedApiKey;
  String? lastClearedProviderId;

  @override
  Future<AppSettings> getSettings() async {
    return currentSettings;
  }

  @override
  Future<AppSettings> updateSettings(Map<String, dynamic> patch) async {
    lastUpdatePatch = patch;
    if (patch.containsKey('responseLanguage')) {
      currentSettings = currentSettings.copyWith(
        responseLanguage: patch['responseLanguage'].toString(),
      );
    }
    if (patch.containsKey('memoryEnabled')) {
      currentSettings = currentSettings.copyWith(
        memoryEnabled: patch['memoryEnabled'] == true,
      );
    }
    if (patch.containsKey('defaultProvider')) {
      currentSettings = currentSettings.copyWith(
        defaultProvider: patch['defaultProvider']?.toString(),
      );
    }
    return currentSettings;
  }

  @override
  Future<List<ProviderConfig>> getProviders() async {
    return currentProviders;
  }

  @override
  Future<void> saveProviderCredentials(String providerId, String apiKey) async {
    lastSavedProviderId = providerId;
    lastSavedApiKey = apiKey;
    currentProviders = currentProviders.map((p) {
      if (p.id == providerId) return p.copyWith(isConfigured: true);
      return p;
    }).toList();
  }

  @override
  Future<void> clearProviderCredentials(String providerId) async {
    lastClearedProviderId = providerId;
    currentProviders = currentProviders.map((p) {
      if (p.id == providerId) return p.copyWith(isConfigured: false);
      return p;
    }).toList();
  }

  @override
  Future<String?> getSavedProviderApiKey(String providerId) async {
    return lastSavedApiKey;
  }
}

class FakeAuthRepository implements AuthRepository {
  bool loggedOut = false;

  @override
  Future<AuthResponse> login(String username, String password) async {
    return const AuthResponse(
      user: AuthUser(username: 'test', email: 'test@test.com'),
      token: 'tok',
    );
  }

  @override
  Future<void> logout() async {
    loggedOut = true;
  }

  @override
  Future<String?> getToken() async => 'tok';

  @override
  Future<String?> getUserId() async => 'u1';

  @override
  Future<String?> getUsername() async => 'test';

  @override
  Future<bool> isAuthenticated() async => true;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppStorage storage;
  late FakeSettingsRepository fakeSettingsRepo;
  late FakeAuthRepository fakeAuthRepo;
  late ProviderContainer container;

  setUp(() async {
    SharedPreferences.setMockInitialValues({'user_name': 'test'});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    fakeSettingsRepo = FakeSettingsRepository();
    fakeAuthRepo = FakeAuthRepository();

    container = ProviderContainer(
      overrides: [
        appStorageProvider.overrideWithValue(storage),
        settingsRepositoryProvider.overrideWithValue(fakeSettingsRepo),
        authRepositoryProvider.overrideWithValue(fakeAuthRepo),
      ],
    );
  });

  tearDown(() {
    container.dispose();
  });

  group('SettingsNotifier Tests', () {
    test('initializes and loads settings and providers', () async {
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      final state = container.read(settingsNotifierProvider);
      expect(state.isLoading, isFalse);
      expect(state.settings.responseLanguage, equals('en'));
      expect(state.settings.defaultProvider, equals('openai'));
      expect(state.providers.length, equals(2));
      expect(state.configuredProvidersCount, equals(0));
    });

    test('updateSetting optimistically updates state and flushes debounced patch', () async {
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      // Immediate optimistic update
      notifier.updateSetting('responseLanguage', 'es');
      expect(container.read(settingsNotifierProvider).settings.responseLanguage, equals('es'));

      // Repository has not received update yet before debounce fires
      expect(fakeSettingsRepo.lastUpdatePatch, isNull);

      // Wait for debounce timer (500ms + margin)
      await Future<void>.delayed(const Duration(milliseconds: 600));

      expect(fakeSettingsRepo.lastUpdatePatch, equals({'responseLanguage': 'es'}));
      expect(container.read(settingsNotifierProvider).settings.responseLanguage, equals('es'));
    });

    test('saveProviderKey saves credentials and updates provider status to configured', () async {
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      expect(container.read(settingsNotifierProvider).providers.first.isConfigured, isFalse);

      final success = await notifier.saveProviderKey('openai', 'sk-valid-key');
      expect(success, isTrue);

      expect(fakeSettingsRepo.lastSavedProviderId, equals('openai'));
      expect(fakeSettingsRepo.lastSavedApiKey, equals('sk-valid-key'));

      final state = container.read(settingsNotifierProvider);
      expect(state.providers.firstWhere((p) => p.id == 'openai').isConfigured, isTrue);
      expect(state.configuredProvidersCount, equals(1));
    });

    test('clearProviderKey removes credentials and marks provider as unconfigured', () async {
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      await notifier.saveProviderKey('openai', 'sk-valid-key');
      expect(container.read(settingsNotifierProvider).configuredProvidersCount, equals(1));

      final success = await notifier.clearProviderKey('openai');
      expect(success, isTrue);

      expect(fakeSettingsRepo.lastClearedProviderId, equals('openai'));

      final state = container.read(settingsNotifierProvider);
      expect(state.providers.firstWhere((p) => p.id == 'openai').isConfigured, isFalse);
      expect(state.configuredProvidersCount, equals(0));
    });

    test('logout calls authRepository and resets state', () async {
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      await notifier.logout();

      expect(fakeAuthRepo.loggedOut, isTrue);
      final state = container.read(settingsNotifierProvider);
      expect(state.providers, isEmpty);
    });

    test('clearLocalData clears prefs and reloads settings', () async {
      await storage.prefWrite(StorageKey.userName, 'spacesuser');
      final notifier = container.read(settingsNotifierProvider.notifier);
      await notifier.load();

      await notifier.clearLocalData();

      expect(storage.prefRead(StorageKey.userName), isNull);
    });
  });
}
