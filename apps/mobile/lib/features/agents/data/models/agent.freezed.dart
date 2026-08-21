// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'agent.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$Agent {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get model => throw _privateConstructorUsedError;
  String? get instruction => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  List<String> get tools => throw _privateConstructorUsedError;
  List<String> get skills => throw _privateConstructorUsedError;
  bool get streaming => throw _privateConstructorUsedError;
  int get activeObservers => throw _privateConstructorUsedError;
  String? get createdAt => throw _privateConstructorUsedError;
  String? get updatedAt => throw _privateConstructorUsedError;
  Map<String, dynamic>? get definition => throw _privateConstructorUsedError;

  /// Create a copy of Agent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AgentCopyWith<Agent> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AgentCopyWith<$Res> {
  factory $AgentCopyWith(Agent value, $Res Function(Agent) then) =
      _$AgentCopyWithImpl<$Res, Agent>;
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String? model,
      String? instruction,
      String? avatarUrl,
      String status,
      List<String> tools,
      List<String> skills,
      bool streaming,
      int activeObservers,
      String? createdAt,
      String? updatedAt,
      Map<String, dynamic>? definition});
}

/// @nodoc
class _$AgentCopyWithImpl<$Res, $Val extends Agent>
    implements $AgentCopyWith<$Res> {
  _$AgentCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Agent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? model = freezed,
    Object? instruction = freezed,
    Object? avatarUrl = freezed,
    Object? status = null,
    Object? tools = null,
    Object? skills = null,
    Object? streaming = null,
    Object? activeObservers = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? definition = freezed,
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
      model: freezed == model
          ? _value.model
          : model // ignore: cast_nullable_to_non_nullable
              as String?,
      instruction: freezed == instruction
          ? _value.instruction
          : instruction // ignore: cast_nullable_to_non_nullable
              as String?,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      tools: null == tools
          ? _value.tools
          : tools // ignore: cast_nullable_to_non_nullable
              as List<String>,
      skills: null == skills
          ? _value.skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>,
      streaming: null == streaming
          ? _value.streaming
          : streaming // ignore: cast_nullable_to_non_nullable
              as bool,
      activeObservers: null == activeObservers
          ? _value.activeObservers
          : activeObservers // ignore: cast_nullable_to_non_nullable
              as int,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      definition: freezed == definition
          ? _value.definition
          : definition // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AgentImplCopyWith<$Res> implements $AgentCopyWith<$Res> {
  factory _$$AgentImplCopyWith(
          _$AgentImpl value, $Res Function(_$AgentImpl) then) =
      __$$AgentImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String? model,
      String? instruction,
      String? avatarUrl,
      String status,
      List<String> tools,
      List<String> skills,
      bool streaming,
      int activeObservers,
      String? createdAt,
      String? updatedAt,
      Map<String, dynamic>? definition});
}

