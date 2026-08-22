// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'subagent_session.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$SubagentEvent {
  String get id => throw _privateConstructorUsedError;
  String get type => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;

  /// Create a copy of SubagentEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubagentEventCopyWith<SubagentEvent> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubagentEventCopyWith<$Res> {
  factory $SubagentEventCopyWith(
          SubagentEvent value, $Res Function(SubagentEvent) then) =
      _$SubagentEventCopyWithImpl<$Res, SubagentEvent>;
  @useResult
  $Res call({String id, String type, String content, DateTime timestamp});
}

/// @nodoc
class _$SubagentEventCopyWithImpl<$Res, $Val extends SubagentEvent>
    implements $SubagentEventCopyWith<$Res> {
  _$SubagentEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubagentEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? content = null,
    Object? timestamp = null,
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
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubagentEventImplCopyWith<$Res>
    implements $SubagentEventCopyWith<$Res> {
  factory _$$SubagentEventImplCopyWith(
          _$SubagentEventImpl value, $Res Function(_$SubagentEventImpl) then) =
      __$$SubagentEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String id, String type, String content, DateTime timestamp});
}

/// @nodoc
class __$$SubagentEventImplCopyWithImpl<$Res>
    extends _$SubagentEventCopyWithImpl<$Res, _$SubagentEventImpl>
    implements _$$SubagentEventImplCopyWith<$Res> {
  __$$SubagentEventImplCopyWithImpl(
      _$SubagentEventImpl _value, $Res Function(_$SubagentEventImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubagentEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? content = null,
    Object? timestamp = null,
  }) {
    return _then(_$SubagentEventImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// @nodoc

class _$SubagentEventImpl extends _SubagentEvent {
  const _$SubagentEventImpl(
      {required this.id,
      required this.type,
      required this.content,
      required this.timestamp})
      : super._();

  @override
  final String id;
  @override
  final String type;
  @override
  final String content;
  @override
  final DateTime timestamp;

  @override
  String toString() {
    return 'SubagentEvent(id: $id, type: $type, content: $content, timestamp: $timestamp)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubagentEventImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, type, content, timestamp);

  /// Create a copy of SubagentEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubagentEventImplCopyWith<_$SubagentEventImpl> get copyWith =>
      __$$SubagentEventImplCopyWithImpl<_$SubagentEventImpl>(this, _$identity);
}

abstract class _SubagentEvent extends SubagentEvent {
  const factory _SubagentEvent(
      {required final String id,
      required final String type,
      required final String content,
      required final DateTime timestamp}) = _$SubagentEventImpl;
  const _SubagentEvent._() : super._();

  @override
  String get id;
  @override
  String get type;
  @override
  String get content;
  @override
  DateTime get timestamp;

  /// Create a copy of SubagentEvent
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubagentEventImplCopyWith<_$SubagentEventImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$SubagentSession {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  SubagentStatus get status => throw _privateConstructorUsedError;
  List<SubagentEvent> get events => throw _privateConstructorUsedError;
  String? get result => throw _privateConstructorUsedError;

  /// Create a copy of SubagentSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubagentSessionCopyWith<SubagentSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubagentSessionCopyWith<$Res> {
  factory $SubagentSessionCopyWith(
          SubagentSession value, $Res Function(SubagentSession) then) =
      _$SubagentSessionCopyWithImpl<$Res, SubagentSession>;
  @useResult
  $Res call(
      {String id,
      String name,
      SubagentStatus status,
      List<SubagentEvent> events,
      String? result});
}

/// @nodoc
class _$SubagentSessionCopyWithImpl<$Res, $Val extends SubagentSession>
    implements $SubagentSessionCopyWith<$Res> {
  _$SubagentSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubagentSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? status = null,
    Object? events = null,
    Object? result = freezed,
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
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as SubagentStatus,
      events: null == events
          ? _value.events
          : events // ignore: cast_nullable_to_non_nullable
              as List<SubagentEvent>,
      result: freezed == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubagentSessionImplCopyWith<$Res>
    implements $SubagentSessionCopyWith<$Res> {
  factory _$$SubagentSessionImplCopyWith(_$SubagentSessionImpl value,
          $Res Function(_$SubagentSessionImpl) then) =
      __$$SubagentSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      SubagentStatus status,
      List<SubagentEvent> events,
      String? result});
}

/// @nodoc
class __$$SubagentSessionImplCopyWithImpl<$Res>
    extends _$SubagentSessionCopyWithImpl<$Res, _$SubagentSessionImpl>
    implements _$$SubagentSessionImplCopyWith<$Res> {
  __$$SubagentSessionImplCopyWithImpl(
      _$SubagentSessionImpl _value, $Res Function(_$SubagentSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubagentSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? status = null,
    Object? events = null,
    Object? result = freezed,
  }) {
    return _then(_$SubagentSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as SubagentStatus,
      events: null == events
          ? _value._events
          : events // ignore: cast_nullable_to_non_nullable
              as List<SubagentEvent>,
      result: freezed == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$SubagentSessionImpl extends _SubagentSession {
  const _$SubagentSessionImpl(
      {required this.id,
      required this.name,
      this.status = SubagentStatus.running,
      final List<SubagentEvent> events = const <SubagentEvent>[],
      this.result})
      : _events = events,
        super._();

  @override
  final String id;
  @override
  final String name;
  @override
  @JsonKey()
  final SubagentStatus status;
  final List<SubagentEvent> _events;
  @override
  @JsonKey()
  List<SubagentEvent> get events {
    if (_events is EqualUnmodifiableListView) return _events;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_events);
  }

  @override
  final String? result;

  @override
  String toString() {
    return 'SubagentSession(id: $id, name: $name, status: $status, events: $events, result: $result)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubagentSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality().equals(other._events, _events) &&
            (identical(other.result, result) || other.result == result));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, name, status,
      const DeepCollectionEquality().hash(_events), result);

  /// Create a copy of SubagentSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubagentSessionImplCopyWith<_$SubagentSessionImpl> get copyWith =>
      __$$SubagentSessionImplCopyWithImpl<_$SubagentSessionImpl>(
          this, _$identity);
}

abstract class _SubagentSession extends SubagentSession {
  const factory _SubagentSession(
      {required final String id,
      required final String name,
      final SubagentStatus status,
      final List<SubagentEvent> events,
      final String? result}) = _$SubagentSessionImpl;
  const _SubagentSession._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  SubagentStatus get status;
  @override
  List<SubagentEvent> get events;
  @override
  String? get result;

  /// Create a copy of SubagentSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubagentSessionImplCopyWith<_$SubagentSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
