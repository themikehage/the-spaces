import '../data/models/app_settings.dart';
import '../data/models/provider_config.dart';

class SettingsState {
  final AppSettings settings;
  final List<ProviderConfig> providers;
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final String? successMessage;

  const SettingsState({
    this.settings = const AppSettings(),
    this.providers = const [],
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.successMessage,
  });

  int get configuredProvidersCount =>
      providers.where((p) => p.isConfigured).length;

  SettingsState copyWith({
    AppSettings? settings,
    List<ProviderConfig>? providers,
    bool? isLoading,
    bool? isSaving,
    String? error,
    String? successMessage,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return SettingsState(
      settings: settings ?? this.settings,
      providers: providers ?? this.providers,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is SettingsState &&
        other.settings == settings &&
        other.isLoading == isLoading &&
        other.isSaving == isSaving &&
        other.error == error &&
        other.successMessage == successMessage &&
        _listEquals(other.providers, providers);
  }

  @override
  int get hashCode =>
      settings.hashCode ^
      isLoading.hashCode ^
      isSaving.hashCode ^
      error.hashCode ^
      successMessage.hashCode ^
      providers.length.hashCode;

  static bool _listEquals(List<ProviderConfig> a, List<ProviderConfig> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i].id != b[i].id || a[i].isConfigured != b[i].isConfigured) {
        return false;
      }
    }
    return true;
  }
}