/// @nodoc
class __$$AgentImplCopyWithImpl<$Res>
    extends _$AgentCopyWithImpl<$Res, _$AgentImpl>
    implements _$$AgentImplCopyWith<$Res> {
  __$$AgentImplCopyWithImpl(
      _$AgentImpl _value, $Res Function(_$AgentImpl) _then)
      : super(_value, _then);

  /// Create a copy of Agent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? model = freezed,
    Object? instruction = freezed,
    Object? avatarUrl = freezed,
    Object? status = null,
    Object? tools = null,
    Object? skills = null,
    Object? streaming = null,
    Object? activeObservers = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? definition = freezed,
  }) {
    return _then(_$AgentImpl(
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
      model: freezed == model
          ? _value.model
          : model // ignore: cast_nullable_to_non_nullable
              as String?,
      instruction: freezed == instruction
          ? _value.instruction
          : instruction // ignore: cast_nullable_to_non_nullable
              as String?,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      tools: null == tools
          ? _value._tools
          : tools // ignore: cast_nullable_to_non_nullable
              as List<String>,
      skills: null == skills
          ? _value._skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>,
      streaming: null == streaming
          ? _value.streaming
          : streaming // ignore: cast_nullable_to_non_nullable
              as bool,
      activeObservers: null == activeObservers
          ? _value.activeObservers
          : activeObservers // ignore: cast_nullable_to_non_nullable
              as int,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      definition: freezed == definition
          ? _value._definition
          : definition // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$AgentImpl extends _Agent {
  const _$AgentImpl(
      {required this.id,
      required this.name,
      this.description,
      this.model,
      this.instruction,
      this.avatarUrl,
      this.status = 'ready',
      final List<String> tools = const <String>[],
      final List<String> skills = const <String>[],
      this.streaming = false,
      this.activeObservers = 0,
      this.createdAt,
      this.updatedAt,
      final Map<String, dynamic>? definition})
      : _tools = tools,
        _skills = skills,
        _definition = definition,
        super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String? description;
  @override
  final String? model;
  @override
  final String? instruction;
  @override
  final String? avatarUrl;
  @override
  @JsonKey()
  final String status;
  final List<String> _tools;
  @override
  @JsonKey()
  List<String> get tools {
    if (_tools is EqualUnmodifiableListView) return _tools;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_tools);
  }

  final List<String> _skills;
  @override
  @JsonKey()
  List<String> get skills {
    if (_skills is EqualUnmodifiableListView) return _skills;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_skills);
  }

  @override
  @JsonKey()
  final bool streaming;
  @override
  @JsonKey()
  final int activeObservers;
  @override
  final String? createdAt;
  @override
  final String? updatedAt;
  final Map<String, dynamic>? _definition;
  @override
  Map<String, dynamic>? get definition {
    final value = _definition;
    if (value == null) return null;
    if (_definition is EqualUnmodifiableMapView) return _definition;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'Agent(id: $id, name: $name, description: $description, model: $model, instruction: $instruction, avatarUrl: $avatarUrl, status: $status, tools: $tools, skills: $skills, streaming: $streaming, activeObservers: $activeObservers, createdAt: $createdAt, updatedAt: $updatedAt, definition: $definition)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AgentImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.model, model) || other.model == model) &&
            (identical(other.instruction, instruction) ||
                other.instruction == instruction) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality().equals(other._tools, _tools) &&
            const DeepCollectionEquality().equals(other._skills, _skills) &&
            (identical(other.streaming, streaming) ||
                other.streaming == streaming) &&
            (identical(other.activeObservers, activeObservers) ||
                other.activeObservers == activeObservers) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            const DeepCollectionEquality()
                .equals(other._definition, _definition));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      description,
      model,
      instruction,
      avatarUrl,
      status,
      const DeepCollectionEquality().hash(_tools),
      const DeepCollectionEquality().hash(_skills),
      streaming,
      activeObservers,
      createdAt,
      updatedAt,
      const DeepCollectionEquality().hash(_definition));

  /// Create a copy of Agent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AgentImplCopyWith<_$AgentImpl> get copyWith =>
      __$$AgentImplCopyWithImpl<_$AgentImpl>(this, _$identity);
}

abstract class _Agent extends Agent {
  const factory _Agent(
      {required final String id,
      required final String name,
      final String? description,
      final String? model,
      final String? instruction,
      final String? avatarUrl,
      final String status,
      final List<String> tools,
      final List<String> skills,
      final bool streaming,
      final int activeObservers,
      final String? createdAt,
      final String? updatedAt,
      final Map<String, dynamic>? definition}) = _$AgentImpl;
  const _Agent._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String? get description;
  @override
  String? get model;
  @override
  String? get instruction;
  @override
  String? get avatarUrl;
  @override
  String get status;
  @override
  List<String> get tools;
  @override
  List<String> get skills;
  @override
  bool get streaming;
  @override
  int get activeObservers;
  @override
  String? get createdAt;
  @override
  String? get updatedAt;
  @override
  Map<String, dynamic>? get definition;

  /// Create a copy of Agent
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AgentImplCopyWith<_$AgentImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
