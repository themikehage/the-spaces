// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'agents_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$AgentsState {
  List<Agent> get agents => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  String get searchQuery => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of AgentsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AgentsStateCopyWith<AgentsState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AgentsStateCopyWith<$Res> {
  factory $AgentsStateCopyWith(
          AgentsState value, $Res Function(AgentsState) then) =
      _$AgentsStateCopyWithImpl<$Res, AgentsState>;
  @useResult
  $Res call(
      {List<Agent> agents, bool isLoading, String searchQuery, String? error});
}

/// @nodoc
class _$AgentsStateCopyWithImpl<$Res, $Val extends AgentsState>
    implements $AgentsStateCopyWith<$Res> {
  _$AgentsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AgentsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? agents = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      agents: null == agents
          ? _value.agents
          : agents // ignore: cast_nullable_to_non_nullable
              as List<Agent>,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      searchQuery: null == searchQuery
          ? _value.searchQuery
          : searchQuery // ignore: cast_nullable_to_non_nullable
              as String,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AgentsStateImplCopyWith<$Res>
    implements $AgentsStateCopyWith<$Res> {
  factory _$$AgentsStateImplCopyWith(
          _$AgentsStateImpl value, $Res Function(_$AgentsStateImpl) then) =
      __$$AgentsStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Agent> agents, bool isLoading, String searchQuery, String? error});
}

/// @nodoc
class __$$AgentsStateImplCopyWithImpl<$Res>
    extends _$AgentsStateCopyWithImpl<$Res, _$AgentsStateImpl>
    implements _$$AgentsStateImplCopyWith<$Res> {
  __$$AgentsStateImplCopyWithImpl(
      _$AgentsStateImpl _value, $Res Function(_$AgentsStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of AgentsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? agents = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_$AgentsStateImpl(
      agents: null == agents
          ? _value._agents
          : agents // ignore: cast_nullable_to_non_nullable
              as List<Agent>,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      searchQuery: null == searchQuery
          ? _value.searchQuery
          : searchQuery // ignore: cast_nullable_to_non_nullable
              as String,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$AgentsStateImpl extends _AgentsState {
  const _$AgentsStateImpl(
      {final List<Agent> agents = const <Agent>[],
      this.isLoading = false,
      this.searchQuery = '',
      this.error})
      : _agents = agents,
        super._();

  final List<Agent> _agents;
  @override
  @JsonKey()
  List<Agent> get agents {
    if (_agents is EqualUnmodifiableListView) return _agents;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_agents);
  }

  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final String searchQuery;
  @override
  final String? error;

  @override
  String toString() {
    return 'AgentsState(agents: $agents, isLoading: $isLoading, searchQuery: $searchQuery, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AgentsStateImpl &&
            const DeepCollectionEquality().equals(other._agents, _agents) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_agents),
      isLoading,
      searchQuery,
      error);

  /// Create a copy of AgentsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AgentsStateImplCopyWith<_$AgentsStateImpl> get copyWith =>
      __$$AgentsStateImplCopyWithImpl<_$AgentsStateImpl>(this, _$identity);
}

abstract class _AgentsState extends AgentsState {
  const factory _AgentsState(
      {final List<Agent> agents,
      final bool isLoading,
      final String searchQuery,
      final String? error}) = _$AgentsStateImpl;
  const _AgentsState._() : super._();

  @override
  List<Agent> get agents;
  @override
  bool get isLoading;
  @override
  String get searchQuery;
  @override
  String? get error;

  /// Create a copy of AgentsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AgentsStateImplCopyWith<_$AgentsStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
