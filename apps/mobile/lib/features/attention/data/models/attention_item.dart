class AttentionItem {
  final String approvalId;
  final String sessionId;
  final String toolName;
  final String kind;
  final String? type;
  final Map<String, dynamic> args;
  final String reason;
  final int? expiresAt;
  final String status;
  final String? username;
  final String? projectId;
  final String? agentId;
  final String? teamId;
  final String? parentSessionId;
  final DateTime? createdAt;

  const AttentionItem({
    required this.approvalId,
    required this.sessionId,
    this.toolName = '',
    this.kind = 'approval',
    this.type,
    this.args = const {},
    this.reason = '',
    this.expiresAt,
    this.status = 'pending',
    this.username,
    this.projectId,
    this.agentId,
    this.teamId,
    this.parentSessionId,
    this.createdAt,
  });

  String get id => approvalId;

  bool get isQuestion {
    final effectiveType = type ?? kind;
    return effectiveType == 'question' || toolName == 'ask_question';
  }

  bool get isApproval => !isQuestion;

  String get questionText {
    if (args.containsKey('question') && args['question'] != null) {
      return args['question'].toString();
    }
    if (reason.isNotEmpty) {
      return reason;
    }
    return toolName;
  }

  List<String> get optionsList {
    final rawOptions = args['options'];
    if (rawOptions is List) {
      return rawOptions.map((e) => e.toString()).toList();
    }
    return const [];
  }

  bool get isMultiSelect => args['isMultiSelect'] == true;

  bool get allowCustom => args['allowCustom'] != false;

  String? get placeholder => args['placeholder']?.toString();

  String get commandPreview {
    if (toolName == 'bash' && args['command'] != null) {
      return args['command'].toString();
    }
    if ((toolName == 'write' || toolName == 'edit') &&
        (args['path'] != null || args['filepath'] != null)) {
      return (args['path'] ?? args['filepath']).toString();
    }
    if (args.isNotEmpty) {
      return args.toString();
    }
    return reason;
  }

  factory AttentionItem.fromJson(Map<String, dynamic> json) {
    final approvalId = json['approvalId']?.toString() ??
        json['id']?.toString() ??
        json['requestId']?.toString() ??
        '';
    final sessionId = json['sessionId']?.toString() ?? '';
    final toolName = json['toolName']?.toString() ?? json['tool']?.toString() ?? '';
    final rawKind = json['kind']?.toString() ?? json['type']?.toString() ?? 'approval';
    final rawType = json['type']?.toString();

    final rawArgs = json['args'] ?? json['params'];
    final Map<String, dynamic> args = rawArgs is Map<String, dynamic>
        ? rawArgs
        : (rawArgs is Map ? rawArgs.cast<String, dynamic>() : {});

    DateTime? createdAt;
    if (json['createdAt'] != null) {
      createdAt = DateTime.tryParse(json['createdAt'].toString());
    }

    return AttentionItem(
      approvalId: approvalId,
      sessionId: sessionId,
      toolName: toolName,
      kind: rawKind,
      type: rawType,
      args: args,
      reason: json['reason']?.toString() ?? '',
      expiresAt: json['expiresAt'] is num ? (json['expiresAt'] as num).toInt() : null,
      status: json['status']?.toString() ?? 'pending',
      username: json['username']?.toString(),
      projectId: json['projectId']?.toString(),
      agentId: json['agentId']?.toString(),
      teamId: json['teamId']?.toString(),
      parentSessionId: json['parentSessionId']?.toString(),
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'approvalId': approvalId,
      'sessionId': sessionId,
      'toolName': toolName,
      'kind': kind,
      if (type != null) 'type': type,
      'args': args,
      'reason': reason,
      if (expiresAt != null) 'expiresAt': expiresAt,
      'status': status,
      if (username != null) 'username': username,
      if (projectId != null) 'projectId': projectId,
      if (agentId != null) 'agentId': agentId,
      if (teamId != null) 'teamId': teamId,
      if (parentSessionId != null) 'parentSessionId': parentSessionId,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    };
  }

  AttentionItem copyWith({
    String? approvalId,
    String? sessionId,
    String? toolName,
    String? kind,
    String? type,
    Map<String, dynamic>? args,
    String? reason,
    int? expiresAt,
    String? status,
    String? username,
    String? projectId,
    String? agentId,
    String? teamId,
    String? parentSessionId,
    DateTime? createdAt,
  }) {
    return AttentionItem(
      approvalId: approvalId ?? this.approvalId,
      sessionId: sessionId ?? this.sessionId,
      toolName: toolName ?? this.toolName,
      kind: kind ?? this.kind,
      type: type ?? this.type,
      args: args ?? this.args,
      reason: reason ?? this.reason,
      expiresAt: expiresAt ?? this.expiresAt,
      status: status ?? this.status,
      username: username ?? this.username,
      projectId: projectId ?? this.projectId,
      agentId: agentId ?? this.agentId,
      teamId: teamId ?? this.teamId,
      parentSessionId: parentSessionId ?? this.parentSessionId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AttentionItem && other.approvalId == approvalId;
  }

  @override
  int get hashCode => approvalId.hashCode;
}
