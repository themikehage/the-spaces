// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chat_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ChatState {
  List<ChatMessage> get messages => throw _privateConstructorUsedError;
  String get streamingContent => throw _privateConstructorUsedError;
  List<ToolCall> get activeToolCalls => throw _privateConstructorUsedError;
  bool get isStreaming => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;
  AiModel? get currentModel => throw _privateConstructorUsedError;
  List<AiModel> get availableModels => throw _privateConstructorUsedError;
  List<String> get selectedAttachments => throw _privateConstructorUsedError;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ChatStateCopyWith<ChatState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ChatStateCopyWith<$Res> {
  factory $ChatStateCopyWith(ChatState value, $Res Function(ChatState) then) =
      _$ChatStateCopyWithImpl<$Res, ChatState>;
  @useResult
  $Res call(
      {List<ChatMessage> messages,
      String streamingContent,
      List<ToolCall> activeToolCalls,
      bool isStreaming,
      bool isLoading,
      String? error,
      AiModel? currentModel,
      List<AiModel> availableModels,
      List<String> selectedAttachments});

  $AiModelCopyWith<$Res>? get currentModel;
}

/// @nodoc
class _$ChatStateCopyWithImpl<$Res, $Val extends ChatState>
    implements $ChatStateCopyWith<$Res> {
  _$ChatStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? messages = null,
    Object? streamingContent = null,
    Object? activeToolCalls = null,
    Object? isStreaming = null,
    Object? isLoading = null,
    Object? error = freezed,
    Object? currentModel = freezed,
    Object? availableModels = null,
    Object? selectedAttachments = null,
  }) {
    return _then(_value.copyWith(
      messages: null == messages
          ? _value.messages
          : messages // ignore: cast_nullable_to_non_nullable
              as List<ChatMessage>,
      streamingContent: null == streamingContent
          ? _value.streamingContent
          : streamingContent // ignore: cast_nullable_to_non_nullable
              as String,
      activeToolCalls: null == activeToolCalls
          ? _value.activeToolCalls
          : activeToolCalls // ignore: cast_nullable_to_non_nullable
              as List<ToolCall>,
      isStreaming: null == isStreaming
          ? _value.isStreaming
          : isStreaming // ignore: cast_nullable_to_non_nullable
              as bool,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      currentModel: freezed == currentModel
          ? _value.currentModel
          : currentModel // ignore: cast_nullable_to_non_nullable
              as AiModel?,
      availableModels: null == availableModels
          ? _value.availableModels
          : availableModels // ignore: cast_nullable_to_non_nullable
              as List<AiModel>,
      selectedAttachments: null == selectedAttachments
          ? _value.selectedAttachments
          : selectedAttachments // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AiModelCopyWith<$Res>? get currentModel {
    if (_value.currentModel == null) {
      return null;
    }

    return $AiModelCopyWith<$Res>(_value.currentModel!, (value) {
      return _then(_value.copyWith(currentModel: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ChatStateImplCopyWith<$Res>
    implements $ChatStateCopyWith<$Res> {
  factory _$$ChatStateImplCopyWith(
          _$ChatStateImpl value, $Res Function(_$ChatStateImpl) then) =
      __$$ChatStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<ChatMessage> messages,
      String streamingContent,
      List<ToolCall> activeToolCalls,
      bool isStreaming,
      bool isLoading,
      String? error,
      AiModel? currentModel,
      List<AiModel> availableModels,
      List<String> selectedAttachments});

  @override
  $AiModelCopyWith<$Res>? get currentModel;
}

/// @nodoc
class __$$ChatStateImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatStateImpl>
    implements _$$ChatStateImplCopyWith<$Res> {
  __$$ChatStateImplCopyWithImpl(
      _$ChatStateImpl _value, $Res Function(_$ChatStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? messages = null,
    Object? streamingContent = null,
    Object? activeToolCalls = null,
    Object? isStreaming = null,
    Object? isLoading = null,
    Object? error = freezed,
    Object? currentModel = freezed,
    Object? availableModels = null,
    Object? selectedAttachments = null,
  }) {
    return _then(_$ChatStateImpl(
      messages: null == messages
          ? _value._messages
          : messages // ignore: cast_nullable_to_non_nullable
              as List<ChatMessage>,
      streamingContent: null == streamingContent
          ? _value.streamingContent
          : streamingContent // ignore: cast_nullable_to_non_nullable
              as String,
      activeToolCalls: null == activeToolCalls
          ? _value._activeToolCalls
          : activeToolCalls // ignore: cast_nullable_to_non_nullable
              as List<ToolCall>,
      isStreaming: null == isStreaming
          ? _value.isStreaming
          : isStreaming // ignore: cast_nullable_to_non_nullable
              as bool,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      currentModel: freezed == currentModel
          ? _value.currentModel
          : currentModel // ignore: cast_nullable_to_non_nullable
              as AiModel?,
      availableModels: null == availableModels
          ? _value._availableModels
          : availableModels // ignore: cast_nullable_to_non_nullable
              as List<AiModel>,
      selectedAttachments: null == selectedAttachments
          ? _value._selectedAttachments
          : selectedAttachments // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc

class _$ChatStateImpl extends _ChatState {
  const _$ChatStateImpl(
      {final List<ChatMessage> messages = const <ChatMessage>[],
      this.streamingContent = '',
      final List<ToolCall> activeToolCalls = const <ToolCall>[],
      this.isStreaming = false,
      this.isLoading = false,
      this.error,
      this.currentModel,
      final List<AiModel> availableModels = const <AiModel>[],
      final List<String> selectedAttachments = const <String>[]})
      : _messages = messages,
        _activeToolCalls = activeToolCalls,
        _availableModels = availableModels,
        _selectedAttachments = selectedAttachments,
        super._();

  final List<ChatMessage> _messages;
  @override
  @JsonKey()
  List<ChatMessage> get messages {
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_messages);
  }

  @override
  @JsonKey()
  final String streamingContent;
  final List<ToolCall> _activeToolCalls;
  @override
  @JsonKey()
  List<ToolCall> get activeToolCalls {
    if (_activeToolCalls is EqualUnmodifiableListView) return _activeToolCalls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_activeToolCalls);
  }

  @override
  @JsonKey()
  final bool isStreaming;
  @override
  @JsonKey()
  final bool isLoading;
  @override
  final String? error;
  @override
  final AiModel? currentModel;
  final List<AiModel> _availableModels;
  @override
  @JsonKey()
  List<AiModel> get availableModels {
    if (_availableModels is EqualUnmodifiableListView) return _availableModels;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_availableModels);
  }

  final List<String> _selectedAttachments;
  @override
  @JsonKey()
  List<String> get selectedAttachments {
    if (_selectedAttachments is EqualUnmodifiableListView)
      return _selectedAttachments;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_selectedAttachments);
  }

  @override
  String toString() {
    return 'ChatState(messages: $messages, streamingContent: $streamingContent, activeToolCalls: $activeToolCalls, isStreaming: $isStreaming, isLoading: $isLoading, error: $error, currentModel: $currentModel, availableModels: $availableModels, selectedAttachments: $selectedAttachments)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ChatStateImpl &&
            const DeepCollectionEquality().equals(other._messages, _messages) &&
            (identical(other.streamingContent, streamingContent) ||
                other.streamingContent == streamingContent) &&
            const DeepCollectionEquality()
                .equals(other._activeToolCalls, _activeToolCalls) &&
            (identical(other.isStreaming, isStreaming) ||
                other.isStreaming == isStreaming) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.currentModel, currentModel) ||
                other.currentModel == currentModel) &&
            const DeepCollectionEquality()
                .equals(other._availableModels, _availableModels) &&
            const DeepCollectionEquality()
                .equals(other._selectedAttachments, _selectedAttachments));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_messages),
      streamingContent,
      const DeepCollectionEquality().hash(_activeToolCalls),
      isStreaming,
      isLoading,
      error,
      currentModel,
      const DeepCollectionEquality().hash(_availableModels),
      const DeepCollectionEquality().hash(_selectedAttachments));

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ChatStateImplCopyWith<_$ChatStateImpl> get copyWith =>
      __$$ChatStateImplCopyWithImpl<_$ChatStateImpl>(this, _$identity);
}

abstract class _ChatState extends ChatState {
  const factory _ChatState(
      {final List<ChatMessage> messages,
      final String streamingContent,
      final List<ToolCall> activeToolCalls,
      final bool isStreaming,
      final bool isLoading,
      final String? error,
      final AiModel? currentModel,
      final List<AiModel> availableModels,
      final List<String> selectedAttachments}) = _$ChatStateImpl;
  const _ChatState._() : super._();

  @override
  List<ChatMessage> get messages;
  @override
  String get streamingContent;
  @override
  List<ToolCall> get activeToolCalls;
  @override
  bool get isStreaming;
  @override
  bool get isLoading;
  @override
  String? get error;
  @override
  AiModel? get currentModel;
  @override
  List<AiModel> get availableModels;
  @override
  List<String> get selectedAttachments;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ChatStateImplCopyWith<_$ChatStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
