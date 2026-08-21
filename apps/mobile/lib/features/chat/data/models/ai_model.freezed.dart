// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ai_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$AiModel {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get provider => throw _privateConstructorUsedError;
  List<String> get input => throw _privateConstructorUsedError;
  bool get reasoning => throw _privateConstructorUsedError;

  /// Create a copy of AiModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AiModelCopyWith<AiModel> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AiModelCopyWith<$Res> {
  factory $AiModelCopyWith(AiModel value, $Res Function(AiModel) then) =
      _$AiModelCopyWithImpl<$Res, AiModel>;
  @useResult
  $Res call(
      {String id,
      String name,
      String provider,
      List<String> input,
      bool reasoning});
}

/// @nodoc
class _$AiModelCopyWithImpl<$Res, $Val extends AiModel>
    implements $AiModelCopyWith<$Res> {
  _$AiModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AiModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? provider = null,
    Object? input = null,
    Object? reasoning = null,
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
      provider: null == provider
          ? _value.provider
          : provider // ignore: cast_nullable_to_non_nullable
              as String,
      input: null == input
          ? _value.input
          : input // ignore: cast_nullable_to_non_nullable
              as List<String>,
      reasoning: null == reasoning
          ? _value.reasoning
          : reasoning // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AiModelImplCopyWith<$Res> implements $AiModelCopyWith<$Res> {
  factory _$$AiModelImplCopyWith(
          _$AiModelImpl value, $Res Function(_$AiModelImpl) then) =
      __$$AiModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String provider,
      List<String> input,
      bool reasoning});
}

/// @nodoc
class __$$AiModelImplCopyWithImpl<$Res>
    extends _$AiModelCopyWithImpl<$Res, _$AiModelImpl>
    implements _$$AiModelImplCopyWith<$Res> {
  __$$AiModelImplCopyWithImpl(
      _$AiModelImpl _value, $Res Function(_$AiModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of AiModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? provider = null,
    Object? input = null,
    Object? reasoning = null,
  }) {
    return _then(_$AiModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      provider: null == provider
          ? _value.provider
          : provider // ignore: cast_nullable_to_non_nullable
              as String,
      input: null == input
          ? _value._input
          : input // ignore: cast_nullable_to_non_nullable
              as List<String>,
      reasoning: null == reasoning
          ? _value.reasoning
          : reasoning // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$AiModelImpl extends _AiModel {
  const _$AiModelImpl(
      {required this.id,
      required this.name,
      required this.provider,
      final List<String> input = const <String>['text'],
      this.reasoning = false})
      : _input = input,
        super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String provider;
  final List<String> _input;
  @override
  @JsonKey()
  List<String> get input {
    if (_input is EqualUnmodifiableListView) return _input;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_input);
  }

  @override
  @JsonKey()
  final bool reasoning;

  @override
  String toString() {
    return 'AiModel(id: $id, name: $name, provider: $provider, input: $input, reasoning: $reasoning)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AiModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.provider, provider) ||
                other.provider == provider) &&
            const DeepCollectionEquality().equals(other._input, _input) &&
            (identical(other.reasoning, reasoning) ||
                other.reasoning == reasoning));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, name, provider,
      const DeepCollectionEquality().hash(_input), reasoning);

  /// Create a copy of AiModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AiModelImplCopyWith<_$AiModelImpl> get copyWith =>
      __$$AiModelImplCopyWithImpl<_$AiModelImpl>(this, _$identity);
}

abstract class _AiModel extends AiModel {
  const factory _AiModel(
      {required final String id,
      required final String name,
      required final String provider,
      final List<String> input,
      final bool reasoning}) = _$AiModelImpl;
  const _AiModel._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String get provider;
  @override
  List<String> get input;
  @override
  bool get reasoning;

  /// Create a copy of AiModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AiModelImplCopyWith<_$AiModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
