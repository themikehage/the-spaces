import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/app_storage.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/ui/auth_notifier.dart';
import '../data/models/app_settings.dart';
import '../data/models/provider_config.dart';
import '../data/settings_repository.dart';
import 'settings_state.dart';

class SettingsNotifier extends StateNotifier<SettingsState> {
  final SettingsRepository _repository;
  final AuthRepository _authRepository;
  final AppStorage _storage;
  final Ref _ref;

  Timer? _debounceTimer;
  final Duration debounceDuration;
  final Map<String, dynamic> _pendingUpdates = {};

  SettingsNotifier({
    required SettingsRepository repository,
    required AuthRepository authRepository,
    required AppStorage storage,
    required Ref ref,
    this.debounceDuration = const Duration(milliseconds: 500),
  })  : _repository = repository,
        _authRepository = authRepository,
        _storage = storage,
        _ref = ref,
        super(const SettingsState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final results = await Future.wait([
        _repository.getSettings(),
        _repository.getProviders(),
      ]);

      final settings = results[0] as AppSettings;
      final providers = results[1] as List<ProviderConfig>;

      if (!mounted) return;
      state = state.copyWith(
        settings: settings,
        providers: providers,
        isLoading: false,
      );
    } catch (e) {
      if (mounted) {
        state = state.copyWith(
          isLoading: false,
          error: e.toString(),
        );
      }
    }
  }

  void updateSetting(String key, dynamic value) {
    _pendingUpdates[key] = value;

    // Optimistic state update
    AppSettings updatedSettings = state.settings;
    switch (key) {
      case 'responseLanguage':
      case 'language':
        updatedSettings = state.settings.copyWith(responseLanguage: value.toString());
        break;
      case 'memoryEnabled':
        updatedSettings = state.settings.copyWith(memoryEnabled: value == true);
        break;
      case 'memoryAutoStore':
        updatedSettings = state.settings.copyWith(memoryAutoStore: value == true);
        break;
      case 'memoryEmbeddings':
        updatedSettings = state.settings.copyWith(memoryEmbeddings: value == true);
        break;
      case 'exaSearchEnabled':
        updatedSettings = state.settings.copyWith(exaSearchEnabled: value == true);
        break;
      case 'defaultProvider':
        updatedSettings = state.settings.copyWith(defaultProvider: value?.toString());
        break;
      case 'defaultModel':
        updatedSettings = state.settings.copyWith(defaultModel: value?.toString());
        break;
      case 'factoryName':
        updatedSettings = state.settings.copyWith(factoryName: value.toString());
        break;
      case 'showPromptPreviews':
        updatedSettings = state.settings.copyWith(showPromptPreviews: value == true);
        break;
      case 'visionModel':
        updatedSettings = state.settings.copyWith(visionModel: value.toString());
        break;
      case 'imageGenModel':
        updatedSettings = state.settings.copyWith(imageGenModel: value.toString());
        break;
      case 'videoGenModel':
        updatedSettings = state.settings.copyWith(videoGenModel: value.toString());
        break;
    }

    state = state.copyWith(settings: updatedSettings, clearError: true);

    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounceDuration, () {
      _flushPendingUpdates();
    });
  }

  Future<void> _flushPendingUpdates() async {
    if (_pendingUpdates.isEmpty) return;

    final patch = Map<String, dynamic>.from(_pendingUpdates);
    _pendingUpdates.clear();

    try {
      final savedSettings = await _repository.updateSettings(patch);
      if (mounted) {
        state = state.copyWith(settings: savedSettings);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(error: 'Failed to update settings: $e');
      }
    }
  }

  Future<bool> saveProviderKey(String providerId, String apiKey) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repository.saveProviderCredentials(providerId, apiKey);

      final updatedProviders = state.providers.map((p) {
        if (p.id == providerId) {
          return p.copyWith(isConfigured: true);
        }
        return p;
      }).toList();

      if (!mounted) return true;
      state = state.copyWith(
        providers: updatedProviders,
        isSaving: false,
        successMessage: 'Credentials saved successfully',
      );
      return true;
    } catch (e) {
      if (mounted) {
        state = state.copyWith(
          isSaving: false,
          error: 'Failed to save credentials: $e',
        );
      }
      return false;
    }
  }

  Future<bool> clearProviderKey(String providerId) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repository.clearProviderCredentials(providerId);

      final updatedProviders = state.providers.map((p) {
        if (p.id == providerId) {
          return p.copyWith(isConfigured: false);
        }
        return p;
      }).toList();

      if (!mounted) return true;
      state = state.copyWith(
        providers: updatedProviders,
        isSaving: false,
        successMessage: 'Credentials removed',
      );
      return true;
    } catch (e) {
      if (mounted) {
        state = state.copyWith(
          isSaving: false,
          error: 'Failed to remove credentials: $e',
        );
      }
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await _authRepository.logout();
      _ref.read(authNotifierProvider.notifier).logout();
    } finally {
      if (mounted) {
        state = const SettingsState();
      }
    }
  }

  Future<void> clearLocalData() async {
    state = state.copyWith(isLoading: true);
    try {
      await _storage.prefClear();
      await load();
    } catch (e) {
      if (mounted) {
        state = state.copyWith(isLoading: false, error: e.toString());
      }
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}

final settingsNotifierProvider =
    StateNotifierProvider<SettingsNotifier, SettingsState>((ref) {
  final repository = ref.watch(settingsRepositoryProvider);
  final authRepository = ref.watch(authRepositoryProvider);
  final storage = ref.watch(appStorageProvider);
  return SettingsNotifier(
    repository: repository,
    authRepository: authRepository,
    storage: storage,
    ref: ref,
  );
});
