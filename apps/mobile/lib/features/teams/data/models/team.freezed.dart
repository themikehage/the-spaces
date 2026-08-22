// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'team.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$TeamMember {
  String get agentId => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  String? get title => throw _privateConstructorUsedError;
  String? get systemPromptOverride => throw _privateConstructorUsedError;
  int get order => throw _privateConstructorUsedError;

  /// Create a copy of TeamMember
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeamMemberCopyWith<TeamMember> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamMemberCopyWith<$Res> {
  factory $TeamMemberCopyWith(
          TeamMember value, $Res Function(TeamMember) then) =
      _$TeamMemberCopyWithImpl<$Res, TeamMember>;
  @useResult
  $Res call(
      {String agentId,
      String role,
      String? title,
      String? systemPromptOverride,
      int order});
}

/// @nodoc
class _$TeamMemberCopyWithImpl<$Res, $Val extends TeamMember>
    implements $TeamMemberCopyWith<$Res> {
  _$TeamMemberCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TeamMember
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? agentId = null,
    Object? role = null,
    Object? title = freezed,
    Object? systemPromptOverride = freezed,
    Object? order = null,
  }) {
    return _then(_value.copyWith(
      agentId: null == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      title: freezed == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String?,
      systemPromptOverride: freezed == systemPromptOverride
          ? _value.systemPromptOverride
          : systemPromptOverride // ignore: cast_nullable_to_non_nullable
              as String?,
      order: null == order
          ? _value.order
          : order // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TeamMemberImplCopyWith<$Res>
    implements $TeamMemberCopyWith<$Res> {
  factory _$$TeamMemberImplCopyWith(
          _$TeamMemberImpl value, $Res Function(_$TeamMemberImpl) then) =
      __$$TeamMemberImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String agentId,
      String role,
      String? title,
      String? systemPromptOverride,
      int order});
}

/// @nodoc
class __$$TeamMemberImplCopyWithImpl<$Res>
    extends _$TeamMemberCopyWithImpl<$Res, _$TeamMemberImpl>
    implements _$$TeamMemberImplCopyWith<$Res> {
  __$$TeamMemberImplCopyWithImpl(
      _$TeamMemberImpl _value, $Res Function(_$TeamMemberImpl) _then)
      : super(_value, _then);

  /// Create a copy of TeamMember
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? agentId = null,
    Object? role = null,
    Object? title = freezed,
    Object? systemPromptOverride = freezed,
    Object? order = null,
  }) {
    return _then(_$TeamMemberImpl(
      agentId: null == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      title: freezed == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String?,
      systemPromptOverride: freezed == systemPromptOverride
          ? _value.systemPromptOverride
          : systemPromptOverride // ignore: cast_nullable_to_non_nullable
              as String?,
      order: null == order
          ? _value.order
          : order // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc

class _$TeamMemberImpl extends _TeamMember {
  const _$TeamMemberImpl(
      {required this.agentId,
      this.role = 'member',
      this.title,
      this.systemPromptOverride,
      this.order = 0})
      : super._();

  @override
  final String agentId;
  @override
  @JsonKey()
  final String role;
  @override
  final String? title;
  @override
  final String? systemPromptOverride;
  @override
  @JsonKey()
  final int order;

  @override
  String toString() {
    return 'TeamMember(agentId: $agentId, role: $role, title: $title, systemPromptOverride: $systemPromptOverride, order: $order)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamMemberImpl &&
            (identical(other.agentId, agentId) || other.agentId == agentId) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.systemPromptOverride, systemPromptOverride) ||
                other.systemPromptOverride == systemPromptOverride) &&
            (identical(other.order, order) || other.order == order));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType, agentId, role, title, systemPromptOverride, order);

  /// Create a copy of TeamMember
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamMemberImplCopyWith<_$TeamMemberImpl> get copyWith =>
      __$$TeamMemberImplCopyWithImpl<_$TeamMemberImpl>(this, _$identity);
}

abstract class _TeamMember extends TeamMember {
  const factory _TeamMember(
      {required final String agentId,
      final String role,
      final String? title,
      final String? systemPromptOverride,
      final int order}) = _$TeamMemberImpl;
  const _TeamMember._() : super._();

