// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'teams_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$TeamsState {
  List<Team> get teams => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  String get searchQuery => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of TeamsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeamsStateCopyWith<TeamsState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamsStateCopyWith<$Res> {
  factory $TeamsStateCopyWith(
          TeamsState value, $Res Function(TeamsState) then) =
      _$TeamsStateCopyWithImpl<$Res, TeamsState>;
  @useResult
  $Res call(
      {List<Team> teams, bool isLoading, String searchQuery, String? error});
}

/// @nodoc
class _$TeamsStateCopyWithImpl<$Res, $Val extends TeamsState>
    implements $TeamsStateCopyWith<$Res> {
  _$TeamsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TeamsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? teams = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      teams: null == teams
          ? _value.teams
          : teams // ignore: cast_nullable_to_non_nullable
              as List<Team>,
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
abstract class _$$TeamsStateImplCopyWith<$Res>
    implements $TeamsStateCopyWith<$Res> {
  factory _$$TeamsStateImplCopyWith(
          _$TeamsStateImpl value, $Res Function(_$TeamsStateImpl) then) =
      __$$TeamsStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Team> teams, bool isLoading, String searchQuery, String? error});
}

/// @nodoc
class __$$TeamsStateImplCopyWithImpl<$Res>
    extends _$TeamsStateCopyWithImpl<$Res, _$TeamsStateImpl>
    implements _$$TeamsStateImplCopyWith<$Res> {
  __$$TeamsStateImplCopyWithImpl(
      _$TeamsStateImpl _value, $Res Function(_$TeamsStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of TeamsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? teams = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_$TeamsStateImpl(
      teams: null == teams
          ? _value._teams
          : teams // ignore: cast_nullable_to_non_nullable
              as List<Team>,
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

class _$TeamsStateImpl extends _TeamsState {
  const _$TeamsStateImpl(
      {final List<Team> teams = const <Team>[],
      this.isLoading = false,
      this.searchQuery = '',
      this.error})
      : _teams = teams,
        super._();

  final List<Team> _teams;
  @override
  @JsonKey()
  List<Team> get teams {
    if (_teams is EqualUnmodifiableListView) return _teams;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_teams);
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
    return 'TeamsState(teams: $teams, isLoading: $isLoading, searchQuery: $searchQuery, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamsStateImpl &&
            const DeepCollectionEquality().equals(other._teams, _teams) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_teams),
      isLoading,
      searchQuery,
      error);

  /// Create a copy of TeamsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamsStateImplCopyWith<_$TeamsStateImpl> get copyWith =>
      __$$TeamsStateImplCopyWithImpl<_$TeamsStateImpl>(this, _$identity);
}

abstract class _TeamsState extends TeamsState {
  const factory _TeamsState(
      {final List<Team> teams,
      final bool isLoading,
      final String searchQuery,
      final String? error}) = _$TeamsStateImpl;
  const _TeamsState._() : super._();

  @override
  List<Team> get teams;
  @override
  bool get isLoading;
  @override
  String get searchQuery;
  @override
  String? get error;

  /// Create a copy of TeamsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeamsStateImplCopyWith<_$TeamsStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
