class McpServer {
  final String id;
  final String name;
  final String? description;
  final String transport; // 'stdio' | 'http'
  final String? command;
  final List<String>? args;
  final Map<String, dynamic>? env;
  final String? url;
  final String status; // 'connected' | 'connecting' | 'disconnected' | 'error'
  final String? error;
  final bool installed;
  final bool enabled;
  final bool isBuiltin;
  final String? category;
  final String? icon;
  final List<String>? tools;
  final String? lastConnected;

  const McpServer({
    required this.id,
    required this.name,
    this.description,
    this.transport = 'stdio',
    this.command,
    this.args,
    this.env,
    this.url,
    this.status = 'disconnected',
    this.error,
    this.installed = true,
    this.enabled = true,
    this.isBuiltin = false,
    this.category,
    this.icon,
    this.tools,
    this.lastConnected,
  });

  bool get isConnected => status.toLowerCase() == 'connected';
  bool get isConnecting => status.toLowerCase() == 'connecting';
  bool get isError => status.toLowerCase() == 'error';
  bool get isDisconnected => status.toLowerCase() == 'disconnected';

  factory McpServer.fromJson(Map<String, dynamic> json) {
    List<String>? parsedArgs;
    if (json['args'] is List) {
      parsedArgs = (json['args'] as List).map((e) => e.toString()).toList();
    }

    List<String>? parsedTools;
    if (json['tools'] is List) {
      parsedTools = (json['tools'] as List).map((e) => e.toString()).toList();
    }

    Map<String, dynamic>? parsedEnv;
    if (json['env'] is Map) {
      parsedEnv = Map<String, dynamic>.from(json['env'] as Map);
    }

    final id = json['id'] as String? ?? json['name'] as String? ?? '';
    final name = json['name'] as String? ?? id;

    return McpServer(
      id: id,
      name: name,
      description: json['description'] as String?,
      transport: json['transport'] as String? ?? (json['url'] != null ? 'http' : 'stdio'),
      command: json['command'] as String?,
      args: parsedArgs,
      env: parsedEnv,
      url: json['url'] as String?,
      status: json['status'] as String? ?? 'disconnected',
      error: json['error'] as String?,
      installed: json['installed'] as bool? ?? true,
      enabled: json['enabled'] as bool? ?? true,
      isBuiltin: json['isBuiltin'] as bool? ?? false,
      category: json['category'] as String?,
      icon: json['icon'] as String?,
      tools: parsedTools,
      lastConnected: json['lastConnected'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'transport': transport,
      if (command != null) 'command': command,
      if (args != null) 'args': args,
      if (env != null) 'env': env,
      if (url != null) 'url': url,
      'status': status,
      if (error != null) 'error': error,
      'installed': installed,
      'enabled': enabled,
      'isBuiltin': isBuiltin,
      if (category != null) 'category': category,
      if (icon != null) 'icon': icon,
      if (tools != null) 'tools': tools,
      if (lastConnected != null) 'lastConnected': lastConnected,
    };
  }

  McpServer copyWith({
    String? id,
    String? name,
    String? description,
    String? transport,
    String? command,
    List<String>? args,
    Map<String, dynamic>? env,
    String? url,
    String? status,
    String? error,
    bool? installed,
    bool? enabled,
    bool? isBuiltin,
    String? category,
    String? icon,
    List<String>? tools,
    String? lastConnected,
  }) {
    return McpServer(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      transport: transport ?? this.transport,
      command: command ?? this.command,
      args: args ?? this.args,
      env: env ?? this.env,
      url: url ?? this.url,
      status: status ?? this.status,
      error: error ?? this.error,
      installed: installed ?? this.installed,
      enabled: enabled ?? this.enabled,
      isBuiltin: isBuiltin ?? this.isBuiltin,
      category: category ?? this.category,
      icon: icon ?? this.icon,
      tools: tools ?? this.tools,
      lastConnected: lastConnected ?? this.lastConnected,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is McpServer &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          transport == other.transport &&
          status == other.status &&
          command == other.command &&
          url == other.url;

  @override
  int get hashCode =>
      id.hashCode ^
      name.hashCode ^
      transport.hashCode ^
      status.hashCode ^
      command.hashCode ^
      url.hashCode;
}
