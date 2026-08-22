// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'workflow.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$WorkflowStep {
  String get id => throw _privateConstructorUsedError;
  String get type => throw _privateConstructorUsedError;
  String get label => throw _privateConstructorUsedError;
  List<String> get dependsOn => throw _privateConstructorUsedError;
  String? get agentId => throw _privateConstructorUsedError;
  String? get taskTemplate => throw _privateConstructorUsedError;
  String? get condition => throw _privateConstructorUsedError;
  String? get approvalMessage => throw _privateConstructorUsedError;
  Map<String, dynamic>? get inputs => throw _privateConstructorUsedError;

  /// Create a copy of WorkflowStep
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WorkflowStepCopyWith<WorkflowStep> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowStepCopyWith<$Res> {
  factory $WorkflowStepCopyWith(
          WorkflowStep value, $Res Function(WorkflowStep) then) =
      _$WorkflowStepCopyWithImpl<$Res, WorkflowStep>;
  @useResult
  $Res call(
      {String id,
      String type,
      String label,
      List<String> dependsOn,
      String? agentId,
      String? taskTemplate,
      String? condition,
      String? approvalMessage,
      Map<String, dynamic>? inputs});
}

/// @nodoc
class _$WorkflowStepCopyWithImpl<$Res, $Val extends WorkflowStep>
    implements $WorkflowStepCopyWith<$Res> {
  _$WorkflowStepCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WorkflowStep
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? label = null,
    Object? dependsOn = null,
    Object? agentId = freezed,
    Object? taskTemplate = freezed,
    Object? condition = freezed,
    Object? approvalMessage = freezed,
    Object? inputs = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      label: null == label
          ? _value.label
          : label // ignore: cast_nullable_to_non_nullable
              as String,
      dependsOn: null == dependsOn
          ? _value.dependsOn
          : dependsOn // ignore: cast_nullable_to_non_nullable
              as List<String>,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      taskTemplate: freezed == taskTemplate
          ? _value.taskTemplate
          : taskTemplate // ignore: cast_nullable_to_non_nullable
              as String?,
      condition: freezed == condition
          ? _value.condition
          : condition // ignore: cast_nullable_to_non_nullable
              as String?,
      approvalMessage: freezed == approvalMessage
          ? _value.approvalMessage
          : approvalMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      inputs: freezed == inputs
          ? _value.inputs
          : inputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WorkflowStepImplCopyWith<$Res>
    implements $WorkflowStepCopyWith<$Res> {
  factory _$$WorkflowStepImplCopyWith(
          _$WorkflowStepImpl value, $Res Function(_$WorkflowStepImpl) then) =
      __$$WorkflowStepImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String type,
      String label,
      List<String> dependsOn,
      String? agentId,
      String? taskTemplate,
      String? condition,
      String? approvalMessage,
      Map<String, dynamic>? inputs});
}

