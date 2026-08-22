// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chat_message.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ApprovalRequest {
  String get toolCallId => throw _privateConstructorUsedError;
  String get toolName => throw _privateConstructorUsedError;
  String get severity => throw _privateConstructorUsedError;
  String get message => throw _privateConstructorUsedError;
  int get timeoutSeconds => throw _privateConstructorUsedError;
  bool get resolved => throw _privateConstructorUsedError;
  bool? get approvedResult => throw _privateConstructorUsedError;
  Map<String, dynamic>? get args => throw _privateConstructorUsedError;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ApprovalRequestCopyWith<ApprovalRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApprovalRequestCopyWith<$Res> {
  factory $ApprovalRequestCopyWith(
          ApprovalRequest value, $Res Function(ApprovalRequest) then) =
      _$ApprovalRequestCopyWithImpl<$Res, ApprovalRequest>;
  @useResult
  $Res call(
      {String toolCallId,
      String toolName,
      String severity,
      String message,
      int timeoutSeconds,
      bool resolved,
      bool? approvedResult,
      Map<String, dynamic>? args});
}

/// @nodoc
class _$ApprovalRequestCopyWithImpl<$Res, $Val extends ApprovalRequest>
    implements $ApprovalRequestCopyWith<$Res> {
  _$ApprovalRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? toolCallId = null,
    Object? toolName = null,
    Object? severity = null,
    Object? message = null,
    Object? timeoutSeconds = null,
    Object? resolved = null,
    Object? approvedResult = freezed,
    Object? args = freezed,
  }) {
    return _then(_value.copyWith(
      toolCallId: null == toolCallId
          ? _value.toolCallId
          : toolCallId // ignore: cast_nullable_to_non_nullable
              as String,
      toolName: null == toolName
          ? _value.toolName
          : toolName // ignore: cast_nullable_to_non_nullable
              as String,
      severity: null == severity
          ? _value.severity
          : severity // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      timeoutSeconds: null == timeoutSeconds
          ? _value.timeoutSeconds
          : timeoutSeconds // ignore: cast_nullable_to_non_nullable
              as int,
      resolved: null == resolved
          ? _value.resolved
          : resolved // ignore: cast_nullable_to_non_nullable
              as bool,
      approvedResult: freezed == approvedResult
          ? _value.approvedResult
          : approvedResult // ignore: cast_nullable_to_non_nullable
              as bool?,
      args: freezed == args
          ? _value.args
          : args // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ApprovalRequestImplCopyWith<$Res>
    implements $ApprovalRequestCopyWith<$Res> {
  factory _$$ApprovalRequestImplCopyWith(_$ApprovalRequestImpl value,
          $Res Function(_$ApprovalRequestImpl) then) =
      __$$ApprovalRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String toolCallId,
      String toolName,
      String severity,
      String message,
      int timeoutSeconds,
      bool resolved,
      bool? approvedResult,
      Map<String, dynamic>? args});
}

/// @nodoc
class __$$ApprovalRequestImplCopyWithImpl<$Res>
    extends _$ApprovalRequestCopyWithImpl<$Res, _$ApprovalRequestImpl>
    implements _$$ApprovalRequestImplCopyWith<$Res> {
  __$$ApprovalRequestImplCopyWithImpl(
      _$ApprovalRequestImpl _value, $Res Function(_$ApprovalRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? toolCallId = null,
    Object? toolName = null,
    Object? severity = null,
    Object? message = null,
    Object? timeoutSeconds = null,
    Object? resolved = null,
    Object? approvedResult = freezed,
    Object? args = freezed,
  }) {
    return _then(_$ApprovalRequestImpl(
      toolCallId: null == toolCallId
          ? _value.toolCallId
          : toolCallId // ignore: cast_nullable_to_non_nullable
              as String,
      toolName: null == toolName
          ? _value.toolName
          : toolName // ignore: cast_nullable_to_non_nullable
              as String,
      severity: null == severity
          ? _value.severity
          : severity // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      timeoutSeconds: null == timeoutSeconds
          ? _value.timeoutSeconds
          : timeoutSeconds // ignore: cast_nullable_to_non_nullable
              as int,
      resolved: null == resolved
          ? _value.resolved
          : resolved // ignore: cast_nullable_to_non_nullable
              as bool,
      approvedResult: freezed == approvedResult
          ? _value.approvedResult
          : approvedResult // ignore: cast_nullable_to_non_nullable
              as bool?,
      args: freezed == args
          ? _value._args
          : args // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$ApprovalRequestImpl extends _ApprovalRequest {
  const _$ApprovalRequestImpl(
      {required this.toolCallId,
      required this.toolName,
      this.severity = 'warning',
      this.message = '',
      this.timeoutSeconds = 15,
      this.resolved = false,
      this.approvedResult,
      final Map<String, dynamic>? args})
      : _args = args,
        super._();

  @override
  final String toolCallId;
  @override
  final String toolName;
  @override
  @JsonKey()
  final String severity;
  @override
  @JsonKey()
  final String message;
  @override
  @JsonKey()
  final int timeoutSeconds;
  @override
  @JsonKey()
  final bool resolved;
  @override
  final bool? approvedResult;
  final Map<String, dynamic>? _args;
  @override
  Map<String, dynamic>? get args {
    final value = _args;
    if (value == null) return null;
    if (_args is EqualUnmodifiableMapView) return _args;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'ApprovalRequest(toolCallId: $toolCallId, toolName: $toolName, severity: $severity, message: $message, timeoutSeconds: $timeoutSeconds, resolved: $resolved, approvedResult: $approvedResult, args: $args)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApprovalRequestImpl &&
            (identical(other.toolCallId, toolCallId) ||
                other.toolCallId == toolCallId) &&
            (identical(other.toolName, toolName) ||
                other.toolName == toolName) &&
            (identical(other.severity, severity) ||
                other.severity == severity) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.timeoutSeconds, timeoutSeconds) ||
                other.timeoutSeconds == timeoutSeconds) &&
            (identical(other.resolved, resolved) ||
                other.resolved == resolved) &&
            (identical(other.approvedResult, approvedResult) ||
                other.approvedResult == approvedResult) &&
            const DeepCollectionEquality().equals(other._args, _args));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      toolCallId,
      toolName,
      severity,
      message,
      timeoutSeconds,
      resolved,
      approvedResult,
      const DeepCollectionEquality().hash(_args));

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      __$$ApprovalRequestImplCopyWithImpl<_$ApprovalRequestImpl>(
          this, _$identity);
}

abstract class _ApprovalRequest extends ApprovalRequest {
  const factory _ApprovalRequest(
      {required final String toolCallId,
      required final String toolName,
      final String severity,
      final String message,
      final int timeoutSeconds,
      final bool resolved,
      final bool? approvedResult,
      final Map<String, dynamic>? args}) = _$ApprovalRequestImpl;
  const _ApprovalRequest._() : super._();

  @override
  String get toolCallId;
  @override
  String get toolName;
  @override
  String get severity;
  @override
  String get message;
  @override
  int get timeoutSeconds;
  @override
  bool get resolved;
  @override
  bool? get approvedResult;
  @override
  Map<String, dynamic>? get args;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$QuestionRequest {
  String get questionId => throw _privateConstructorUsedError;
  String get question => throw _privateConstructorUsedError;
  List<String> get options => throw _privateConstructorUsedError;
  bool get allowCustom => throw _privateConstructorUsedError;
  bool get isMultiSelect => throw _privateConstructorUsedError;
  bool get resolved => throw _privateConstructorUsedError;
  List<String>? get selectedOptions => throw _privateConstructorUsedError;
  String? get customAnswer => throw _privateConstructorUsedError;

  /// Create a copy of QuestionRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuestionRequestCopyWith<QuestionRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuestionRequestCopyWith<$Res> {
  factory $QuestionRequestCopyWith(
          QuestionRequest value, $Res Function(QuestionRequest) then) =
      _$QuestionRequestCopyWithImpl<$Res, QuestionRequest>;
  @useResult
  $Res call(
      {String questionId,
      String question,
      List<String> options,
      bool allowCustom,
      bool isMultiSelect,
      bool resolved,
      List<String>? selectedOptions,
      String? customAnswer});
}

/// @nodoc
class _$QuestionRequestCopyWithImpl<$Res, $Val extends QuestionRequest>
    implements $QuestionRequestCopyWith<$Res> {
  _$QuestionRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuestionRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? questionId = null,
    Object? question = null,
    Object? options = null,
    Object? allowCustom = null,
    Object? isMultiSelect = null,
    Object? resolved = null,
    Object? selectedOptions = freezed,
    Object? customAnswer = freezed,
  }) {
    return _then(_value.copyWith(
      questionId: null == questionId
          ? _value.questionId
          : questionId // ignore: cast_nullable_to_non_nullable
              as String,
      question: null == question
          ? _value.question
          : question // ignore: cast_nullable_to_non_nullable
              as String,
      options: null == options
          ? _value.options
          : options // ignore: cast_nullable_to_non_nullable
              as List<String>,
      allowCustom: null == allowCustom
          ? _value.allowCustom
          : allowCustom // ignore: cast_nullable_to_non_nullable
              as bool,
      isMultiSelect: null == isMultiSelect
          ? _value.isMultiSelect
          : isMultiSelect // ignore: cast_nullable_to_non_nullable
              as bool,
      resolved: null == resolved
          ? _value.resolved
          : resolved // ignore: cast_nullable_to_non_nullable
              as bool,
      selectedOptions: freezed == selectedOptions
          ? _value.selectedOptions
          : selectedOptions // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      customAnswer: freezed == customAnswer
          ? _value.customAnswer
          : customAnswer // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$QuestionRequestImplCopyWith<$Res>
    implements $QuestionRequestCopyWith<$Res> {
  factory _$$QuestionRequestImplCopyWith(_$QuestionRequestImpl value,
          $Res Function(_$QuestionRequestImpl) then) =
      __$$QuestionRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String questionId,
      String question,
      List<String> options,
      bool allowCustom,
      bool isMultiSelect,
      bool resolved,
      List<String>? selectedOptions,
      String? customAnswer});
}

/// @nodoc
class __$$QuestionRequestImplCopyWithImpl<$Res>
    extends _$QuestionRequestCopyWithImpl<$Res, _$QuestionRequestImpl>
    implements _$$QuestionRequestImplCopyWith<$Res> {
  __$$QuestionRequestImplCopyWithImpl(
      _$QuestionRequestImpl _value, $Res Function(_$QuestionRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of QuestionRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? questionId = null,
    Object? question = null,
    Object? options = null,
    Object? allowCustom = null,
    Object? isMultiSelect = null,
    Object? resolved = null,
    Object? selectedOptions = freezed,
    Object? customAnswer = freezed,
  }) {
    return _then(_$QuestionRequestImpl(
      questionId: null == questionId
          ? _value.questionId
          : questionId // ignore: cast_nullable_to_non_nullable
              as String,
      question: null == question
          ? _value.question
          : question // ignore: cast_nullable_to_non_nullable
              as String,
      options: null == options
          ? _value._options
          : options // ignore: cast_nullable_to_non_nullable
              as List<String>,
      allowCustom: null == allowCustom
          ? _value.allowCustom
          : allowCustom // ignore: cast_nullable_to_non_nullable
              as bool,
      isMultiSelect: null == isMultiSelect
          ? _value.isMultiSelect
          : isMultiSelect // ignore: cast_nullable_to_non_nullable
              as bool,
      resolved: null == resolved
          ? _value.resolved
          : resolved // ignore: cast_nullable_to_non_nullable
              as bool,
      selectedOptions: freezed == selectedOptions
          ? _value._selectedOptions
          : selectedOptions // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      customAnswer: freezed == customAnswer
          ? _value.customAnswer
          : customAnswer // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$QuestionRequestImpl extends _QuestionRequest {
  const _$QuestionRequestImpl(
      {required this.questionId,
      required this.question,
      final List<String> options = const <String>[],
      this.allowCustom = true,
      this.isMultiSelect = false,
      this.resolved = false,
      final List<String>? selectedOptions,
      this.customAnswer})
      : _options = options,
        _selectedOptions = selectedOptions,
        super._();

  @override
  final String questionId;
  @override
  final String question;
  final List<String> _options;
  @override
  @JsonKey()
  List<String> get options {
    if (_options is EqualUnmodifiableListView) return _options;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_options);
  }

  @override
  @JsonKey()
  final bool allowCustom;
  @override
  @JsonKey()
  final bool isMultiSelect;
  @override
  @JsonKey()
  final bool resolved;
  final List<String>? _selectedOptions;
  @override
  List<String>? get selectedOptions {
    final value = _selectedOptions;
    if (value == null) return null;
    if (_selectedOptions is EqualUnmodifiableListView) return _selectedOptions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final String? customAnswer;

  @override
  String toString() {
    return 'QuestionRequest(questionId: $questionId, question: $question, options: $options, allowCustom: $allowCustom, isMultiSelect: $isMultiSelect, resolved: $resolved, selectedOptions: $selectedOptions, customAnswer: $customAnswer)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuestionRequestImpl &&
            (identical(other.questionId, questionId) ||
                other.questionId == questionId) &&
            (identical(other.question, question) ||
                other.question == question) &&
            const DeepCollectionEquality().equals(other._options, _options) &&
            (identical(other.allowCustom, allowCustom) ||
                other.allowCustom == allowCustom) &&
            (identical(other.isMultiSelect, isMultiSelect) ||
                other.isMultiSelect == isMultiSelect) &&
            (identical(other.resolved, resolved) ||
                other.resolved == resolved) &&
            const DeepCollectionEquality()
                .equals(other._selectedOptions, _selectedOptions) &&
            (identical(other.customAnswer, customAnswer) ||
                other.customAnswer == customAnswer));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      questionId,
      question,
      const DeepCollectionEquality().hash(_options),
      allowCustom,
      isMultiSelect,
      resolved,
      const DeepCollectionEquality().hash(_selectedOptions),
      customAnswer);

  /// Create a copy of QuestionRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuestionRequestImplCopyWith<_$QuestionRequestImpl> get copyWith =>
      __$$QuestionRequestImplCopyWithImpl<_$QuestionRequestImpl>(
          this, _$identity);
}

abstract class _QuestionRequest extends QuestionRequest {
  const factory _QuestionRequest(
      {required final String questionId,
      required final String question,
      final List<String> options,
      final bool allowCustom,
      final bool isMultiSelect,
      final bool resolved,
      final List<String>? selectedOptions,
      final String? customAnswer}) = _$QuestionRequestImpl;
  const _QuestionRequest._() : super._();

  @override
  String get questionId;
  @override
  String get question;
  @override
  List<String> get options;
  @override
  bool get allowCustom;
  @override
  bool get isMultiSelect;
  @override
  bool get resolved;
  @override
  List<String>? get selectedOptions;
  @override
  String? get customAnswer;

  /// Create a copy of QuestionRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuestionRequestImplCopyWith<_$QuestionRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ToolCall {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  Map<String, dynamic> get arguments => throw _privateConstructorUsedError;
  dynamic get result => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  bool get isError => throw _privateConstructorUsedError;

  /// Create a copy of ToolCall
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ToolCallCopyWith<ToolCall> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ToolCallCopyWith<$Res> {
  factory $ToolCallCopyWith(ToolCall value, $Res Function(ToolCall) then) =
      _$ToolCallCopyWithImpl<$Res, ToolCall>;
  @useResult
  $Res call(
      {String id,
      String name,
      Map<String, dynamic> arguments,
      dynamic result,
      String status,
      bool isError});
}

/// @nodoc
class _$ToolCallCopyWithImpl<$Res, $Val extends ToolCall>
    implements $ToolCallCopyWith<$Res> {
  _$ToolCallCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ToolCall
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? arguments = null,
    Object? result = freezed,
    Object? status = null,
    Object? isError = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      arguments: null == arguments
          ? _value.arguments
          : arguments // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      result: freezed == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as dynamic,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      isError: null == isError
          ? _value.isError
          : isError // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ToolCallImplCopyWith<$Res>
    implements $ToolCallCopyWith<$Res> {
  factory _$$ToolCallImplCopyWith(
          _$ToolCallImpl value, $Res Function(_$ToolCallImpl) then) =
      __$$ToolCallImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      Map<String, dynamic> arguments,
      dynamic result,
      String status,
      bool isError});
}

/// @nodoc
class __$$ToolCallImplCopyWithImpl<$Res>
    extends _$ToolCallCopyWithImpl<$Res, _$ToolCallImpl>
    implements _$$ToolCallImplCopyWith<$Res> {
  __$$ToolCallImplCopyWithImpl(
      _$ToolCallImpl _value, $Res Function(_$ToolCallImpl) _then)
      : super(_value, _then);

  /// Create a copy of ToolCall
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? arguments = null,
    Object? result = freezed,
    Object? status = null,
    Object? isError = null,
  }) {
    return _then(_$ToolCallImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      arguments: null == arguments
          ? _value._arguments
          : arguments // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      result: freezed == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as dynamic,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      isError: null == isError
          ? _value.isError
          : isError // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$ToolCallImpl extends _ToolCall {
  const _$ToolCallImpl(
      {required this.id,
      required this.name,
      final Map<String, dynamic> arguments = const <String, dynamic>{},
      this.result,
      this.status = 'done',
      this.isError = false})
      : _arguments = arguments,
        super._();

  @override
  final String id;
  @override
  final String name;
  final Map<String, dynamic> _arguments;
  @override
  @JsonKey()
  Map<String, dynamic> get arguments {
    if (_arguments is EqualUnmodifiableMapView) return _arguments;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_arguments);
  }

  @override
  final dynamic result;
  @override
  @JsonKey()
  final String status;
  @override
  @JsonKey()
  final bool isError;

  @override
  String toString() {
    return 'ToolCall(id: $id, name: $name, arguments: $arguments, result: $result, status: $status, isError: $isError)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ToolCallImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            const DeepCollectionEquality()
                .equals(other._arguments, _arguments) &&
            const DeepCollectionEquality().equals(other.result, result) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.isError, isError) || other.isError == isError));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      const DeepCollectionEquality().hash(_arguments),
      const DeepCollectionEquality().hash(result),
      status,
      isError);

  /// Create a copy of ToolCall
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ToolCallImplCopyWith<_$ToolCallImpl> get copyWith =>
      __$$ToolCallImplCopyWithImpl<_$ToolCallImpl>(this, _$identity);
}

