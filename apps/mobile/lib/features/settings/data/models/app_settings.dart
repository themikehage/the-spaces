import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_settings.freezed.dart';

@freezed
class AppSettings with _$AppSettings {
  const AppSettings._();

  const factory AppSettings({
    @Default('en') String responseLanguage,
    @Default(true) bool memoryEnabled,
    @Default(false) bool memoryAutoStore,
    @Default(true) bool memoryEmbeddings,
    @Default(true) bool exaSearchEnabled,
    @Default('') String visionModel,
    @Default('') String imageGenModel,
    @Default('') String videoGenModel,
    @Default(true) bool videoGenEnabled,
    @Default(3) int subagentMaxDepth,
    @Default('Spaces') String factoryName,
    String? factoryAvatarUrl,
    @Default('') String factorySystemPrompt,
    @Default(false) bool showPromptPreviews,
    String? defaultProvider,
    String? defaultModel,
    @Default(<String, String>{}) Map<String, String> providerDefaults,
  }) = _AppSettings;

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    Map<String, String> providerDefaultsMap = {};
    if (json['providerDefaults'] is Map) {
      final raw = json['providerDefaults'] as Map;
      for (final entry in raw.entries) {
        if (entry.key != null && entry.value != null) {
          providerDefaultsMap[entry.key.toString()] = entry.value.toString();
        }
      }
    }

    final defaultProvider = json['defaultProvider'] as String?;
    final defaultModel = json['defaultModel'] as String? ??
        (defaultProvider != null ? providerDefaultsMap[defaultProvider] : null);

    return AppSettings(
      responseLanguage: (json['responseLanguage'] ?? json['language'] ?? 'en') as String,
      memoryEnabled: json['memoryEnabled'] is bool ? json['memoryEnabled'] as bool : true,
      memoryAutoStore: json['memoryAutoStore'] is bool ? json['memoryAutoStore'] as bool : false,
      memoryEmbeddings: json['memoryEmbeddings'] is bool ? json['memoryEmbeddings'] as bool : true,
      exaSearchEnabled: json['exaSearchEnabled'] is bool ? json['exaSearchEnabled'] as bool : true,
      visionModel: (json['visionModel'] ?? '') as String,
      imageGenModel: (json['imageGenModel'] ?? '') as String,
      videoGenModel: (json['videoGenModel'] ?? '') as String,
      videoGenEnabled: json['videoGenEnabled'] is bool ? json['videoGenEnabled'] as bool : true,
      subagentMaxDepth: json['subagentMaxDepth'] is num
          ? (json['subagentMaxDepth'] as num).toInt()
          : 3,
      factoryName: (json['factoryName'] ?? 'Spaces') as String,
      factoryAvatarUrl: json['factoryAvatarUrl'] as String?,
      factorySystemPrompt: (json['factorySystemPrompt'] ?? '') as String,
      showPromptPreviews:
          json['showPromptPreviews'] is bool ? json['showPromptPreviews'] as bool : false,
      defaultProvider: defaultProvider,
      defaultModel: defaultModel,
      providerDefaults: providerDefaultsMap,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'responseLanguage': responseLanguage,
      'memoryEnabled': memoryEnabled,
      'memoryAutoStore': memoryAutoStore,
      'memoryEmbeddings': memoryEmbeddings,
      'exaSearchEnabled': exaSearchEnabled,
      'visionModel': visionModel,
      'imageGenModel': imageGenModel,
      'videoGenModel': videoGenModel,
      'videoGenEnabled': videoGenEnabled,
      'subagentMaxDepth': subagentMaxDepth,
      'factoryName': factoryName,
      if (factoryAvatarUrl != null) 'factoryAvatarUrl': factoryAvatarUrl,
      'factorySystemPrompt': factorySystemPrompt,
      'showPromptPreviews': showPromptPreviews,
      if (defaultProvider != null) 'defaultProvider': defaultProvider,
      if (defaultModel != null) 'defaultModel': defaultModel,
      'providerDefaults': providerDefaults,
    };
  }
}
