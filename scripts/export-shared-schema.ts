// SPDX-License-Identifier: MIT
import * as fs from "node:fs";
import * as path from "node:path";

const targetDir = path.resolve(import.meta.dir, "../apps/mobile/lib/core/models");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sharedTypesContent = `// Generated automatically from packages/shared schemas
// Do not edit manually

class Session {
  final String id;
  final String name;
  final String createdAt;
  final String updatedAt;
  final int messageCount;
  final String? status;
  final String? projectId;
  final String? agentId;
  final String? teamId;
  final String? modelId;
  final int? totalTokens;
  final int? toolCallCount;
  final int? durationMs;
  final bool? archived;
  final String? autonomyMode;

  const Session({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    required this.messageCount,
    this.status,
    this.projectId,
    this.agentId,
    this.teamId,
    this.modelId,
    this.totalTokens,
    this.toolCallCount,
    this.durationMs,
    this.archived,
    this.autonomyMode,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      messageCount: (json['messageCount'] as num?)?.toInt() ?? 0,
      status: json['status'] as String?,
      projectId: json['projectId'] as String?,
      agentId: json['agentId'] as String?,
      teamId: json['teamId'] as String?,
      modelId: json['modelId'] as String?,
      totalTokens: (json['totalTokens'] as num?)?.toInt(),
      toolCallCount: (json['toolCallCount'] as num?)?.toInt(),
      durationMs: (json['durationMs'] as num?)?.toInt(),
      archived: json['archived'] as bool?,
      autonomyMode: json['autonomyMode'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'messageCount': messageCount,
      if (status != null) 'status': status,
      if (projectId != null) 'projectId': projectId,
      if (agentId != null) 'agentId': agentId,
      if (teamId != null) 'teamId': teamId,
      if (modelId != null) 'modelId': modelId,
      if (totalTokens != null) 'totalTokens': totalTokens,
      if (toolCallCount != null) 'toolCallCount': toolCallCount,
      if (durationMs != null) 'durationMs': durationMs,
      if (archived != null) 'archived': archived,
      if (autonomyMode != null) 'autonomyMode': autonomyMode,
    };
  }
}

class Agent {
  final String id;
  final String name;
  final String? description;
  final String? systemPrompt;
  final String? model;
  final List<String> tools;
  final List<String> skills;
  final String? tag;
  final String? avatar;

  const Agent({
    required this.id,
    required this.name,
    this.description,
    this.systemPrompt,
    this.model,
    this.tools = const [],
    this.skills = const [],
    this.tag,
    this.avatar,
  });

  factory Agent.fromJson(Map<String, dynamic> json) {
    return Agent(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      systemPrompt: json['systemPrompt'] as String?,
      model: json['model'] as String?,
      tools: (json['tools'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      skills: (json['skills'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      tag: json['tag'] as String?,
      avatar: json['avatar'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      if (systemPrompt != null) 'systemPrompt': systemPrompt,
      if (model != null) 'model': model,
      'tools': tools,
      'skills': skills,
      if (tag != null) 'tag': tag,
      if (avatar != null) 'avatar': avatar,
    };
  }
}

class Team {
  final String id;
  final String name;
  final String? description;
  final List<String> members;
  final String? tag;
  final String? avatar;

  const Team({
    required this.id,
    required this.name,
    this.description,
    this.members = const [],
    this.tag,
    this.avatar,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      members: (json['members'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      tag: json['tag'] as String?,
      avatar: json['avatar'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'members': members,
      if (tag != null) 'tag': tag,
      if (avatar != null) 'avatar': avatar,
    };
  }
}

class Project {
  final String id;
  final String name;
  final String? description;
  final String path;
  final String? tag;
  final String? createdAt;
  final String? updatedAt;

  const Project({
    required this.id,
    required this.name,
    this.description,
    required this.path,
    this.tag,
    this.createdAt,
    this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      path: json['path'] as String? ?? '',
      tag: json['tag'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'path': path,
      if (tag != null) 'tag': tag,
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
    };
  }
}

class AttentionItem {
  final String id;
  final String sessionId;
  final String type;
  final String title;
  final String message;
  final String timestamp;
  final String? toolCallId;
  final Map<String, dynamic>? details;

  const AttentionItem({
    required this.id,
    required this.sessionId,
    required this.type,
    required this.title,
    required this.message,
    required this.timestamp,
    this.toolCallId,
    this.details,
  });

  factory AttentionItem.fromJson(Map<String, dynamic> json) {
    return AttentionItem(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      timestamp: json['timestamp'] as String,
      toolCallId: json['toolCallId'] as String?,
      details: json['details'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sessionId': sessionId,
      'type': type,
      'title': title,
      'message': message,
      'timestamp': timestamp,
      if (toolCallId != null) 'toolCallId': toolCallId,
      if (details != null) 'details': details,
    };
  }
}
`;

const targetFile = path.join(targetDir, "shared_types.dart");
fs.writeFileSync(targetFile, sharedTypesContent, "utf-8");
console.log(`Successfully exported shared contracts to ${targetFile}`);