abstract class _ToolCall extends ToolCall {
  const factory _ToolCall(
      {required final String id,
      required final String name,
      final Map<String, dynamic> arguments,
      final dynamic result,
      final String status,
      final bool isError}) = _$ToolCallImpl;
  const _ToolCall._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  Map<String, dynamic> get arguments;
  @override
  dynamic get result;
  @override
  String get status;
  @override
  bool get isError;

  /// Create a copy of ToolCall
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ToolCallImplCopyWith<_$ToolCallImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ChatMessage {
  String get id => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  String get thinking => throw _privateConstructorUsedError;
  ApprovalRequest? get approvalRequest => throw _privateConstructorUsedError;
  QuestionRequest? get questionRequest => throw _privateConstructorUsedError;
  List<ToolCall> get toolCalls => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;
  bool get isError => throw _privateConstructorUsedError;
  bool get isStreaming => throw _privateConstructorUsedError;

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ChatMessageCopyWith<ChatMessage> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ChatMessageCopyWith<$Res> {
  factory $ChatMessageCopyWith(
          ChatMessage value, $Res Function(ChatMessage) then) =
      _$ChatMessageCopyWithImpl<$Res, ChatMessage>;
  @useResult
  $Res call(
      {String id,
      String role,
      String content,
      String thinking,
      ApprovalRequest? approvalRequest,
      QuestionRequest? questionRequest,
      List<ToolCall> toolCalls,
      String createdAt,
      bool isError,
      bool isStreaming});

  $ApprovalRequestCopyWith<$Res>? get approvalRequest;
  $QuestionRequestCopyWith<$Res>? get questionRequest;
}

/// @nodoc
class _$ChatMessageCopyWithImpl<$Res, $Val extends ChatMessage>
    implements $ChatMessageCopyWith<$Res> {
  _$ChatMessageCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? role = null,
    Object? content = null,
    Object? thinking = null,
    Object? approvalRequest = freezed,
    Object? questionRequest = freezed,
    Object? toolCalls = null,
    Object? createdAt = null,
    Object? isError = null,
    Object? isStreaming = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      thinking: null == thinking
          ? _value.thinking
          : thinking // ignore: cast_nullable_to_non_nullable
              as String,
      approvalRequest: freezed == approvalRequest
          ? _value.approvalRequest
          : approvalRequest // ignore: cast_nullable_to_non_nullable
              as ApprovalRequest?,
      questionRequest: freezed == questionRequest
          ? _value.questionRequest
          : questionRequest // ignore: cast_nullable_to_non_nullable
              as QuestionRequest?,
      toolCalls: null == toolCalls
          ? _value.toolCalls
          : toolCalls // ignore: cast_nullable_to_non_nullable
              as List<ToolCall>,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
      isError: null == isError
          ? _value.isError
          : isError // ignore: cast_nullable_to_non_nullable
              as bool,
      isStreaming: null == isStreaming
          ? _value.isStreaming
          : isStreaming // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ApprovalRequestCopyWith<$Res>? get approvalRequest {
    if (_value.approvalRequest == null) {
      return null;
    }

    return $ApprovalRequestCopyWith<$Res>(_value.approvalRequest!, (value) {
      return _then(_value.copyWith(approvalRequest: value) as $Val);
    });
  }

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $QuestionRequestCopyWith<$Res>? get questionRequest {
    if (_value.questionRequest == null) {
      return null;
    }

    return $QuestionRequestCopyWith<$Res>(_value.questionRequest!, (value) {
      return _then(_value.copyWith(questionRequest: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ChatMessageImplCopyWith<$Res>
    implements $ChatMessageCopyWith<$Res> {
  factory _$$ChatMessageImplCopyWith(
          _$ChatMessageImpl value, $Res Function(_$ChatMessageImpl) then) =
      __$$ChatMessageImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String role,
      String content,
      String thinking,
      ApprovalRequest? approvalRequest,
      QuestionRequest? questionRequest,
      List<ToolCall> toolCalls,
      String createdAt,
      bool isError,
      bool isStreaming});

  @override
  $ApprovalRequestCopyWith<$Res>? get approvalRequest;
  @override
  $QuestionRequestCopyWith<$Res>? get questionRequest;
}

/// @nodoc
class __$$ChatMessageImplCopyWithImpl<$Res>
    extends _$ChatMessageCopyWithImpl<$Res, _$ChatMessageImpl>
    implements _$$ChatMessageImplCopyWith<$Res> {
  __$$ChatMessageImplCopyWithImpl(
      _$ChatMessageImpl _value, $Res Function(_$ChatMessageImpl) _then)
      : super(_value, _then);

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? role = null,
    Object? content = null,
    Object? thinking = null,
    Object? approvalRequest = freezed,
    Object? questionRequest = freezed,
    Object? toolCalls = null,
    Object? createdAt = null,
    Object? isError = null,
    Object? isStreaming = null,
  }) {
    return _then(_$ChatMessageImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      thinking: null == thinking
          ? _value.thinking
          : thinking // ignore: cast_nullable_to_non_nullable
              as String,
      approvalRequest: freezed == approvalRequest
          ? _value.approvalRequest
          : approvalRequest // ignore: cast_nullable_to_non_nullable
              as ApprovalRequest?,
      questionRequest: freezed == questionRequest
          ? _value.questionRequest
          : questionRequest // ignore: cast_nullable_to_non_nullable
              as QuestionRequest?,
      toolCalls: null == toolCalls
          ? _value._toolCalls
          : toolCalls // ignore: cast_nullable_to_non_nullable
              as List<ToolCall>,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
      isError: null == isError
          ? _value.isError
          : isError // ignore: cast_nullable_to_non_nullable
              as bool,
      isStreaming: null == isStreaming
          ? _value.isStreaming
          : isStreaming // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$ChatMessageImpl extends _ChatMessage {
  const _$ChatMessageImpl(
      {required this.id,
      required this.role,
      this.content = '',
      this.thinking = '',
      this.approvalRequest,
      this.questionRequest,
      final List<ToolCall> toolCalls = const <ToolCall>[],
      this.createdAt = '',
      this.isError = false,
      this.isStreaming = false})
      : _toolCalls = toolCalls,
        super._();

  @override
  final String id;
  @override
  final String role;
  @override
  @JsonKey()
  final String content;
  @override
  @JsonKey()
  final String thinking;
  @override
  final ApprovalRequest? approvalRequest;
  @override
  final QuestionRequest? questionRequest;
  final List<ToolCall> _toolCalls;
  @override
  @JsonKey()
  List<ToolCall> get toolCalls {
    if (_toolCalls is EqualUnmodifiableListView) return _toolCalls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_toolCalls);
  }

  @override
  @JsonKey()
  final String createdAt;
  @override
  @JsonKey()
  final bool isError;
  @override
  @JsonKey()
  final bool isStreaming;

  @override
  String toString() {
    return 'ChatMessage(id: $id, role: $role, content: $content, thinking: $thinking, approvalRequest: $approvalRequest, questionRequest: $questionRequest, toolCalls: $toolCalls, createdAt: $createdAt, isError: $isError, isStreaming: $isStreaming)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ChatMessageImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.thinking, thinking) ||
                other.thinking == thinking) &&
            (identical(other.approvalRequest, approvalRequest) ||
                other.approvalRequest == approvalRequest) &&
            (identical(other.questionRequest, questionRequest) ||
                other.questionRequest == questionRequest) &&
            const DeepCollectionEquality()
                .equals(other._toolCalls, _toolCalls) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.isError, isError) || other.isError == isError) &&
            (identical(other.isStreaming, isStreaming) ||
                other.isStreaming == isStreaming));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      role,
      content,
      thinking,
      approvalRequest,
      questionRequest,
      const DeepCollectionEquality().hash(_toolCalls),
      createdAt,
      isError,
      isStreaming);

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ChatMessageImplCopyWith<_$ChatMessageImpl> get copyWith =>
      __$$ChatMessageImplCopyWithImpl<_$ChatMessageImpl>(this, _$identity);
}

abstract class _ChatMessage extends ChatMessage {
  const factory _ChatMessage(
      {required final String id,
      required final String role,
      final String content,
      final String thinking,
      final ApprovalRequest? approvalRequest,
      final QuestionRequest? questionRequest,
      final List<ToolCall> toolCalls,
      final String createdAt,
      final bool isError,
      final bool isStreaming}) = _$ChatMessageImpl;
  const _ChatMessage._() : super._();

  @override
  String get id;
  @override
  String get role;
  @override
  String get content;
  @override
  String get thinking;
  @override
  ApprovalRequest? get approvalRequest;
  @override
  QuestionRequest? get questionRequest;
  @override
  List<ToolCall> get toolCalls;
  @override
  String get createdAt;
  @override
  bool get isError;
  @override
  bool get isStreaming;

  /// Create a copy of ChatMessage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ChatMessageImplCopyWith<_$ChatMessageImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
