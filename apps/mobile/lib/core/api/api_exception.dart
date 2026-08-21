class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;
  final dynamic details;

  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.details,
  });

  @override
  String toString() =>
      'ApiException(statusCode: $statusCode, code: $code, message: $message)';
}

class BadRequestException extends ApiException {
  const BadRequestException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 400);
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 401);
}

class ForbiddenException extends ApiException {
  const ForbiddenException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 403);
}

class NotFoundException extends ApiException {
  const NotFoundException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 404);
}

class ConflictException extends ApiException {
  const ConflictException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 409);
}

class ServerException extends ApiException {
  const ServerException({
    required super.message,
    super.code,
    super.details,
  }) : super(statusCode: 500);
}

class NetworkException extends ApiException {
  const NetworkException({
    required super.message,
    super.details,
  }) : super(statusCode: null, code: 'NETWORK_ERROR');
}
