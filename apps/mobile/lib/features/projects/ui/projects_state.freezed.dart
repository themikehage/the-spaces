// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'projects_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ProjectsState {
  List<Project> get projects => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  String get searchQuery => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of ProjectsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ProjectsStateCopyWith<ProjectsState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProjectsStateCopyWith<$Res> {
  factory $ProjectsStateCopyWith(
          ProjectsState value, $Res Function(ProjectsState) then) =
      _$ProjectsStateCopyWithImpl<$Res, ProjectsState>;
  @useResult
  $Res call(
      {List<Project> projects,
      bool isLoading,
      String searchQuery,
      String? error});
}

/// @nodoc
class _$ProjectsStateCopyWithImpl<$Res, $Val extends ProjectsState>
    implements $ProjectsStateCopyWith<$Res> {
  _$ProjectsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ProjectsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? projects = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      projects: null == projects
          ? _value.projects
          : projects // ignore: cast_nullable_to_non_nullable
              as List<Project>,
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
abstract class _$$ProjectsStateImplCopyWith<$Res>
    implements $ProjectsStateCopyWith<$Res> {
  factory _$$ProjectsStateImplCopyWith(
          _$ProjectsStateImpl value, $Res Function(_$ProjectsStateImpl) then) =
      __$$ProjectsStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Project> projects,
      bool isLoading,
      String searchQuery,
      String? error});
}

/// @nodoc
class __$$ProjectsStateImplCopyWithImpl<$Res>
    extends _$ProjectsStateCopyWithImpl<$Res, _$ProjectsStateImpl>
    implements _$$ProjectsStateImplCopyWith<$Res> {
  __$$ProjectsStateImplCopyWithImpl(
      _$ProjectsStateImpl _value, $Res Function(_$ProjectsStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProjectsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? projects = null,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_$ProjectsStateImpl(
      projects: null == projects
          ? _value._projects
          : projects // ignore: cast_nullable_to_non_nullable
              as List<Project>,
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

class _$ProjectsStateImpl extends _ProjectsState {
  const _$ProjectsStateImpl(
      {final List<Project> projects = const <Project>[],
      this.isLoading = false,
      this.searchQuery = '',
      this.error})
      : _projects = projects,
        super._();

  final List<Project> _projects;
  @override
  @JsonKey()
  List<Project> get projects {
    if (_projects is EqualUnmodifiableListView) return _projects;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_projects);
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
    return 'ProjectsState(projects: $projects, isLoading: $isLoading, searchQuery: $searchQuery, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProjectsStateImpl &&
            const DeepCollectionEquality().equals(other._projects, _projects) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_projects),
      isLoading,
      searchQuery,
      error);

  /// Create a copy of ProjectsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProjectsStateImplCopyWith<_$ProjectsStateImpl> get copyWith =>
      __$$ProjectsStateImplCopyWithImpl<_$ProjectsStateImpl>(this, _$identity);
}

abstract class _ProjectsState extends ProjectsState {
  const factory _ProjectsState(
      {final List<Project> projects,
      final bool isLoading,
      final String searchQuery,
      final String? error}) = _$ProjectsStateImpl;
  const _ProjectsState._() : super._();

  @override
  List<Project> get projects;
  @override
  bool get isLoading;
  @override
  String get searchQuery;
  @override
  String? get error;

  /// Create a copy of ProjectsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProjectsStateImplCopyWith<_$ProjectsStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
