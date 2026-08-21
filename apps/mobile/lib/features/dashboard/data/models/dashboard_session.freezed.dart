// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dashboard_session.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$DashboardSession {
  String get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String? get agentId => throw _privateConstructorUsedError;
  String? get projectId => throw _privateConstructorUsedError;
  String get updatedAt => throw _privateConstructorUsedError;
  int get messageCount => throw _privateConstructorUsedError;

  /// Create a copy of DashboardSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DashboardSessionCopyWith<DashboardSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DashboardSessionCopyWith<$Res> {
  factory $DashboardSessionCopyWith(
          DashboardSession value, $Res Function(DashboardSession) then) =
      _$DashboardSessionCopyWithImpl<$Res, DashboardSession>;
  @useResult
  $Res call(
      {String id,
      String title,
      String status,
      String? agentId,
      String? projectId,
      String updatedAt,
      int messageCount});
}

/// @nodoc
class _$DashboardSessionCopyWithImpl<$Res, $Val extends DashboardSession>
    implements $DashboardSessionCopyWith<$Res> {
  _$DashboardSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DashboardSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? status = null,
    Object? agentId = freezed,
    Object? projectId = freezed,
    Object? updatedAt = null,
    Object? messageCount = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String,
      messageCount: null == messageCount
          ? _value.messageCount
          : messageCount // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DashboardSessionImplCopyWith<$Res>
    implements $DashboardSessionCopyWith<$Res> {
  factory _$$DashboardSessionImplCopyWith(_$DashboardSessionImpl value,
          $Res Function(_$DashboardSessionImpl) then) =
      __$$DashboardSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String title,
      String status,
      String? agentId,
      String? projectId,
      String updatedAt,
      int messageCount});
}

/// @nodoc
class __$$DashboardSessionImplCopyWithImpl<$Res>
    extends _$DashboardSessionCopyWithImpl<$Res, _$DashboardSessionImpl>
    implements _$$DashboardSessionImplCopyWith<$Res> {
  __$$DashboardSessionImplCopyWithImpl(_$DashboardSessionImpl _value,
      $Res Function(_$DashboardSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of DashboardSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? status = null,
    Object? agentId = freezed,
    Object? projectId = freezed,
    Object? updatedAt = null,
    Object? messageCount = null,
  }) {
    return _then(_$DashboardSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      projectId: freezed == projectId
          ? _value.projectId
          : projectId // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String,
      messageCount: null == messageCount
          ? _value.messageCount
          : messageCount // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc

class _$DashboardSessionImpl extends _DashboardSession {
  const _$DashboardSessionImpl(
      {required this.id,
      this.title = '',
      this.status = 'idle',
      this.agentId,
      this.projectId,
      this.updatedAt = '',
      this.messageCount = 0})
      : super._();

  @override
  final String id;
  @override
  @JsonKey()
  final String title;
  @override
  @JsonKey()
  final String status;
  @override
  final String? agentId;
  @override
  final String? projectId;
  @override
  @JsonKey()
  final String updatedAt;
  @override
  @JsonKey()
  final int messageCount;

  @override
  String toString() {
    return 'DashboardSession(id: $id, title: $title, status: $status, agentId: $agentId, projectId: $projectId, updatedAt: $updatedAt, messageCount: $messageCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DashboardSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.agentId, agentId) || other.agentId == agentId) &&
            (identical(other.projectId, projectId) ||
                other.projectId == projectId) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.messageCount, messageCount) ||
                other.messageCount == messageCount));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, title, status, agentId,
      projectId, updatedAt, messageCount);

  /// Create a copy of DashboardSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DashboardSessionImplCopyWith<_$DashboardSessionImpl> get copyWith =>
      __$$DashboardSessionImplCopyWithImpl<_$DashboardSessionImpl>(
          this, _$identity);
}

abstract class _DashboardSession extends DashboardSession {
  const factory _DashboardSession(
      {required final String id,
      final String title,
      final String status,
      final String? agentId,
      final String? projectId,
      final String updatedAt,
      final int messageCount}) = _$DashboardSessionImpl;
  const _DashboardSession._() : super._();

  @override
  String get id;
  @override
  String get title;
  @override
  String get status;
  @override
  String? get agentId;
  @override
  String? get projectId;
  @override
  String get updatedAt;
  @override
  int get messageCount;

  /// Create a copy of DashboardSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DashboardSessionImplCopyWith<_$DashboardSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
