// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'create_session_input.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$CreateSessionInput {
  String get title => throw _privateConstructorUsedError;
  String? get agentId => throw _privateConstructorUsedError;
  String? get projectId => throw _privateConstructorUsedError;
  List<String>? get tools => throw _privateConstructorUsedError;
  List<String>? get skills => throw _privateConstructorUsedError;

  /// Create a copy of CreateSessionInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CreateSessionInputCopyWith<CreateSessionInput> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CreateSessionInputCopyWith<$Res> {
  factory $CreateSessionInputCopyWith(
          CreateSessionInput value, $Res Function(CreateSessionInput) then) =
      _$CreateSessionInputCopyWithImpl<$Res, CreateSessionInput>;
  @useResult
  $Res call(
      {String title,
      String? agentId,
      String? projectId,
      List<String>? tools,
      List<String>? skills});
}

/// @nodoc
class _$CreateSessionInputCopyWithImpl<$Res, $Val extends CreateSessionInput>
    implements $CreateSessionInputCopyWith<$Res> {
  _$CreateSessionInputCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CreateSessionInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? agentId = freezed,
    Object? projectId = freezed,
    Object? tools = freezed,
    Object? skills = freezed,
  }) {
    return _then(_value.copyWith(
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as String?,
      tools: freezed == tools
          ? _value.tools
          : tools // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      skills: freezed == skills
          ? _value.skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CreateSessionInputImplCopyWith<$Res>
    implements $CreateSessionInputCopyWith<$Res> {
  factory _$$CreateSessionInputImplCopyWith(_$CreateSessionInputImpl value,
          $Res Function(_$CreateSessionInputImpl) then) =
      __$$CreateSessionInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String title,
      String? agentId,
      String? projectId,
      List<String>? tools,
      List<String>? skills});
}

/// @nodoc
class __$$CreateSessionInputImplCopyWithImpl<$Res>
    extends _$CreateSessionInputCopyWithImpl<$Res, _$CreateSessionInputImpl>
    implements _$$CreateSessionInputImplCopyWith<$Res> {
  __$$CreateSessionInputImplCopyWithImpl(_$CreateSessionInputImpl _value,
      $Res Function(_$CreateSessionInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of CreateSessionInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? agentId = freezed,
    Object? projectId = freezed,
    Object? tools = freezed,
    Object? skills = freezed,
  }) {
    return _then(_$CreateSessionInputImpl(
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as String?,
      tools: freezed == tools
          ? _value._tools
          : tools // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      skills: freezed == skills
          ? _value._skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ));
  }
}

/// @nodoc

class _$CreateSessionInputImpl extends _CreateSessionInput {
  const _$CreateSessionInputImpl(
      {required this.title,
      this.agentId,
      this.projectId,
      final List<String>? tools,
      final List<String>? skills})
      : _tools = tools,
        _skills = skills,
        super._();

  @override
  final String title;
  @override
  final String? agentId;
  @override
  final String? projectId;
  final List<String>? _tools;
  @override
  List<String>? get tools {
    final value = _tools;
    if (value == null) return null;
    if (_tools is EqualUnmodifiableListView) return _tools;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  final List<String>? _skills;
  @override
  List<String>? get skills {
    final value = _skills;
    if (value == null) return null;
    if (_skills is EqualUnmodifiableListView) return _skills;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'CreateSessionInput(title: $title, agentId: $agentId, projectId: $projectId, tools: $tools, skills: $skills)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CreateSessionInputImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.agentId, agentId) || other.agentId == agentId) &&
            (identical(other.projectId, projectId) ||
                other.projectId == projectId) &&
            const DeepCollectionEquality().equals(other._tools, _tools) &&
            const DeepCollectionEquality().equals(other._skills, _skills));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      title,
      agentId,
      projectId,
      const DeepCollectionEquality().hash(_tools),
      const DeepCollectionEquality().hash(_skills));

  /// Create a copy of CreateSessionInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CreateSessionInputImplCopyWith<_$CreateSessionInputImpl> get copyWith =>
      __$$CreateSessionInputImplCopyWithImpl<_$CreateSessionInputImpl>(
          this, _$identity);
}

abstract class _CreateSessionInput extends CreateSessionInput {
  const factory _CreateSessionInput(
      {required final String title,
      final String? agentId,
      final String? projectId,
      final List<String>? tools,
      final List<String>? skills}) = _$CreateSessionInputImpl;
  const _CreateSessionInput._() : super._();

  @override
  String get title;
  @override
  String? get agentId;
  @override
  String? get projectId;
  @override
  List<String>? get tools;
  @override
  List<String>? get skills;

  /// Create a copy of CreateSessionInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CreateSessionInputImplCopyWith<_$CreateSessionInputImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
