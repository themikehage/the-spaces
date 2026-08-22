import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import 'models/uploaded_file.dart';

class FileUploadRepository {
  final ApiClient _apiClient;

  FileUploadRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<UploadedFile> uploadFile({
    required String filePath,
    String? projectName,
    String? agentId,
    String? teamId,
    String? channelId,
    void Function(int count, int total)? onSendProgress,
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw BadRequestException(message: 'File not found at path: $filePath');
    }

    final fileName = filePath.split(Platform.pathSeparator).last.split('/').last;

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          filePath,
          filename: fileName,
        ),
      });

      final queryParams = <String, dynamic>{};
      if (projectName != null && projectName.isNotEmpty) {
        queryParams['project'] = projectName;
      }
      if (agentId != null && agentId.isNotEmpty) {
        queryParams['agentId'] = agentId;
      }
      if (teamId != null && teamId.isNotEmpty) {
        queryParams['teamId'] = teamId;
      }
      if (channelId != null && channelId.isNotEmpty) {
        queryParams['channelId'] = channelId;
      }

      final response = await _apiClient.post<dynamic>(
        '/api/workspace/assets/uploads',
        data: formData,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
        options: Options(
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
        fromJson: (data) {
          if (data is Map<String, dynamic>) {
            return UploadedFile.fromJson(data);
          }
          throw const ServerException(message: 'Invalid response format from upload endpoint');
        },
      );

      return response as UploadedFile;
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(
        message: 'Failed to upload file: $e',
        details: e.toString(),
      );
    }
  }
}

final fileUploadRepositoryProvider = Provider<FileUploadRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return FileUploadRepository(apiClient: apiClient);
});
