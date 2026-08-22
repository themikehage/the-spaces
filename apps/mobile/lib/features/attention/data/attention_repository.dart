import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'models/attention_item.dart';

abstract class AttentionRepository {
  Future<List<AttentionItem>> getPending();

  Future<bool> respondToQuestion(
    String id, {
    List<String>? selectedOptions,
    String? customAnswer,
  });

  Future<bool> respondToApproval(
    String id, {
    required bool approved,
    Map<String, dynamic>? payload,
  });

  Future<bool> resolveAttention(
    String id, {
    required String action,
    Map<String, dynamic>? payload,
  });
}

class AttentionRepositoryImpl implements AttentionRepository {
  final ApiClient _apiClient;

  AttentionRepositoryImpl({required ApiClient apiClient})
      : _apiClient = apiClient;

  @override
  Future<List<AttentionItem>> getPending() async {
    final response = await _apiClient.get<dynamic>('/api/approvals');
    if (response is Map<String, dynamic>) {
      final list = response['pending'];
      if (list is List) {
        return list
            .map((item) => AttentionItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }

  @override
  Future<bool> respondToQuestion(
    String id, {
    List<String>? selectedOptions,
    String? customAnswer,
  }) async {
    final payload = <String, dynamic>{};
    if (selectedOptions != null && selectedOptions.isNotEmpty) {
      payload['selectedOptions'] = selectedOptions;
    }
    if (customAnswer != null && customAnswer.trim().isNotEmpty) {
      payload['customAnswer'] = customAnswer.trim();
    }

    return resolveAttention(
      id,
      action: 'submit',
      payload: payload.isNotEmpty ? payload : null,
    );
  }

  @override
  Future<bool> respondToApproval(
    String id, {
    required bool approved,
    Map<String, dynamic>? payload,
  }) async {
    return resolveAttention(
      id,
      action: approved ? 'approve' : 'deny',
      payload: payload,
    );
  }

  @override
  Future<bool> resolveAttention(
    String id, {
    required String action,
    Map<String, dynamic>? payload,
  }) async {
    final data = <String, dynamic>{
      'action': action,
      if (payload != null) 'payload': payload,
    };

    final response = await _apiClient.post<dynamic>(
      '/api/approvals/$id',
      data: data,
    );

    if (response is Map<String, dynamic>) {
      return response['success'] == true;
    }
    return true;
  }
}

final attentionRepositoryProvider = Provider<AttentionRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AttentionRepositoryImpl(apiClient: apiClient);
});
