// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'workflows_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$WorkflowsState {
  List<Workflow> get workflows => throw _privateConstructorUsedError;
  Map<String, List<WorkflowRun>> get runsByWorkflowId =>
      throw _privateConstructorUsedError;
  WorkflowRun? get activeRun => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  String get searchQuery => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WorkflowsStateCopyWith<WorkflowsState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowsStateCopyWith<$Res> {
  factory $WorkflowsStateCopyWith(
          WorkflowsState value, $Res Function(WorkflowsState) then) =
      _$WorkflowsStateCopyWithImpl<$Res, WorkflowsState>;
  @useResult
  $Res call(
      {List<Workflow> workflows,
      Map<String, List<WorkflowRun>> runsByWorkflowId,
      WorkflowRun? activeRun,
      bool isLoading,
      String searchQuery,
      String? error});

  $WorkflowRunCopyWith<$Res>? get activeRun;
}

/// @nodoc
class _$WorkflowsStateCopyWithImpl<$Res, $Val extends WorkflowsState>
    implements $WorkflowsStateCopyWith<$Res> {
  _$WorkflowsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflows = null,
    Object? runsByWorkflowId = null,
    Object? activeRun = freezed,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      workflows: null == workflows
          ? _value.workflows
          : workflows // ignore: cast_nullable_to_non_nullable
              as List<Workflow>,
      runsByWorkflowId: null == runsByWorkflowId
          ? _value.runsByWorkflowId
          : runsByWorkflowId // ignore: cast_nullable_to_non_nullable
              as Map<String, List<WorkflowRun>>,
      activeRun: freezed == activeRun
          ? _value.activeRun
          : activeRun // ignore: cast_nullable_to_non_nullable
              as WorkflowRun?,
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

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $WorkflowRunCopyWith<$Res>? get activeRun {
    if (_value.activeRun == null) {
      return null;
    }

    return $WorkflowRunCopyWith<$Res>(_value.activeRun!, (value) {
      return _then(_value.copyWith(activeRun: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$WorkflowsStateImplCopyWith<$Res>
    implements $WorkflowsStateCopyWith<$Res> {
  factory _$$WorkflowsStateImplCopyWith(_$WorkflowsStateImpl value,
          $Res Function(_$WorkflowsStateImpl) then) =
      __$$WorkflowsStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Workflow> workflows,
      Map<String, List<WorkflowRun>> runsByWorkflowId,
      WorkflowRun? activeRun,
      bool isLoading,
      String searchQuery,
      String? error});

  @override
  $WorkflowRunCopyWith<$Res>? get activeRun;
}

/// @nodoc
class __$$WorkflowsStateImplCopyWithImpl<$Res>
    extends _$WorkflowsStateCopyWithImpl<$Res, _$WorkflowsStateImpl>
    implements _$$WorkflowsStateImplCopyWith<$Res> {
  __$$WorkflowsStateImplCopyWithImpl(
      _$WorkflowsStateImpl _value, $Res Function(_$WorkflowsStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflows = null,
    Object? runsByWorkflowId = null,
    Object? activeRun = freezed,
    Object? isLoading = null,
    Object? searchQuery = null,
    Object? error = freezed,
  }) {
    return _then(_$WorkflowsStateImpl(
      workflows: null == workflows
          ? _value._workflows
          : workflows // ignore: cast_nullable_to_non_nullable
              as List<Workflow>,
      runsByWorkflowId: null == runsByWorkflowId
          ? _value._runsByWorkflowId
          : runsByWorkflowId // ignore: cast_nullable_to_non_nullable
              as Map<String, List<WorkflowRun>>,
      activeRun: freezed == activeRun
          ? _value.activeRun
          : activeRun // ignore: cast_nullable_to_non_nullable
              as WorkflowRun?,
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

class _$WorkflowsStateImpl extends _WorkflowsState {
  const _$WorkflowsStateImpl(
      {final List<Workflow> workflows = const <Workflow>[],
      final Map<String, List<WorkflowRun>> runsByWorkflowId =
          const <String, List<WorkflowRun>>{},
      this.activeRun,
      this.isLoading = false,
      this.searchQuery = '',
      this.error})
      : _workflows = workflows,
        _runsByWorkflowId = runsByWorkflowId,
        super._();

  final List<Workflow> _workflows;
  @override
  @JsonKey()
  List<Workflow> get workflows {
    if (_workflows is EqualUnmodifiableListView) return _workflows;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_workflows);
  }

  final Map<String, List<WorkflowRun>> _runsByWorkflowId;
  @override
  @JsonKey()
  Map<String, List<WorkflowRun>> get runsByWorkflowId {
    if (_runsByWorkflowId is EqualUnmodifiableMapView) return _runsByWorkflowId;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_runsByWorkflowId);
  }

  @override
  final WorkflowRun? activeRun;
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
    return 'WorkflowsState(workflows: $workflows, runsByWorkflowId: $runsByWorkflowId, activeRun: $activeRun, isLoading: $isLoading, searchQuery: $searchQuery, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowsStateImpl &&
            const DeepCollectionEquality()
                .equals(other._workflows, _workflows) &&
            const DeepCollectionEquality()
                .equals(other._runsByWorkflowId, _runsByWorkflowId) &&
            (identical(other.activeRun, activeRun) ||
                other.activeRun == activeRun) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_workflows),
      const DeepCollectionEquality().hash(_runsByWorkflowId),
      activeRun,
      isLoading,
      searchQuery,
      error);

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowsStateImplCopyWith<_$WorkflowsStateImpl> get copyWith =>
      __$$WorkflowsStateImplCopyWithImpl<_$WorkflowsStateImpl>(
          this, _$identity);
}

abstract class _WorkflowsState extends WorkflowsState {
  const factory _WorkflowsState(
      {final List<Workflow> workflows,
      final Map<String, List<WorkflowRun>> runsByWorkflowId,
      final WorkflowRun? activeRun,
      final bool isLoading,
      final String searchQuery,
      final String? error}) = _$WorkflowsStateImpl;
  const _WorkflowsState._() : super._();

  @override
  List<Workflow> get workflows;
  @override
  Map<String, List<WorkflowRun>> get runsByWorkflowId;
  @override
  WorkflowRun? get activeRun;
  @override
  bool get isLoading;
  @override
  String get searchQuery;
  @override
  String? get error;

  /// Create a copy of WorkflowsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WorkflowsStateImplCopyWith<_$WorkflowsStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
