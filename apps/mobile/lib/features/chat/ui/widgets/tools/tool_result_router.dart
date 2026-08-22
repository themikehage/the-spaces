import 'dart:convert';
import 'package:flutter/material.dart';

import '../../../data/models/chat_message.dart';
import '../../../data/models/subagent_session.dart';
import '../subagent_live_view.dart';
import 'bash_result_renderer.dart';
import 'custom_ui/custom_ui_renderer.dart';
import 'edit_result_renderer.dart';
import 'exa_result_card.dart';
import 'find_result_card.dart';
import 'generic_tool_card.dart';
import 'grep_result_renderer.dart';
import 'memory_result_card.dart';
import 'read_result_renderer.dart';
import 'share_file_card.dart';
import 'task_card.dart';
import 'web_fetch_card.dart';
import 'workflow_card.dart';
import 'write_result_renderer.dart';

class ToolResultRouter extends StatelessWidget {
  final ToolCall toolCall;
  final String? authToken;
  final String? sessionId;

  const ToolResultRouter({
    super.key,
    required this.toolCall,
    this.authToken,
    this.sessionId,
  });

  dynamic _extractUiPayload() {
    final args = toolCall.arguments;

    // 1. Check arguments for explicit 'ui' or 'customUi'
    if (args.containsKey('ui')) return args['ui'];
    if (args.containsKey('customUi')) return args['customUi'];

    // 2. Check result
    if (toolCall.result != null) {
      if (toolCall.result is Map) {
        final res = toolCall.result as Map;
        if (res.containsKey('ui')) return res['ui'];
        if (res.containsKey('customUi')) return res['customUi'];
        if (res.containsKey('images') || res.containsKey('urls')) return res;
        if (res.containsKey('html')) return res;
      } else if (toolCall.result is String) {
        try {
          final decoded = jsonDecode(toolCall.result as String);
          if (decoded is Map) {
            if (decoded.containsKey('ui')) return decoded['ui'];
            if (decoded.containsKey('customUi')) return decoded['customUi'];
            if (decoded.containsKey('images') || decoded.containsKey('urls')) {
              return decoded;
            }
            if (decoded.containsKey('html')) return decoded;
          }
        } catch (_) {}
      }
    }

    // 3. Fallback to arguments map for custom tools
    final normalized = toolCall.name.trim().toLowerCase();
    if (normalized == 'render_images' || normalized == 'generate_image') {
      if (!args.containsKey('type')) {
        final copy = Map<String, dynamic>.from(args);
        copy['type'] = 'image-grid';
        return copy;
      }
    }
    if (normalized == 'render_html') {
      if (!args.containsKey('type')) {
        final copy = Map<String, dynamic>.from(args);
        copy['type'] = 'html';
        return copy;
      }
    }

    return args.isNotEmpty ? args : null;
  }

  Map<String, dynamic>? _extractPresentation() {
    final args = toolCall.arguments;
    if (args.containsKey('presentation') && args['presentation'] is Map) {
      return Map<String, dynamic>.from(args['presentation'] as Map);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final normalizedName = toolCall.name.trim().toLowerCase();

    switch (normalizedName) {
      case 'edit':
      case 'str_replace':
      case 'edit_file':
      case 'replace_file_content':
      case 'multi_replace_file_content':
        return EditResultRenderer(toolCall: toolCall);

      case 'read':
      case 'view_file':
      case 'read_file':
        return ReadResultRenderer(toolCall: toolCall);

      case 'bash':
      case 'run_command':
      case 'command':
        return BashResultRenderer(toolCall: toolCall);

      case 'grep_search':
      case 'search':
      case 'grep':
        return GrepResultRenderer(toolCall: toolCall);

      case 'write_to_file':
      case 'create_file':
      case 'write':
        return WriteResultRenderer(toolCall: toolCall);

      case 'find':
      case 'list_dir':
      case 'ls':
        return FindResultCard(toolCall: toolCall);

      case 'exa_search':
        return ExaResultCard(toolCall: toolCall);

      case 'memory':
      case 'mem_save':
      case 'mem_search':
      case 'mem_context':
      case 'mem_get_observation':
      case 'memory_store':
      case 'memory_recall':
      case 'memory_forget':
        return MemoryResultCard(toolCall: toolCall);

      case 'web_fetch':
      case 'fetch_web_page':
      case 'read_url_content':
        return WebFetchCard(toolCall: toolCall);

      case 'manage_workflow':
      case 'manage_factory':
        return WorkflowCard(toolCall: toolCall);

      case 'task':
      case 'decompose_tasks':
        return TaskCard(toolCall: toolCall);

      case 'share_file':
        return ShareFileCard(toolCall: toolCall);

      case 'spawn_subagent':
      case 'delegate_task':
      case 'manage_delegations': {
        if (toolCall.subagentSession != null ||
            (toolCall.subagentEvents != null && toolCall.subagentEvents!.isNotEmpty)) {
          return SubagentLiveView(
            session: toolCall.subagentSession,
            events: toolCall.subagentEvents ?? const [],
            subagentName: toolCall.name,
            status: toolCall.isRunning
                ? SubagentStatus.running
                : (toolCall.isError ? SubagentStatus.error : SubagentStatus.done),
            initiallyExpanded: toolCall.isRunning,
          );
        }
        return GenericToolCard(toolCall: toolCall);
      }

      case 'render_html':
      case 'render_chart':
      case 'render_images':
      case 'generate_image':
      case 'custom_ui':
      case 'custom_tool': {
        final uiPayload = _extractUiPayload();
        if (uiPayload != null) {
          return CustomUiRenderer(
            ui: uiPayload,
            presentation: _extractPresentation(),
            authToken: authToken,
            sessionId: sessionId,
          );
        }
        return GenericToolCard(toolCall: toolCall);
      }

      default: {
        final uiPayload = _extractUiPayload();
        if (uiPayload != null &&
            (uiPayload is List ||
                (uiPayload is Map &&
                    (uiPayload.containsKey('type') ||
                        uiPayload.containsKey('images') ||
                        uiPayload.containsKey('cards') ||
                        uiPayload.containsKey('stats') ||
                        uiPayload.containsKey('steps') ||
                        uiPayload.containsKey('columns'))))) {
          return CustomUiRenderer(
            ui: uiPayload,
            presentation: _extractPresentation(),
            authToken: authToken,
            sessionId: sessionId,
          );
        }
        return GenericToolCard(toolCall: toolCall);
      }
    }
  }
}
