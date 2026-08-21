// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dashboard_project.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$DashboardProject {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  int get sessionCount => throw _privateConstructorUsedError;
  String get updatedAt => throw _privateConstructorUsedError;

  /// Create a copy of DashboardProject
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DashboardProjectCopyWith<DashboardProject> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DashboardProjectCopyWith<$Res> {
  factory $DashboardProjectCopyWith(
          DashboardProject value, $Res Function(DashboardProject) then) =
      _$DashboardProjectCopyWithImpl<$Res, DashboardProject>;
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      int sessionCount,
      String updatedAt});
}

/// @nodoc
class _$DashboardProjectCopyWithImpl<$Res, $Val extends DashboardProject>
    implements $DashboardProjectCopyWith<$Res> {
  _$DashboardProjectCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DashboardProject
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? sessionCount = null,
    Object? updatedAt = null,
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
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      sessionCount: null == sessionCount
          ? _value.sessionCount
          : sessionCount // ignore: cast_nullable_to_non_nullable
              as int,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DashboardProjectImplCopyWith<$Res>
    implements $DashboardProjectCopyWith<$Res> {
  factory _$$DashboardProjectImplCopyWith(_$DashboardProjectImpl value,
          $Res Function(_$DashboardProjectImpl) then) =
      __$$DashboardProjectImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      int sessionCount,
      String updatedAt});
}

/// @nodoc
class __$$DashboardProjectImplCopyWithImpl<$Res>
    extends _$DashboardProjectCopyWithImpl<$Res, _$DashboardProjectImpl>
    implements _$$DashboardProjectImplCopyWith<$Res> {
  __$$DashboardProjectImplCopyWithImpl(_$DashboardProjectImpl _value,
      $Res Function(_$DashboardProjectImpl) _then)
      : super(_value, _then);

  /// Create a copy of DashboardProject
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? sessionCount = null,
    Object? updatedAt = null,
  }) {
    return _then(_$DashboardProjectImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      sessionCount: null == sessionCount
          ? _value.sessionCount
          : sessionCount // ignore: cast_nullable_to_non_nullable
              as int,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$DashboardProjectImpl extends _DashboardProject {
  const _$DashboardProjectImpl(
      {required this.id,
      required this.name,
      this.description,
      this.sessionCount = 0,
      this.updatedAt = ''})
      : super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String? description;
  @override
  @JsonKey()
  final int sessionCount;
  @override
  @JsonKey()
  final String updatedAt;

  @override
  String toString() {
    return 'DashboardProject(id: $id, name: $name, description: $description, sessionCount: $sessionCount, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DashboardProjectImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.sessionCount, sessionCount) ||
                other.sessionCount == sessionCount) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, id, name, description, sessionCount, updatedAt);

  /// Create a copy of DashboardProject
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DashboardProjectImplCopyWith<_$DashboardProjectImpl> get copyWith =>
      __$$DashboardProjectImplCopyWithImpl<_$DashboardProjectImpl>(
          this, _$identity);
}

abstract class _DashboardProject extends DashboardProject {
  const factory _DashboardProject(
      {required final String id,
      required final String name,
      final String? description,
      final int sessionCount,
      final String updatedAt}) = _$DashboardProjectImpl;
  const _DashboardProject._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String? get description;
  @override
  int get sessionCount;
  @override
  String get updatedAt;

  /// Create a copy of DashboardProject
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DashboardProjectImplCopyWith<_$DashboardProjectImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
