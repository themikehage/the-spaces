class EnvVar {
  final String key;
  final String value;
  final String? createdAt;

  const EnvVar({
    required this.key,
    required this.value,
    this.createdAt,
  });

  factory EnvVar.fromJson(Map<String, dynamic> json) {
    return EnvVar(
      key: json['key'] as String? ?? '',
      value: json['value'] as String? ?? '••••••••',
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'value': value,
      if (createdAt != null) 'createdAt': createdAt,
    };
  }

  EnvVar copyWith({
    String? key,
    String? value,
    String? createdAt,
  }) {
    return EnvVar(
      key: key ?? this.key,
      value: value ?? this.value,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EnvVar &&
          runtimeType == other.runtimeType &&
          key == other.key &&
          value == other.value &&
          createdAt == other.createdAt;

  @override
  int get hashCode => key.hashCode ^ value.hashCode ^ createdAt.hashCode;
}
