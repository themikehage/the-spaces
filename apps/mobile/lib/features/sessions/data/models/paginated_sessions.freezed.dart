// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'paginated_sessions.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$PaginatedSessions {
  List<Session> get items => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;
  int get page => throw _privateConstructorUsedError;
  int get perPage => throw _privateConstructorUsedError;

  /// Create a copy of PaginatedSessions
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PaginatedSessionsCopyWith<PaginatedSessions> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PaginatedSessionsCopyWith<$Res> {
  factory $PaginatedSessionsCopyWith(
          PaginatedSessions value, $Res Function(PaginatedSessions) then) =
      _$PaginatedSessionsCopyWithImpl<$Res, PaginatedSessions>;
  @useResult
  $Res call({List<Session> items, int total, int page, int perPage});
}

/// @nodoc
class _$PaginatedSessionsCopyWithImpl<$Res, $Val extends PaginatedSessions>
    implements $PaginatedSessionsCopyWith<$Res> {
  _$PaginatedSessionsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PaginatedSessions
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? items = null,
    Object? total = null,
    Object? page = null,
    Object? perPage = null,
  }) {
    return _then(_value.copyWith(
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<Session>,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as int,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      perPage: null == perPage
          ? _value.perPage
          : perPage // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PaginatedSessionsImplCopyWith<$Res>
    implements $PaginatedSessionsCopyWith<$Res> {
  factory _$$PaginatedSessionsImplCopyWith(_$PaginatedSessionsImpl value,
          $Res Function(_$PaginatedSessionsImpl) then) =
      __$$PaginatedSessionsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<Session> items, int total, int page, int perPage});
}

/// @nodoc
class __$$PaginatedSessionsImplCopyWithImpl<$Res>
    extends _$PaginatedSessionsCopyWithImpl<$Res, _$PaginatedSessionsImpl>
    implements _$$PaginatedSessionsImplCopyWith<$Res> {
  __$$PaginatedSessionsImplCopyWithImpl(_$PaginatedSessionsImpl _value,
      $Res Function(_$PaginatedSessionsImpl) _then)
      : super(_value, _then);

  /// Create a copy of PaginatedSessions
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? items = null,
    Object? total = null,
    Object? page = null,
    Object? perPage = null,
  }) {
    return _then(_$PaginatedSessionsImpl(
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<Session>,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as int,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      perPage: null == perPage
          ? _value.perPage
          : perPage // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc

class _$PaginatedSessionsImpl extends _PaginatedSessions {
  const _$PaginatedSessionsImpl(
      {final List<Session> items = const <Session>[],
      this.total = 0,
      this.page = 1,
      this.perPage = 20})
      : _items = items,
        super._();

  final List<Session> _items;
  @override
  @JsonKey()
  List<Session> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  @JsonKey()
  final int total;
  @override
  @JsonKey()
  final int page;
  @override
  @JsonKey()
  final int perPage;

  @override
  String toString() {
    return 'PaginatedSessions(items: $items, total: $total, page: $page, perPage: $perPage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PaginatedSessionsImpl &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.page, page) || other.page == page) &&
            (identical(other.perPage, perPage) || other.perPage == perPage));
  }

  @override
  int get hashCode => Object.hash(runtimeType,
      const DeepCollectionEquality().hash(_items), total, page, perPage);

  /// Create a copy of PaginatedSessions
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PaginatedSessionsImplCopyWith<_$PaginatedSessionsImpl> get copyWith =>
      __$$PaginatedSessionsImplCopyWithImpl<_$PaginatedSessionsImpl>(
          this, _$identity);
}

abstract class _PaginatedSessions extends PaginatedSessions {
  const factory _PaginatedSessions(
      {final List<Session> items,
      final int total,
      final int page,
      final int perPage}) = _$PaginatedSessionsImpl;
  const _PaginatedSessions._() : super._();

  @override
  List<Session> get items;
  @override
  int get total;
  @override
  int get page;
  @override
  int get perPage;

  /// Create a copy of PaginatedSessions
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PaginatedSessionsImplCopyWith<_$PaginatedSessionsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