  @override
  String get agentId;
  @override
  String get role;
  @override
  String? get title;
  @override
  String? get systemPromptOverride;
  @override
  int get order;

  /// Create a copy of TeamMember
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeamMemberImplCopyWith<_$TeamMemberImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$Team {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String get mode => throw _privateConstructorUsedError;
  String get teamType => throw _privateConstructorUsedError;
  List<TeamMember> get members => throw _privateConstructorUsedError;
  int get maxRounds => throw _privateConstructorUsedError;
  int get sessionCount => throw _privateConstructorUsedError;
  List<String> get agentIds => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  String? get tag => throw _privateConstructorUsedError;
  String? get blueprintId => throw _privateConstructorUsedError;
  String? get createdAt => throw _privateConstructorUsedError;
  String? get updatedAt => throw _privateConstructorUsedError;

  /// Create a copy of Team
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeamCopyWith<Team> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamCopyWith<$Res> {
  factory $TeamCopyWith(Team value, $Res Function(Team) then) =
      _$TeamCopyWithImpl<$Res, Team>;
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String mode,
      String teamType,
      List<TeamMember> members,
      int maxRounds,
      int sessionCount,
      List<String> agentIds,
      String? avatarUrl,
      String? tag,
      String? blueprintId,
      String? createdAt,
      String? updatedAt});
}

/// @nodoc
class _$TeamCopyWithImpl<$Res, $Val extends Team>
    implements $TeamCopyWith<$Res> {
  _$TeamCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Team
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? mode = null,
    Object? teamType = null,
    Object? members = null,
    Object? maxRounds = null,
    Object? sessionCount = null,
    Object? agentIds = null,
    Object? avatarUrl = freezed,
    Object? tag = freezed,
    Object? blueprintId = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
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
      mode: null == mode
          ? _value.mode
          : mode // ignore: cast_nullable_to_non_nullable
              as String,
      teamType: null == teamType
          ? _value.teamType
          : teamType // ignore: cast_nullable_to_non_nullable
              as String,
      members: null == members
          ? _value.members
          : members // ignore: cast_nullable_to_non_nullable
              as List<TeamMember>,
      maxRounds: null == maxRounds
          ? _value.maxRounds
          : maxRounds // ignore: cast_nullable_to_non_nullable
              as int,
      sessionCount: null == sessionCount
          ? _value.sessionCount
          : sessionCount // ignore: cast_nullable_to_non_nullable
              as int,
      agentIds: null == agentIds
          ? _value.agentIds
          : agentIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      blueprintId: freezed == blueprintId
          ? _value.blueprintId
          : blueprintId // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TeamImplCopyWith<$Res> implements $TeamCopyWith<$Res> {
  factory _$$TeamImplCopyWith(
          _$TeamImpl value, $Res Function(_$TeamImpl) then) =
      __$$TeamImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String mode,
      String teamType,
      List<TeamMember> members,
      int maxRounds,
      int sessionCount,
      List<String> agentIds,
      String? avatarUrl,
      String? tag,
      String? blueprintId,
      String? createdAt,
      String? updatedAt});
}

