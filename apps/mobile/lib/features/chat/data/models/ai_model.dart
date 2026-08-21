import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_model.freezed.dart';

@freezed
class AiModel with _$AiModel {
  const AiModel._();

  const factory AiModel({
    required String id,
    required String name,
    required String provider,
    @Default(<String>['text']) List<String> input,
    @Default(false) bool reasoning,
  }) = _AiModel;

  factory AiModel.fromJson(Map<String, dynamic> json) {
    final rawInput = json['input'];
    List<String> parsedInput = ['text'];
    if (rawInput is List) {
      parsedInput = rawInput.map((e) => e.toString()).toList();
    }

    return AiModel(
      id: (json['id'] ?? '') as String,
      name: (json['name'] ?? json['id'] ?? '') as String,
      provider: (json['provider'] ?? 'custom') as String,
      input: parsedInput,
      reasoning: json['reasoning'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'provider': provider,
      'input': input,
      'reasoning': reasoning,
    };
  }
}
