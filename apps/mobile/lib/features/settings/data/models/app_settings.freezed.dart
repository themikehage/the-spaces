// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'app_settings.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$AppSettings {
  String get responseLanguage => throw _privateConstructorUsedError;
  bool get memoryEnabled => throw _privateConstructorUsedError;
  bool get memoryAutoStore => throw _privateConstructorUsedError;
  bool get memoryEmbeddings => throw _privateConstructorUsedError;
  bool get exaSearchEnabled => throw _privateConstructorUsedError;
  String get visionModel => throw _privateConstructorUsedError;
  String get imageGenModel => throw _privateConstructorUsedError;
  String get videoGenModel => throw _privateConstructorUsedError;
  bool get videoGenEnabled => throw _privateConstructorUsedError;
  int get subagentMaxDepth => throw _privateConstructorUsedError;
  String get factoryName => throw _privateConstructorUsedError;
  String? get factoryAvatarUrl => throw _privateConstructorUsedError;
  String get factorySystemPrompt => throw _privateConstructorUsedError;
  bool get showPromptPreviews => throw _privateConstructorUsedError;
  String? get defaultProvider => throw _privateConstructorUsedError;
  String? get defaultModel => throw _privateConstructorUsedError;
  Map<String, String> get providerDefaults =>
      throw _privateConstructorUsedError;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AppSettingsCopyWith<AppSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AppSettingsCopyWith<$Res> {
  factory $AppSettingsCopyWith(
          AppSettings value, $Res Function(AppSettings) then) =
      _$AppSettingsCopyWithImpl<$Res, AppSettings>;
  @useResult
  $Res call(
      {String responseLanguage,
      bool memoryEnabled,
      bool memoryAutoStore,
      bool memoryEmbeddings,
      bool exaSearchEnabled,
      String visionModel,
      String imageGenModel,
      String videoGenModel,
      bool videoGenEnabled,
      int subagentMaxDepth,
      String factoryName,
      String? factoryAvatarUrl,
      String factorySystemPrompt,
      bool showPromptPreviews,
      String? defaultProvider,
      String? defaultModel,
      Map<String, String> providerDefaults});
}