/// @nodoc
class __$$WorkflowStepImplCopyWithImpl<$Res>
    extends _$WorkflowStepCopyWithImpl<$Res, _$WorkflowStepImpl>
    implements _$$WorkflowStepImplCopyWith<$Res> {
  __$$WorkflowStepImplCopyWithImpl(
      _$WorkflowStepImpl _value, $Res Function(_$WorkflowStepImpl) _then)
      : super(_value, _then);

  /// Create a copy of WorkflowStep
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? label = null,
    Object? dependsOn = null,
    Object? agentId = freezed,
    Object? taskTemplate = freezed,
    Object? condition = freezed,
    Object? approvalMessage = freezed,
    Object? inputs = freezed,
  }) {
    return _then(_$WorkflowStepImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      label: null == label
          ? _value.label
          : label // ignore: cast_nullable_to_non_nullable
              as String,
      dependsOn: null == dependsOn
          ? _value._dependsOn
          : dependsOn // ignore: cast_nullable_to_non_nullable
              as List<String>,
      agentId: freezed == agentId
          ? _value.agentId
          : agentId // ignore: cast_nullable_to_non_nullable
              as String?,
      taskTemplate: freezed == taskTemplate
          ? _value.taskTemplate
          : taskTemplate // ignore: cast_nullable_to_non_nullable
              as String?,
      condition: freezed == condition
          ? _value.condition
          : condition // ignore: cast_nullable_to_non_nullable
              as String?,
      approvalMessage: freezed == approvalMessage
          ? _value.approvalMessage
          : approvalMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      inputs: freezed == inputs
          ? _value._inputs
          : inputs // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$WorkflowStepImpl extends _WorkflowStep {
  const _$WorkflowStepImpl(
      {required this.id,
      required this.type,
      required this.label,
      final List<String> dependsOn = const <String>[],
      this.agentId,
      this.taskTemplate,
      this.condition,
      this.approvalMessage,
      final Map<String, dynamic>? inputs})
      : _dependsOn = dependsOn,
        _inputs = inputs,
        super._();

  @override
  final String id;
  @override
  final String type;
  @override
  final String label;
  final List<String> _dependsOn;
  @override
  @JsonKey()
  List<String> get dependsOn {
    if (_dependsOn is EqualUnmodifiableListView) return _dependsOn;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_dependsOn);
  }

  @override
  final String? agentId;
  @override
  final String? taskTemplate;
  @override
  final String? condition;
  @override
  final String? approvalMessage;
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
  String toString() {
    return 'WorkflowStep(id: $id, type: $type, label: $label, dependsOn: $dependsOn, agentId: $agentId, taskTemplate: $taskTemplate, condition: $condition, approvalMessage: $approvalMessage, inputs: $inputs)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowStepImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.label, label) || other.label == label) &&
            const DeepCollectionEquality()
                .equals(other._dependsOn, _dependsOn) &&
            (identical(other.agentId, agentId) || other.agentId == agentId) &&
            (identical(other.taskTemplate, taskTemplate) ||
                other.taskTemplate == taskTemplate) &&
            (identical(other.condition, condition) ||
                other.condition == condition) &&
            (identical(other.approvalMessage, approvalMessage) ||
                other.approvalMessage == approvalMessage) &&
            const DeepCollectionEquality().equals(other._inputs, _inputs));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      type,
      label,
      const DeepCollectionEquality().hash(_dependsOn),
      agentId,
      taskTemplate,
      condition,
      approvalMessage,
      const DeepCollectionEquality().hash(_inputs));

  /// Create a copy of WorkflowStep
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowStepImplCopyWith<_$WorkflowStepImpl> get copyWith =>
      __$$WorkflowStepImplCopyWithImpl<_$WorkflowStepImpl>(this, _$identity);
}

abstract class _WorkflowStep extends WorkflowStep {
  const factory _WorkflowStep(
      {required final String id,
      required final String type,
      required final String label,
      final List<String> dependsOn,
      final String? agentId,
      final String? taskTemplate,
      final String? condition,
      final String? approvalMessage,
      final Map<String, dynamic>? inputs}) = _$WorkflowStepImpl;
  const _WorkflowStep._() : super._();

  @override
  String get id;
  @override
  String get type;
  @override
  String get label;
  @override
  List<String> get dependsOn;
  @override
  String? get agentId;
  @override
  String? get taskTemplate;
  @override
  String? get condition;
  @override
  String? get approvalMessage;
  @override
  Map<String, dynamic>? get inputs;

  /// Create a copy of WorkflowStep
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WorkflowStepImplCopyWith<_$WorkflowStepImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$Workflow {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get systemPrompt => throw _privateConstructorUsedError;
  List<WorkflowStep> get steps => throw _privateConstructorUsedError;
  String get onError => throw _privateConstructorUsedError;
  String? get lastRunStatus => throw _privateConstructorUsedError;
  String? get createdAt => throw _privateConstructorUsedError;
  String? get updatedAt => throw _privateConstructorUsedError;
  String? get tag => throw _privateConstructorUsedError;

  /// Create a copy of Workflow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WorkflowCopyWith<Workflow> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowCopyWith<$Res> {
  factory $WorkflowCopyWith(Workflow value, $Res Function(Workflow) then) =
      _$WorkflowCopyWithImpl<$Res, Workflow>;
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String? systemPrompt,
      List<WorkflowStep> steps,
      String onError,
      String? lastRunStatus,
      String? createdAt,
      String? updatedAt,
      String? tag});
}

