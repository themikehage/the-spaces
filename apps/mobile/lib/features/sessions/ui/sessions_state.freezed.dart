// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'sessions_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$SessionsState {
  List<Session> get sessions => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  bool get isLoadingMore => throw _privateConstructorUsedError;
  bool get hasMore => throw _privateConstructorUsedError;
  String get filter => throw _privateConstructorUsedError;
  String get searchQuery => throw _privateConstructorUsedError;
  int get page => throw _privateConstructorUsedError;
  bool get showArchived => throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  /// Create a copy of SessionsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SessionsStateCopyWith<SessionsState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionsStateCopyWith<$Res> {
  factory $SessionsStateCopyWith(
          SessionsState value, $Res Function(SessionsState) then) =
      _$SessionsStateCopyWithImpl<$Res, SessionsState>;
  @useResult
  $Res call(
      {List<Session> sessions,
      bool isLoading,
      bool isLoadingMore,
      bool hasMore,
      String filter,
      String searchQuery,
      int page,
      bool showArchived,
      String? error});
}

/// @nodoc
class _$SessionsStateCopyWithImpl<$Res, $Val extends SessionsState>
    implements $SessionsStateCopyWith<$Res> {
  _$SessionsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SessionsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessions = null,
    Object? isLoading = null,
    Object? isLoadingMore = null,
    Object? hasMore = null,
    Object? filter = null,
    Object? searchQuery = null,
    Object? page = null,
    Object? showArchived = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<Session>,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      isLoadingMore: null == isLoadingMore
          ? _value.isLoadingMore
          : isLoadingMore // ignore: cast_nullable_to_non_nullable
              as bool,
      hasMore: null == hasMore
          ? _value.hasMore
          : hasMore // ignore: cast_nullable_to_non_nullable
              as bool,
      filter: null == filter
          ? _value.filter
          : filter // ignore: cast_nullable_to_non_nullable
              as String,
      searchQuery: null == searchQuery
          ? _value.searchQuery
          : searchQuery // ignore: cast_nullable_to_non_nullable
              as String,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      showArchived: null == showArchived
          ? _value.showArchived
          : showArchived // ignore: cast_nullable_to_non_nullable
              as bool,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SessionsStateImplCopyWith<$Res>
    implements $SessionsStateCopyWith<$Res> {
  factory _$$SessionsStateImplCopyWith(
          _$SessionsStateImpl value, $Res Function(_$SessionsStateImpl) then) =
      __$$SessionsStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Session> sessions,
      bool isLoading,
      bool isLoadingMore,
      bool hasMore,
      String filter,
      String searchQuery,
      int page,
      bool showArchived,
      String? error});
}

/// @nodoc
class __$$SessionsStateImplCopyWithImpl<$Res>
    extends _$SessionsStateCopyWithImpl<$Res, _$SessionsStateImpl>
    implements _$$SessionsStateImplCopyWith<$Res> {
  __$$SessionsStateImplCopyWithImpl(
      _$SessionsStateImpl _value, $Res Function(_$SessionsStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of SessionsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessions = null,
    Object? isLoading = null,
    Object? isLoadingMore = null,
    Object? hasMore = null,
    Object? filter = null,
    Object? searchQuery = null,
    Object? page = null,
    Object? showArchived = null,
    Object? error = freezed,
  }) {
    return _then(_$SessionsStateImpl(
      sessions: null == sessions
          ? _value._sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<Session>,
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      isLoadingMore: null == isLoadingMore
          ? _value.isLoadingMore
          : isLoadingMore // ignore: cast_nullable_to_non_nullable
              as bool,
      hasMore: null == hasMore
          ? _value.hasMore
          : hasMore // ignore: cast_nullable_to_non_nullable
              as bool,
      filter: null == filter
          ? _value.filter
          : filter // ignore: cast_nullable_to_non_nullable
              as String,
      searchQuery: null == searchQuery
          ? _value.searchQuery
          : searchQuery // ignore: cast_nullable_to_non_nullable
              as String,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      showArchived: null == showArchived
          ? _value.showArchived
          : showArchived // ignore: cast_nullable_to_non_nullable
              as bool,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$SessionsStateImpl extends _SessionsState {
  const _$SessionsStateImpl(
      {final List<Session> sessions = const [],
      this.isLoading = true,
      this.isLoadingMore = false,
      this.hasMore = true,
      this.filter = 'all',
      this.searchQuery = '',
      this.page = 1,
      this.showArchived = false,
      this.error})
      : _sessions = sessions,
        super._();

  final List<Session> _sessions;
  @override
  @JsonKey()
  List<Session> get sessions {
    if (_sessions is EqualUnmodifiableListView) return _sessions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_sessions);
  }

  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool isLoadingMore;
  @override
  @JsonKey()
  final bool hasMore;
  @override
  @JsonKey()
  final String filter;
  @override
  @JsonKey()
  final String searchQuery;
  @override
  @JsonKey()
  final int page;
  @override
  @JsonKey()
  final bool showArchived;
  @override
  final String? error;

  @override
  String toString() {
    return 'SessionsState(sessions: $sessions, isLoading: $isLoading, isLoadingMore: $isLoadingMore, hasMore: $hasMore, filter: $filter, searchQuery: $searchQuery, page: $page, showArchived: $showArchived, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionsStateImpl &&
            const DeepCollectionEquality().equals(other._sessions, _sessions) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.isLoadingMore, isLoadingMore) ||
                other.isLoadingMore == isLoadingMore) &&
            (identical(other.hasMore, hasMore) || other.hasMore == hasMore) &&
            (identical(other.filter, filter) || other.filter == filter) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery) &&
            (identical(other.page, page) || other.page == page) &&
            (identical(other.showArchived, showArchived) ||
                other.showArchived == showArchived) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_sessions),
      isLoading,
      isLoadingMore,
      hasMore,
      filter,
      searchQuery,
      page,
      showArchived,
      error);

  /// Create a copy of SessionsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionsStateImplCopyWith<_$SessionsStateImpl> get copyWith =>
      __$$SessionsStateImplCopyWithImpl<_$SessionsStateImpl>(this, _$identity);
}

abstract class _SessionsState extends SessionsState {
  const factory _SessionsState(
      {final List<Session> sessions,
      final bool isLoading,
      final bool isLoadingMore,
      final bool hasMore,
      final String filter,
      final String searchQuery,
      final int page,
      final bool showArchived,
      final String? error}) = _$SessionsStateImpl;
  const _SessionsState._() : super._();

  @override
  List<Session> get sessions;
  @override
  bool get isLoading;
  @override
  bool get isLoadingMore;
  @override
  bool get hasMore;
  @override
  String get filter;
  @override
  String get searchQuery;
  @override
  int get page;
  @override
  bool get showArchived;
  @override
  String? get error;

  /// Create a copy of SessionsState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SessionsStateImplCopyWith<_$SessionsStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
