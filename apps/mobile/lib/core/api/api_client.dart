import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../storage/app_storage.dart';
import 'api_exception.dart';

class ApiClient {
  final Dio _dio;
  final AppStorage _storage;

  ApiClient({
    required AppStorage storage,
    Dio? dio,
    String? baseUrl,
  })  : _storage = storage,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl ?? AppConfig.apiBaseUrl,
                connectTimeout: AppConfig.connectTimeout,
                receiveTimeout: AppConfig.receiveTimeout,
                sendTimeout: AppConfig.sendTimeout,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            ) {
    _setupInterceptors();
  }

  Dio get dio => _dio;

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.secureRead(StorageKey.authToken);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          final mappedException = _mapDioException(error);
          return handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: error.type,
              error: mappedException,
              message: mappedException.message,
            ),
          );
        },
      ),
    );
  }

  ApiException _mapDioException(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return NetworkException(
        message: 'Unable to connect to the server. Please check your connection.',
        details: error.error,
      );
    }

    final response = error.response;
    if (response == null) {
      return NetworkException(
        message: error.message ?? 'Network error occurred.',
        details: error.error,
      );
    }

    final statusCode = response.statusCode ?? 500;
    final dynamic data = response.data;
    String message = 'An unexpected error occurred.';
    String? code;
    dynamic details;

    if (data is Map<String, dynamic>) {
      message = data['error']?.toString() ??
          data['message']?.toString() ??
          message;
      code = data['code']?.toString();
      details = data['details'];
    } else if (data is String && data.isNotEmpty) {
      message = data;
    }

    switch (statusCode) {
      case 400:
        return BadRequestException(message: message, code: code, details: details);
      case 401:
        return UnauthorizedException(message: message, code: code, details: details);
      case 403:
        return ForbiddenException(message: message, code: code, details: details);
      case 404:
        return NotFoundException(message: message, code: code, details: details);
      case 409:
        return ConflictException(message: message, code: code, details: details);
      case 500:
      default:
        return ServerException(message: message, code: code, details: details);
    }
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final effectiveOptions = options ?? (headers != null ? Options(headers: headers) : null);
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: effectiveOptions,
      );
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiException) {
        throw e.error as ApiException;
      }
      throw _mapDioException(e);
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final effectiveOptions = options ?? (headers != null ? Options(headers: headers) : null);
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: effectiveOptions,
      );
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiException) {
        throw e.error as ApiException;
      }
      throw _mapDioException(e);
    }
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final effectiveOptions = options ?? (headers != null ? Options(headers: headers) : null);
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: effectiveOptions,
      );
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiException) {
        throw e.error as ApiException;
      }
      throw _mapDioException(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final effectiveOptions = options ?? (headers != null ? Options(headers: headers) : null);
      final response = await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: effectiveOptions,
      );
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiException) {
        throw e.error as ApiException;
      }
      throw _mapDioException(e);
    }
  }

  Future<T> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    Options? options,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final effectiveOptions = options ?? (headers != null ? Options(headers: headers) : null);
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: effectiveOptions,
      );
      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      if (e.error is ApiException) {
        throw e.error as ApiException;
      }
      throw _mapDioException(e);
    }
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(appStorageProvider);
  return ApiClient(storage: storage);
});
