import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/features/auth/data/auth_repository.dart';
import 'package:spaces_mobile/features/auth/data/models/auth_response.dart';
import 'package:spaces_mobile/features/settings/data/models/app_settings.dart';
import 'package:spaces_mobile/features/settings/data/models/provider_config.dart';
import 'package:spaces_mobile/features/settings/data/settings_repository.dart';
import 'package:spaces_mobile/features/settings/ui/settings_screen.dart';
import 'package:spaces_mobile/features/settings/ui/widgets/provider_credentials_sheet.dart';

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
      isConfigured: true,
      models: ['gpt-4o', 'gpt-4o-mini'],
    ),
    const ProviderConfig(
      id: 'anthropic',
      name: 'Anthropic',
      isConfigured: false,
      models: ['claude-3-5-sonnet'],
    ),
  ];

  String? lastSavedKeyProviderId;
  String? lastSavedKey;
  String? lastClearedKeyProviderId;
  Map<String, dynamic>? lastUpdatePatch;

  @override
  Future<AppSettings> getSettings() async => currentSettings;

  @override
  Future<AppSettings> updateSettings(Map<String, dynamic> patch) async {
    lastUpdatePatch = patch;
    return currentSettings;
  }

  @override
  Future<List<ProviderConfig>> getProviders() async => currentProviders;

  @override
  Future<void> saveProviderCredentials(String providerId, String apiKey) async {
    lastSavedKeyProviderId = providerId;
    lastSavedKey = apiKey;
    currentProviders = currentProviders.map((p) {
      if (p.id == providerId) return p.copyWith(isConfigured: true);
      return p;
    }).toList();
  }

  @override
  Future<void> clearProviderCredentials(String providerId) async {
    lastClearedKeyProviderId = providerId;
    currentProviders = currentProviders.map((p) {
      if (p.id == providerId) return p.copyWith(isConfigured: false);
      return p;
    }).toList();
  }

  @override
  Future<String?> getSavedProviderApiKey(String providerId) async => lastSavedKey;
}

class FakeAuthRepository implements AuthRepository {
  bool isLoggedOut = false;

  @override
  Future<AuthResponse> login(String username, String password) async {
    return const AuthResponse(user: AuthUser(username: 'test'));
  }

  @override
  Future<void> logout() async {
    isLoggedOut = true;
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

  setUp(() async {
    SharedPreferences.setMockInitialValues({'user_name': 'test'});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    fakeSettingsRepo = FakeSettingsRepository();
    fakeAuthRepo = FakeAuthRepository();
  });

  Widget createTestWidget() {
    return ProviderScope(
      overrides: [
        appStorageProvider.overrideWithValue(storage),
        settingsRepositoryProvider.overrideWithValue(fakeSettingsRepo),
        authRepositoryProvider.overrideWithValue(fakeAuthRepo),
      ],
      child: const MaterialApp(
        home: SettingsScreen(),
      ),
    );
  }

  group('SettingsScreen Widget Tests', () {
    testWidgets('renders all sections and general controls on load', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Check section titles
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('General'), findsOneWidget);
      expect(find.text('AI Providers'), findsOneWidget);

      // Check general controls
      expect(find.text('Response Language'), findsOneWidget);
      expect(find.text('Memory Enabled'), findsOneWidget);
      expect(find.text('Memory Auto-Store'), findsOneWidget);
      expect(find.text('Exa Web Search'), findsOneWidget);

      // Check provider list rendering
      expect(find.byKey(const Key('provider_item_openai')), findsOneWidget);
      expect(find.byKey(const Key('provider_item_anthropic')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('provider_item_openai')), matching: find.text('OpenAI')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('provider_item_anthropic')), matching: find.text('Anthropic')), findsOneWidget);
    });

    testWidgets('tapping provider opens ProviderCredentialsSheet and saves key', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Scroll until visible and tap on Anthropic provider (not configured initially)
      final providerFinder = find.byKey(const Key('provider_item_anthropic'));
      await tester.scrollUntilVisible(providerFinder, 200);
      await tester.tap(providerFinder);
      await tester.pumpAndSettle();

      // Bottom sheet is visible
      expect(find.byType(ProviderCredentialsSheet), findsOneWidget);
      expect(find.text('Anthropic API Key'), findsOneWidget);

      // Enter API key
      await tester.enterText(
        find.byKey(const Key('provider_api_key_field')),
        'sk-ant-test-key-12345',
      );
      await tester.pump();

      // Tap Save
      await tester.tap(find.byKey(const Key('save_provider_key_button')));
      await tester.pumpAndSettle();

      // Verify repository was called
      expect(fakeSettingsRepo.lastSavedKeyProviderId, equals('anthropic'));
      expect(fakeSettingsRepo.lastSavedKey, equals('sk-ant-test-key-12345'));

      // Sheet should be dismissed
      expect(find.byType(ProviderCredentialsSheet), findsNothing);
    });

    testWidgets('tapping configured provider opens sheet with Clear Key option', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Scroll until visible and tap on OpenAI provider (configured)
      final providerFinder = find.byKey(const Key('provider_item_openai'));
      await tester.scrollUntilVisible(providerFinder, 200);
      await tester.tap(providerFinder);
      await tester.pumpAndSettle();

      // Clear button should be present
      expect(find.byKey(const Key('clear_provider_key_button')), findsOneWidget);

      // Tap Clear
      await tester.tap(find.byKey(const Key('clear_provider_key_button')));
      await tester.pumpAndSettle();

      expect(fakeSettingsRepo.lastClearedKeyProviderId, equals('openai'));
      expect(find.byType(ProviderCredentialsSheet), findsNothing);
    });

    testWidgets('toggling memory switch updates setting', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      final switchFinder = find.byKey(const Key('memory_enabled_switch'));
      await tester.scrollUntilVisible(switchFinder, 200);
      await tester.tap(switchFinder);
      await tester.pump();

      // Wait for debounce timer
      await tester.pump(const Duration(milliseconds: 600));

      expect(fakeSettingsRepo.lastUpdatePatch, equals({'memoryEnabled': false}));
    });

    testWidgets('tapping logout shows confirmation dialog and logs out on confirm', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Scroll ListView down to bring logout tile into center view
      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pumpAndSettle();

      final logoutFinder = find.byKey(const Key('logout_tile'));
      await tester.tap(logoutFinder);
      await tester.pumpAndSettle();

      expect(find.text('Log out'), findsOneWidget);
      expect(find.text('Are you sure you want to log out from Spaces?'), findsOneWidget);

      // Confirm logout
      await tester.tap(find.byKey(const Key('confirm_logout_button')));
      await tester.pumpAndSettle();

      expect(fakeAuthRepo.isLoggedOut, isTrue);
    });
  });
}