/// @nodoc
class __$$TeamImplCopyWithImpl<$Res>
    extends _$TeamCopyWithImpl<$Res, _$TeamImpl>
    implements _$$TeamImplCopyWith<$Res> {
  __$$TeamImplCopyWithImpl(_$TeamImpl _value, $Res Function(_$TeamImpl) _then)
      : super(_value, _then);

  /// Create a copy of Team
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? mode = null,
    Object? teamType = null,
    Object? members = null,
    Object? maxRounds = null,
    Object? sessionCount = null,
    Object? agentIds = null,
    Object? avatarUrl = freezed,
    Object? tag = freezed,
    Object? blueprintId = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$TeamImpl(
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
      mode: null == mode
          ? _value.mode
          : mode // ignore: cast_nullable_to_non_nullable
              as String,
      teamType: null == teamType
          ? _value.teamType
          : teamType // ignore: cast_nullable_to_non_nullable
              as String,
      members: null == members
          ? _value._members
          : members // ignore: cast_nullable_to_non_nullable
              as List<TeamMember>,
      maxRounds: null == maxRounds
          ? _value.maxRounds
          : maxRounds // ignore: cast_nullable_to_non_nullable
              as int,
      sessionCount: null == sessionCount
          ? _value.sessionCount
          : sessionCount // ignore: cast_nullable_to_non_nullable
              as int,
      agentIds: null == agentIds
          ? _value._agentIds
          : agentIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      blueprintId: freezed == blueprintId
          ? _value.blueprintId
          : blueprintId // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$TeamImpl extends _Team {
  const _$TeamImpl(
      {required this.id,
      required this.name,
      this.description,
      this.mode = 'debate',
      this.teamType = 'Orchestration',
      final List<TeamMember> members = const <TeamMember>[],
      this.maxRounds = 5,
      this.sessionCount = 0,
      final List<String> agentIds = const <String>[],
      this.avatarUrl,
      this.tag,
      this.blueprintId,
      this.createdAt,
      this.updatedAt})
      : _members = members,
        _agentIds = agentIds,
        super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String? description;
  @override
  @JsonKey()
  final String mode;
  @override
  @JsonKey()
  final String teamType;
  final List<TeamMember> _members;
  @override
  @JsonKey()
  List<TeamMember> get members {
    if (_members is EqualUnmodifiableListView) return _members;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_members);
  }

  @override
  @JsonKey()
  final int maxRounds;
  @override
  @JsonKey()
  final int sessionCount;
  final List<String> _agentIds;
  @override
  @JsonKey()
  List<String> get agentIds {
    if (_agentIds is EqualUnmodifiableListView) return _agentIds;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_agentIds);
  }

  @override
  final String? avatarUrl;
  @override
  final String? tag;
  @override
  final String? blueprintId;
  @override
  final String? createdAt;
  @override
  final String? updatedAt;

  @override
  String toString() {
    return 'Team(id: $id, name: $name, description: $description, mode: $mode, teamType: $teamType, members: $members, maxRounds: $maxRounds, sessionCount: $sessionCount, agentIds: $agentIds, avatarUrl: $avatarUrl, tag: $tag, blueprintId: $blueprintId, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.mode, mode) || other.mode == mode) &&
            (identical(other.teamType, teamType) ||
                other.teamType == teamType) &&
            const DeepCollectionEquality().equals(other._members, _members) &&
            (identical(other.maxRounds, maxRounds) ||
                other.maxRounds == maxRounds) &&
            (identical(other.sessionCount, sessionCount) ||
                other.sessionCount == sessionCount) &&
            const DeepCollectionEquality().equals(other._agentIds, _agentIds) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            (identical(other.tag, tag) || other.tag == tag) &&
            (identical(other.blueprintId, blueprintId) ||
                other.blueprintId == blueprintId) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      description,
      mode,
      teamType,
      const DeepCollectionEquality().hash(_members),
      maxRounds,
      sessionCount,
      const DeepCollectionEquality().hash(_agentIds),
      avatarUrl,
      tag,
      blueprintId,
      createdAt,
      updatedAt);

  /// Create a copy of Team
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamImplCopyWith<_$TeamImpl> get copyWith =>
      __$$TeamImplCopyWithImpl<_$TeamImpl>(this, _$identity);
}

abstract class _Team extends Team {
  const factory _Team(
      {required final String id,
      required final String name,
      final String? description,
      final String mode,
      final String teamType,
      final List<TeamMember> members,
      final int maxRounds,
      final int sessionCount,
      final List<String> agentIds,
      final String? avatarUrl,
      final String? tag,
      final String? blueprintId,
      final String? createdAt,
      final String? updatedAt}) = _$TeamImpl;
  const _Team._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String? get description;
  @override
  String get mode;
  @override
  String get teamType;
  @override
  List<TeamMember> get members;
  @override
  int get maxRounds;
  @override
  int get sessionCount;
  @override
  List<String> get agentIds;
  @override
  String? get avatarUrl;
  @override
  String? get tag;
  @override
  String? get blueprintId;
  @override
  String? get createdAt;
  @override
  String? get updatedAt;

  /// Create a copy of Team
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeamImplCopyWith<_$TeamImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
