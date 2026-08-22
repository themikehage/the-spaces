import 'package:freezed_annotation/freezed_annotation.dart';

part 'provider_config.freezed.dart';

@freezed
class ProviderConfig with _$ProviderConfig {
  const ProviderConfig._();

  const factory ProviderConfig({
    required String id,
    required String name,
    @Default(false) bool isConfigured,
    String? defaultModel,
    @Default(<String>[]) List<String> models,
  }) = _ProviderConfig;

  factory ProviderConfig.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? '') as String;
    final name = (json['name'] ?? id) as String;

    bool isConfigured = false;
    if (json['isConfigured'] is bool) {
      isConfigured = json['isConfigured'] as bool;
    } else if (json['authStatus'] is Map) {
      final authStatus = json['authStatus'] as Map;
      isConfigured = authStatus['configured'] == true;
    }

    final defaultModel = json['defaultModel'] as String?;

    List<String> modelList = [];
    if (json['models'] is List) {
      final rawList = json['models'] as List;
      for (final m in rawList) {
        if (m is Map) {
          final mId = m['id']?.toString() ?? '';
          if (mId.isNotEmpty) modelList.add(mId);
        } else if (m is String && m.isNotEmpty) {
          modelList.add(m);
        }
      }
    }

    return ProviderConfig(
      id: id,
      name: name,
      isConfigured: isConfigured,
      defaultModel: defaultModel,
      models: modelList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'isConfigured': isConfigured,
      if (defaultModel != null) 'defaultModel': defaultModel,
      'models': models,
    };
  }
}