/// @nodoc
class _$AppSettingsCopyWithImpl<$Res, $Val extends AppSettings>
    implements $AppSettingsCopyWith<$Res> {
  _$AppSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? responseLanguage = null,
    Object? memoryEnabled = null,
    Object? memoryAutoStore = null,
    Object? memoryEmbeddings = null,
    Object? exaSearchEnabled = null,
    Object? visionModel = null,
    Object? imageGenModel = null,
    Object? videoGenModel = null,
    Object? videoGenEnabled = null,
    Object? subagentMaxDepth = null,
    Object? factoryName = null,
    Object? factoryAvatarUrl = freezed,
    Object? factorySystemPrompt = null,
    Object? showPromptPreviews = null,
    Object? defaultProvider = freezed,
    Object? defaultModel = freezed,
    Object? providerDefaults = null,
  }) {
    return _then(_value.copyWith(
      responseLanguage: null == responseLanguage
          ? _value.responseLanguage
          : responseLanguage // ignore: cast_nullable_to_non_nullable
              as String,
      memoryEnabled: null == memoryEnabled
          ? _value.memoryEnabled
          : memoryEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      memoryAutoStore: null == memoryAutoStore
          ? _value.memoryAutoStore
          : memoryAutoStore // ignore: cast_nullable_to_non_nullable
              as bool,
      memoryEmbeddings: null == memoryEmbeddings
          ? _value.memoryEmbeddings
          : memoryEmbeddings // ignore: cast_nullable_to_non_nullable
              as bool,
      exaSearchEnabled: null == exaSearchEnabled
          ? _value.exaSearchEnabled
          : exaSearchEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      visionModel: null == visionModel
          ? _value.visionModel
          : visionModel // ignore: cast_nullable_to_non_nullable
              as String,
      imageGenModel: null == imageGenModel
          ? _value.imageGenModel
          : imageGenModel // ignore: cast_nullable_to_non_nullable
              as String,
      videoGenModel: null == videoGenModel
          ? _value.videoGenModel
          : videoGenModel // ignore: cast_nullable_to_non_nullable
              as String,
      videoGenEnabled: null == videoGenEnabled
          ? _value.videoGenEnabled
          : videoGenEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      subagentMaxDepth: null == subagentMaxDepth
          ? _value.subagentMaxDepth
          : subagentMaxDepth // ignore: cast_nullable_to_non_nullable
              as int,
      factoryName: null == factoryName
          ? _value.factoryName
          : factoryName // ignore: cast_nullable_to_non_nullable
              as String,
      factoryAvatarUrl: freezed == factoryAvatarUrl
          ? _value.factoryAvatarUrl
          : factoryAvatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      factorySystemPrompt: null == factorySystemPrompt
          ? _value.factorySystemPrompt
          : factorySystemPrompt // ignore: cast_nullable_to_non_nullable
              as String,
      showPromptPreviews: null == showPromptPreviews
          ? _value.showPromptPreviews
          : showPromptPreviews // ignore: cast_nullable_to_non_nullable
              as bool,
      defaultProvider: freezed == defaultProvider
          ? _value.defaultProvider
          : defaultProvider // ignore: cast_nullable_to_non_nullable
              as String?,
      defaultModel: freezed == defaultModel
          ? _value.defaultModel
          : defaultModel // ignore: cast_nullable_to_non_nullable
              as String?,
      providerDefaults: null == providerDefaults
          ? _value.providerDefaults
          : providerDefaults // ignore: cast_nullable_to_non_nullable
              as Map<String, String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AppSettingsImplCopyWith<$Res>
    implements $AppSettingsCopyWith<$Res> {
  factory _$$AppSettingsImplCopyWith(
          _$AppSettingsImpl value, $Res Function(_$AppSettingsImpl) then) =
      __$$AppSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String responseLanguage,
      bool memoryEnabled,
      bool memoryAutoStore,
      bool memoryEmbeddings,
      bool exaSearchEnabled,
      String visionModel,
      String imageGenModel,
      String videoGenModel,
      bool videoGenEnabled,
      int subagentMaxDepth,
      String factoryName,
      String? factoryAvatarUrl,
      String factorySystemPrompt,
      bool showPromptPreviews,
      String? defaultProvider,
      String? defaultModel,
      Map<String, String> providerDefaults});
}

/// @nodoc
class __$$AppSettingsImplCopyWithImpl<$Res>
    extends _$AppSettingsCopyWithImpl<$Res, _$AppSettingsImpl>
    implements _$$AppSettingsImplCopyWith<$Res> {
  __$$AppSettingsImplCopyWithImpl(
      _$AppSettingsImpl _value, $Res Function(_$AppSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? responseLanguage = null,
    Object? memoryEnabled = null,
    Object? memoryAutoStore = null,
    Object? memoryEmbeddings = null,
    Object? exaSearchEnabled = null,
    Object? visionModel = null,
    Object? imageGenModel = null,
    Object? videoGenModel = null,
    Object? videoGenEnabled = null,
    Object? subagentMaxDepth = null,
    Object? factoryName = null,
    Object? factoryAvatarUrl = freezed,
    Object? factorySystemPrompt = null,
    Object? showPromptPreviews = null,
    Object? defaultProvider = freezed,
    Object? defaultModel = freezed,
    Object? providerDefaults = null,
  }) {
    return _then(_$AppSettingsImpl(
      responseLanguage: null == responseLanguage
          ? _value.responseLanguage
          : responseLanguage // ignore: cast_nullable_to_non_nullable
              as String,
      memoryEnabled: null == memoryEnabled
          ? _value.memoryEnabled
          : memoryEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      memoryAutoStore: null == memoryAutoStore
          ? _value.memoryAutoStore
          : memoryAutoStore // ignore: cast_nullable_to_non_nullable
              as bool,
      memoryEmbeddings: null == memoryEmbeddings
          ? _value.memoryEmbeddings
          : memoryEmbeddings // ignore: cast_nullable_to_non_nullable
              as bool,
      exaSearchEnabled: null == exaSearchEnabled
          ? _value.exaSearchEnabled
          : exaSearchEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      visionModel: null == visionModel
          ? _value.visionModel
          : visionModel // ignore: cast_nullable_to_non_nullable
              as String,
      imageGenModel: null == imageGenModel
          ? _value.imageGenModel
          : imageGenModel // ignore: cast_nullable_to_non_nullable
              as String,
      videoGenModel: null == videoGenModel
          ? _value.videoGenModel
          : videoGenModel // ignore: cast_nullable_to_non_nullable
              as String,
      videoGenEnabled: null == videoGenEnabled
          ? _value.videoGenEnabled
          : videoGenEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      subagentMaxDepth: null == subagentMaxDepth
          ? _value.subagentMaxDepth
          : subagentMaxDepth // ignore: cast_nullable_to_non_nullable
              as int,
      factoryName: null == factoryName
          ? _value.factoryName
          : factoryName // ignore: cast_nullable_to_non_nullable
              as String,
      factoryAvatarUrl: freezed == factoryAvatarUrl
          ? _value.factoryAvatarUrl
          : factoryAvatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      factorySystemPrompt: null == factorySystemPrompt
          ? _value.factorySystemPrompt
          : factorySystemPrompt // ignore: cast_nullable_to_non_nullable
              as String,
      showPromptPreviews: null == showPromptPreviews
          ? _value.showPromptPreviews
          : showPromptPreviews // ignore: cast_nullable_to_non_nullable
              as bool,
      defaultProvider: freezed == defaultProvider
          ? _value.defaultProvider
          : defaultProvider // ignore: cast_nullable_to_non_nullable
              as String?,
      defaultModel: freezed == defaultModel
          ? _value.defaultModel
          : defaultModel // ignore: cast_nullable_to_non_nullable
              as String?,
      providerDefaults: null == providerDefaults
          ? _value._providerDefaults
          : providerDefaults // ignore: cast_nullable_to_non_nullable
              as Map<String, String>,
    ));
  }
}

/// @nodoc

class _$AppSettingsImpl extends _AppSettings {
  const _$AppSettingsImpl(
      {this.responseLanguage = 'en',
      this.memoryEnabled = true,
      this.memoryAutoStore = false,
      this.memoryEmbeddings = true,
      this.exaSearchEnabled = true,
      this.visionModel = '',
      this.imageGenModel = '',
      this.videoGenModel = '',
      this.videoGenEnabled = true,
      this.subagentMaxDepth = 3,
      this.factoryName = 'Spaces',
      this.factoryAvatarUrl,
      this.factorySystemPrompt = '',
      this.showPromptPreviews = false,
      this.defaultProvider,
      this.defaultModel,
      final Map<String, String> providerDefaults = const <String, String>{}})
      : _providerDefaults = providerDefaults,
        super._();

  @override
  @JsonKey()
  final String responseLanguage;
  @override
  @JsonKey()
  final bool memoryEnabled;
  @override
  @JsonKey()
  final bool memoryAutoStore;
  @override
  @JsonKey()
  final bool memoryEmbeddings;
  @override
  @JsonKey()
  final bool exaSearchEnabled;
  @override
  @JsonKey()
  final String visionModel;
  @override
  @JsonKey()
  final String imageGenModel;
  @override
  @JsonKey()
  final String videoGenModel;
  @override
  @JsonKey()
  final bool videoGenEnabled;
  @override
  @JsonKey()
  final int subagentMaxDepth;
  @override
  @JsonKey()
  final String factoryName;
  @override
  final String? factoryAvatarUrl;
  @override
  @JsonKey()
  final String factorySystemPrompt;
  @override
  @JsonKey()
  final bool showPromptPreviews;
  @override
  final String? defaultProvider;
  @override
  final String? defaultModel;
  final Map<String, String> _providerDefaults;
  @override
  @JsonKey()
  Map<String, String> get providerDefaults {
    if (_providerDefaults is EqualUnmodifiableMapView) return _providerDefaults;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_providerDefaults);
  }

  @override
  String toString() {
    return 'AppSettings(responseLanguage: $responseLanguage, memoryEnabled: $memoryEnabled, memoryAutoStore: $memoryAutoStore, memoryEmbeddings: $memoryEmbeddings, exaSearchEnabled: $exaSearchEnabled, visionModel: $visionModel, imageGenModel: $imageGenModel, videoGenModel: $videoGenModel, videoGenEnabled: $videoGenEnabled, subagentMaxDepth: $subagentMaxDepth, factoryName: $factoryName, factoryAvatarUrl: $factoryAvatarUrl, factorySystemPrompt: $factorySystemPrompt, showPromptPreviews: $showPromptPreviews, defaultProvider: $defaultProvider, defaultModel: $defaultModel, providerDefaults: $providerDefaults)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AppSettingsImpl &&
            (identical(other.responseLanguage, responseLanguage) ||
                other.responseLanguage == responseLanguage) &&
            (identical(other.memoryEnabled, memoryEnabled) ||
                other.memoryEnabled == memoryEnabled) &&
            (identical(other.memoryAutoStore, memoryAutoStore) ||
                other.memoryAutoStore == memoryAutoStore) &&
            (identical(other.memoryEmbeddings, memoryEmbeddings) ||
                other.memoryEmbeddings == memoryEmbeddings) &&
            (identical(other.exaSearchEnabled, exaSearchEnabled) ||
                other.exaSearchEnabled == exaSearchEnabled) &&
            (identical(other.visionModel, visionModel) ||
                other.visionModel == visionModel) &&
            (identical(other.imageGenModel, imageGenModel) ||
                other.imageGenModel == imageGenModel) &&
            (identical(other.videoGenModel, videoGenModel) ||
                other.videoGenModel == videoGenModel) &&
            (identical(other.videoGenEnabled, videoGenEnabled) ||
                other.videoGenEnabled == videoGenEnabled) &&
            (identical(other.subagentMaxDepth, subagentMaxDepth) ||
                other.subagentMaxDepth == subagentMaxDepth) &&
            (identical(other.factoryName, factoryName) ||
                other.factoryName == factoryName) &&
            (identical(other.factoryAvatarUrl, factoryAvatarUrl) ||
                other.factoryAvatarUrl == factoryAvatarUrl) &&
            (identical(other.factorySystemPrompt, factorySystemPrompt) ||
                other.factorySystemPrompt == factorySystemPrompt) &&
            (identical(other.showPromptPreviews, showPromptPreviews) ||
                other.showPromptPreviews == showPromptPreviews) &&
            (identical(other.defaultProvider, defaultProvider) ||
                other.defaultProvider == defaultProvider) &&
            (identical(other.defaultModel, defaultModel) ||
                other.defaultModel == defaultModel) &&
            const DeepCollectionEquality()
                .equals(other._providerDefaults, _providerDefaults));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      responseLanguage,
      memoryEnabled,
      memoryAutoStore,
      memoryEmbeddings,
      exaSearchEnabled,
      visionModel,
      imageGenModel,
      videoGenModel,
      videoGenEnabled,
      subagentMaxDepth,
      factoryName,
      factoryAvatarUrl,
      factorySystemPrompt,
      showPromptPreviews,
      defaultProvider,
      defaultModel,
      const DeepCollectionEquality().hash(_providerDefaults));

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AppSettingsImplCopyWith<_$AppSettingsImpl> get copyWith =>
      __$$AppSettingsImplCopyWithImpl<_$AppSettingsImpl>(this, _$identity);
}

