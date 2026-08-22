// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'workflow_run.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$WorkflowStepState {
  String get stepId => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String? get startedAt => throw _privateConstructorUsedError;
  String? get completedAt => throw _privateConstructorUsedError;
  Map<String, dynamic>? get outputs => throw _privateConstructorUsedError;
  String? get agentSessionId => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;
  String? get activeBranch => throw _privateConstructorUsedError;

  /// Create a copy of WorkflowStepState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WorkflowStepStateCopyWith<WorkflowStepState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowStepStateCopyWith<$Res> {
  factory $WorkflowStepStateCopyWith(
          WorkflowStepState value, $Res Function(WorkflowStepState) then) =
      _$WorkflowStepStateCopyWithImpl<$Res, WorkflowStepState>;
  @useResult
  $Res call(
      {String stepId,
      String status,
      String? startedAt,
      String? completedAt,
      Map<String, dynamic>? outputs,
      String? agentSessionId,
      String? error,
      String? activeBranch});
}

/// @nodoc
class _$WorkflowStepStateCopyWithImpl<$Res, $Val extends WorkflowStepState>
    implements $WorkflowStepStateCopyWith<$Res> {
  _$WorkflowStepStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WorkflowStepState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? stepId = null,
    Object? status = null,
    Object? startedAt = freezed,
    Object? completedAt = freezed,
    Object? outputs = freezed,
    Object? agentSessionId = freezed,
    Object? error = freezed,
    Object? activeBranch = freezed,
  }) {
    return _then(_value.copyWith(
      stepId: null == stepId
          ? _value.stepId
          : stepId // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      outputs: freezed == outputs
          ? _value.outputs
          : outputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      agentSessionId: freezed == agentSessionId
          ? _value.agentSessionId
          : agentSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      activeBranch: freezed == activeBranch
          ? _value.activeBranch
          : activeBranch // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WorkflowStepStateImplCopyWith<$Res>
    implements $WorkflowStepStateCopyWith<$Res> {
  factory _$$WorkflowStepStateImplCopyWith(_$WorkflowStepStateImpl value,
          $Res Function(_$WorkflowStepStateImpl) then) =
      __$$WorkflowStepStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String stepId,
      String status,
      String? startedAt,
      String? completedAt,
      Map<String, dynamic>? outputs,
      String? agentSessionId,
      String? error,
      String? activeBranch});
}

/// @nodoc
class __$$WorkflowStepStateImplCopyWithImpl<$Res>
    extends _$WorkflowStepStateCopyWithImpl<$Res, _$WorkflowStepStateImpl>
    implements _$$WorkflowStepStateImplCopyWith<$Res> {
  __$$WorkflowStepStateImplCopyWithImpl(_$WorkflowStepStateImpl _value,
      $Res Function(_$WorkflowStepStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of WorkflowStepState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? stepId = null,
    Object? status = null,
    Object? startedAt = freezed,
    Object? completedAt = freezed,
    Object? outputs = freezed,
    Object? agentSessionId = freezed,
    Object? error = freezed,
    Object? activeBranch = freezed,
  }) {
    return _then(_$WorkflowStepStateImpl(
      stepId: null == stepId
          ? _value.stepId
          : stepId // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      outputs: freezed == outputs
          ? _value._outputs
          : outputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      agentSessionId: freezed == agentSessionId
          ? _value.agentSessionId
          : agentSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      activeBranch: freezed == activeBranch
          ? _value.activeBranch
          : activeBranch // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$WorkflowStepStateImpl extends _WorkflowStepState {
  const _$WorkflowStepStateImpl(
      {required this.stepId,
      this.status = 'pending',
      this.startedAt,
      this.completedAt,
      final Map<String, dynamic>? outputs,
      this.agentSessionId,
      this.error,
      this.activeBranch})
      : _outputs = outputs,
        super._();

  @override
  final String stepId;
  @override
  @JsonKey()
  final String status;
  @override
  final String? startedAt;
  @override
  final String? completedAt;
  final Map<String, dynamic>? _outputs;
  @override
  Map<String, dynamic>? get outputs {
    final value = _outputs;
    if (value == null) return null;
    if (_outputs is EqualUnmodifiableMapView) return _outputs;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final String? agentSessionId;
  @override
  final String? error;
  @override
  final String? activeBranch;

  @override
  String toString() {
    return 'WorkflowStepState(stepId: $stepId, status: $status, startedAt: $startedAt, completedAt: $completedAt, outputs: $outputs, agentSessionId: $agentSessionId, error: $error, activeBranch: $activeBranch)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowStepStateImpl &&
            (identical(other.stepId, stepId) || other.stepId == stepId) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt) &&
            const DeepCollectionEquality().equals(other._outputs, _outputs) &&
            (identical(other.agentSessionId, agentSessionId) ||
                other.agentSessionId == agentSessionId) &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.activeBranch, activeBranch) ||
                other.activeBranch == activeBranch));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      stepId,
      status,
      startedAt,
      completedAt,
      const DeepCollectionEquality().hash(_outputs),
      agentSessionId,
      error,
      activeBranch);

  /// Create a copy of WorkflowStepState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowStepStateImplCopyWith<_$WorkflowStepStateImpl> get copyWith =>
      __$$WorkflowStepStateImplCopyWithImpl<_$WorkflowStepStateImpl>(
          this, _$identity);
}

abstract class _WorkflowStepState extends WorkflowStepState {
  const factory _WorkflowStepState(
      {required final String stepId,
      final String status,
      final String? startedAt,
      final String? completedAt,
      final Map<String, dynamic>? outputs,
      final String? agentSessionId,
      final String? error,
      final String? activeBranch}) = _$WorkflowStepStateImpl;
  const _WorkflowStepState._() : super._();

  @override
  String get stepId;
  @override
  String get status;
  @override
  String? get startedAt;
  @override
  String? get completedAt;
  @override
  Map<String, dynamic>? get outputs;
  @override
  String? get agentSessionId;
  @override
  String? get error;
  @override
  String? get activeBranch;

  /// Create a copy of WorkflowStepState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WorkflowStepStateImplCopyWith<_$WorkflowStepStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$WorkflowRun {
  String get id => throw _privateConstructorUsedError;
  String get workflowId => throw _privateConstructorUsedError;
  String get workflowName => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  Map<String, WorkflowStepState> get stepStates =>
      throw _privateConstructorUsedError;
  String get startedAt => throw _privateConstructorUsedError;
  String? get completedAt => throw _privateConstructorUsedError;
  String? get username => throw _privateConstructorUsedError;
  String? get parentSessionId => throw _privateConstructorUsedError;
  String? get workflowSessionId => throw _privateConstructorUsedError;
  Map<String, dynamic>? get inputs => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of WorkflowRun
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WorkflowRunCopyWith<WorkflowRun> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowRunCopyWith<$Res> {
  factory $WorkflowRunCopyWith(
          WorkflowRun value, $Res Function(WorkflowRun) then) =
      _$WorkflowRunCopyWithImpl<$Res, WorkflowRun>;
  @useResult
  $Res call(
      {String id,
      String workflowId,
      String workflowName,
      String status,
      Map<String, WorkflowStepState> stepStates,
      String startedAt,
      String? completedAt,
      String? username,
      String? parentSessionId,
      String? workflowSessionId,
      Map<String, dynamic>? inputs,
      String? error});
}

/// @nodoc
class _$WorkflowRunCopyWithImpl<$Res, $Val extends WorkflowRun>
    implements $WorkflowRunCopyWith<$Res> {
  _$WorkflowRunCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WorkflowRun
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? workflowId = null,
    Object? workflowName = null,
    Object? status = null,
    Object? stepStates = null,
    Object? startedAt = null,
    Object? completedAt = freezed,
    Object? username = freezed,
    Object? parentSessionId = freezed,
    Object? workflowSessionId = freezed,
    Object? inputs = freezed,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      workflowId: null == workflowId
          ? _value.workflowId
          : workflowId // ignore: cast_nullable_to_non_nullable
              as String,
      workflowName: null == workflowName
          ? _value.workflowName
          : workflowName // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      stepStates: null == stepStates
          ? _value.stepStates
          : stepStates // ignore: cast_nullable_to_non_nullable
              as Map<String, WorkflowStepState>,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      username: freezed == username
          ? _value.username
          : username // ignore: cast_nullable_to_non_nullable
              as String?,
      parentSessionId: freezed == parentSessionId
          ? _value.parentSessionId
          : parentSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      workflowSessionId: freezed == workflowSessionId
          ? _value.workflowSessionId
          : workflowSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      inputs: freezed == inputs
          ? _value.inputs
          : inputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WorkflowRunImplCopyWith<$Res>
    implements $WorkflowRunCopyWith<$Res> {
  factory _$$WorkflowRunImplCopyWith(
          _$WorkflowRunImpl value, $Res Function(_$WorkflowRunImpl) then) =
      __$$WorkflowRunImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String workflowId,
      String workflowName,
      String status,
      Map<String, WorkflowStepState> stepStates,
      String startedAt,
      String? completedAt,
      String? username,
      String? parentSessionId,
      String? workflowSessionId,
      Map<String, dynamic>? inputs,
      String? error});
}

/// @nodoc
class __$$WorkflowRunImplCopyWithImpl<$Res>
    extends _$WorkflowRunCopyWithImpl<$Res, _$WorkflowRunImpl>
    implements _$$WorkflowRunImplCopyWith<$Res> {
  __$$WorkflowRunImplCopyWithImpl(
      _$WorkflowRunImpl _value, $Res Function(_$WorkflowRunImpl) _then)
      : super(_value, _then);

  /// Create a copy of WorkflowRun
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? workflowId = null,
    Object? workflowName = null,
    Object? status = null,
    Object? stepStates = null,
    Object? startedAt = null,
    Object? completedAt = freezed,
    Object? username = freezed,
    Object? parentSessionId = freezed,
    Object? workflowSessionId = freezed,
    Object? inputs = freezed,
    Object? error = freezed,
  }) {
    return _then(_$WorkflowRunImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      workflowId: null == workflowId
          ? _value.workflowId
          : workflowId // ignore: cast_nullable_to_non_nullable
              as String,
      workflowName: null == workflowName
          ? _value.workflowName
          : workflowName // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      stepStates: null == stepStates
          ? _value._stepStates
          : stepStates // ignore: cast_nullable_to_non_nullable
              as Map<String, WorkflowStepState>,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      username: freezed == username
          ? _value.username
          : username // ignore: cast_nullable_to_non_nullable
              as String?,
      parentSessionId: freezed == parentSessionId
          ? _value.parentSessionId
          : parentSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      workflowSessionId: freezed == workflowSessionId
          ? _value.workflowSessionId
          : workflowSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      inputs: freezed == inputs
          ? _value._inputs
          : inputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$WorkflowRunImpl extends _WorkflowRun {
  const _$WorkflowRunImpl(
      {required this.id,
      required this.workflowId,
      this.workflowName = '',
      this.status = 'pending',
      final Map<String, WorkflowStepState> stepStates =
          const <String, WorkflowStepState>{},
      this.startedAt = '',
      this.completedAt,
      this.username,
      this.parentSessionId,
      this.workflowSessionId,
      final Map<String, dynamic>? inputs,
      this.error})
      : _stepStates = stepStates,
        _inputs = inputs,
        super._();

  @override
  final String id;
  @override
  final String workflowId;
  @override
  @JsonKey()
  final String workflowName;
  @override
  @JsonKey()
  final String status;
  final Map<String, WorkflowStepState> _stepStates;
  @override
  @JsonKey()
  Map<String, WorkflowStepState> get stepStates {
    if (_stepStates is EqualUnmodifiableMapView) return _stepStates;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_stepStates);
  }

  @override
  @JsonKey()
  final String startedAt;
  @override
  final String? completedAt;
  @override
  final String? username;
  @override
  final String? parentSessionId;
  @override
  final String? workflowSessionId;
  final Map<String, dynamic>? _inputs;
  @override
  Map<String, dynamic>? get inputs {
    final value = _inputs;
    if (value == null) return null;
    if (_inputs is EqualUnmodifiableMapView) return _inputs;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final String? error;

  @override
  String toString() {
    return 'WorkflowRun(id: $id, workflowId: $workflowId, workflowName: $workflowName, status: $status, stepStates: $stepStates, startedAt: $startedAt, completedAt: $completedAt, username: $username, parentSessionId: $parentSessionId, workflowSessionId: $workflowSessionId, inputs: $inputs, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowRunImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.workflowId, workflowId) ||
                other.workflowId == workflowId) &&
            (identical(other.workflowName, workflowName) ||
                other.workflowName == workflowName) &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality()
                .equals(other._stepStates, _stepStates) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt) &&
            (identical(other.username, username) ||
                other.username == username) &&
            (identical(other.parentSessionId, parentSessionId) ||
                other.parentSessionId == parentSessionId) &&
            (identical(other.workflowSessionId, workflowSessionId) ||
                other.workflowSessionId == workflowSessionId) &&
            const DeepCollectionEquality().equals(other._inputs, _inputs) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      workflowId,
      workflowName,
      status,
      const DeepCollectionEquality().hash(_stepStates),
      startedAt,
      completedAt,
      username,
      parentSessionId,
      workflowSessionId,
      const DeepCollectionEquality().hash(_inputs),
      error);

  /// Create a copy of WorkflowRun
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowRunImplCopyWith<_$WorkflowRunImpl> get copyWith =>
      __$$WorkflowRunImplCopyWithImpl<_$WorkflowRunImpl>(this, _$identity);
}

abstract class _WorkflowRun extends WorkflowRun {
  const factory _WorkflowRun(
      {required final String id,
      required final String workflowId,
      final String workflowName,
      final String status,
      final Map<String, WorkflowStepState> stepStates,
      final String startedAt,
      final String? completedAt,
      final String? username,
      final String? parentSessionId,
      final String? workflowSessionId,
      final Map<String, dynamic>? inputs,
      final String? error}) = _$WorkflowRunImpl;
  const _WorkflowRun._() : super._();

  @override
  String get id;
  @override
  String get workflowId;
  @override
  String get workflowName;
  @override
  String get status;
  @override
  Map<String, WorkflowStepState> get stepStates;
  @override
  String get startedAt;
  @override
  String? get completedAt;
  @override
  String? get username;
  @override
  String? get parentSessionId;
  @override
  String? get workflowSessionId;
  @override
  Map<String, dynamic>? get inputs;
  @override
  String? get error;

  /// Create a copy of WorkflowRun
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WorkflowRunImplCopyWith<_$WorkflowRunImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
