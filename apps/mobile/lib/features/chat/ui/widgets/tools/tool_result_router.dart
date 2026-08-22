import 'package:flutter/material.dart';

import '../../../data/models/chat_message.dart';
import 'bash_result_renderer.dart';
import 'edit_result_renderer.dart';
import 'generic_tool_card.dart';
import 'grep_result_renderer.dart';
import 'read_result_renderer.dart';
import 'write_result_renderer.dart';

class ToolResultRouter extends StatelessWidget {
  final ToolCall toolCall;

  const ToolResultRouter({
    super.key,
    required this.toolCall,
  });

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

      default:
        return GenericToolCard(toolCall: toolCall);
    }
  }
}