/// @nodoc
class _$WorkflowCopyWithImpl<$Res, $Val extends Workflow>
    implements $WorkflowCopyWith<$Res> {
  _$WorkflowCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Workflow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? systemPrompt = freezed,
    Object? steps = null,
    Object? onError = null,
    Object? lastRunStatus = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? tag = freezed,
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
      systemPrompt: freezed == systemPrompt
          ? _value.systemPrompt
          : systemPrompt // ignore: cast_nullable_to_non_nullable
              as String?,
      steps: null == steps
          ? _value.steps
          : steps // ignore: cast_nullable_to_non_nullable
              as List<WorkflowStep>,
      onError: null == onError
          ? _value.onError
          : onError // ignore: cast_nullable_to_non_nullable
              as String,
      lastRunStatus: freezed == lastRunStatus
          ? _value.lastRunStatus
          : lastRunStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WorkflowImplCopyWith<$Res>
    implements $WorkflowCopyWith<$Res> {
  factory _$$WorkflowImplCopyWith(
          _$WorkflowImpl value, $Res Function(_$WorkflowImpl) then) =
      __$$WorkflowImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String? description,
      String? systemPrompt,
      List<WorkflowStep> steps,
      String onError,
      String? lastRunStatus,
      String? createdAt,
      String? updatedAt,
      String? tag});
}

/// @nodoc
class __$$WorkflowImplCopyWithImpl<$Res>
    extends _$WorkflowCopyWithImpl<$Res, _$WorkflowImpl>
    implements _$$WorkflowImplCopyWith<$Res> {
  __$$WorkflowImplCopyWithImpl(
      _$WorkflowImpl _value, $Res Function(_$WorkflowImpl) _then)
      : super(_value, _then);

  /// Create a copy of Workflow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = freezed,
    Object? systemPrompt = freezed,
    Object? steps = null,
    Object? onError = null,
    Object? lastRunStatus = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? tag = freezed,
  }) {
    return _then(_$WorkflowImpl(
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
      systemPrompt: freezed == systemPrompt
          ? _value.systemPrompt
          : systemPrompt // ignore: cast_nullable_to_non_nullable
              as String?,
      steps: null == steps
          ? _value._steps
          : steps // ignore: cast_nullable_to_non_nullable
              as List<WorkflowStep>,
      onError: null == onError
          ? _value.onError
          : onError // ignore: cast_nullable_to_non_nullable
              as String,
      lastRunStatus: freezed == lastRunStatus
          ? _value.lastRunStatus
          : lastRunStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$WorkflowImpl extends _Workflow {
  const _$WorkflowImpl(
      {required this.id,
      required this.name,
      this.description,
      this.systemPrompt,
      final List<WorkflowStep> steps = const <WorkflowStep>[],
      this.onError = 'stop',
      this.lastRunStatus,
      this.createdAt,
      this.updatedAt,
      this.tag})
      : _steps = steps,
        super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String? description;
  @override
  final String? systemPrompt;
  final List<WorkflowStep> _steps;
  @override
  @JsonKey()
  List<WorkflowStep> get steps {
    if (_steps is EqualUnmodifiableListView) return _steps;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_steps);
  }

  @override
  @JsonKey()
  final String onError;
  @override
  final String? lastRunStatus;
  @override
  final String? createdAt;
  @override
  final String? updatedAt;
  @override
  final String? tag;

  @override
  String toString() {
    return 'Workflow(id: $id, name: $name, description: $description, systemPrompt: $systemPrompt, steps: $steps, onError: $onError, lastRunStatus: $lastRunStatus, createdAt: $createdAt, updatedAt: $updatedAt, tag: $tag)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.systemPrompt, systemPrompt) ||
                other.systemPrompt == systemPrompt) &&
            const DeepCollectionEquality().equals(other._steps, _steps) &&
            (identical(other.onError, onError) || other.onError == onError) &&
            (identical(other.lastRunStatus, lastRunStatus) ||
                other.lastRunStatus == lastRunStatus) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.tag, tag) || other.tag == tag));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      description,
      systemPrompt,
      const DeepCollectionEquality().hash(_steps),
      onError,
      lastRunStatus,
      createdAt,
      updatedAt,
      tag);

  /// Create a copy of Workflow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowImplCopyWith<_$WorkflowImpl> get copyWith =>
      __$$WorkflowImplCopyWithImpl<_$WorkflowImpl>(this, _$identity);
}

abstract class _Workflow extends Workflow {
  const factory _Workflow(
      {required final String id,
      required final String name,
      final String? description,
      final String? systemPrompt,
      final List<WorkflowStep> steps,
      final String onError,
      final String? lastRunStatus,
      final String? createdAt,
      final String? updatedAt,
      final String? tag}) = _$WorkflowImpl;
  const _Workflow._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String? get description;
  @override
  String? get systemPrompt;
  @override
  List<WorkflowStep> get steps;
  @override
  String get onError;
  @override
  String? get lastRunStatus;
  @override
  String? get createdAt;
  @override
  String? get updatedAt;
  @override
  String? get tag;

  /// Create a copy of Workflow
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WorkflowImplCopyWith<_$WorkflowImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