abstract class _AppSettings extends AppSettings {
  const factory _AppSettings(
      {final String responseLanguage,
      final bool memoryEnabled,
      final bool memoryAutoStore,
      final bool memoryEmbeddings,
      final bool exaSearchEnabled,
      final String visionModel,
      final String imageGenModel,
      final String videoGenModel,
      final bool videoGenEnabled,
      final int subagentMaxDepth,
      final String factoryName,
      final String? factoryAvatarUrl,
      final String factorySystemPrompt,
      final bool showPromptPreviews,
      final String? defaultProvider,
      final String? defaultModel,
      final Map<String, String> providerDefaults}) = _$AppSettingsImpl;
  const _AppSettings._() : super._();

  @override
  String get responseLanguage;
  @override
  bool get memoryEnabled;
  @override
  bool get memoryAutoStore;
  @override
  bool get memoryEmbeddings;
  @override
  bool get exaSearchEnabled;
  @override
  String get visionModel;
  @override
  String get imageGenModel;
  @override
  String get videoGenModel;
  @override
  bool get videoGenEnabled;
  @override
  int get subagentMaxDepth;
  @override
  String get factoryName;
  @override
  String? get factoryAvatarUrl;
  @override
  String get factorySystemPrompt;
  @override
  bool get showPromptPreviews;
  @override
  String? get defaultProvider;
  @override
  String? get defaultModel;
  @override
  Map<String, String> get providerDefaults;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AppSettingsImplCopyWith<_$AppSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
