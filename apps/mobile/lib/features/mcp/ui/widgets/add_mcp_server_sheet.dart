import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/mcp_server.dart';
import '../mcp_notifier.dart';

class AddMcpServerSheet extends ConsumerStatefulWidget {
  const AddMcpServerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (_) => const AddMcpServerSheet(),
    );
  }

  @override
  ConsumerState<AddMcpServerSheet> createState() => _AddMcpServerSheetState();
}

class _AddMcpServerSheetState extends ConsumerState<AddMcpServerSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _commandOrUrlController = TextEditingController();
  final _argsController = TextEditingController();
  String _transport = 'stdio';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _commandOrUrlController.dispose();
    _argsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final id = _nameController.text.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final name = _nameController.text.trim();

    List<String>? parsedArgs;
    if (_argsController.text.trim().isNotEmpty) {
      parsedArgs = _argsController.text
          .trim()
          .split(RegExp(r'[\s,]+'))
          .where((s) => s.isNotEmpty)
          .toList();
    }

    final newServer = McpServer(
      id: id,
      name: name,
      transport: _transport,
      command: _transport == 'stdio' ? _commandOrUrlController.text.trim() : null,
      url: _transport == 'http' ? _commandOrUrlController.text.trim() : null,
      args: _transport == 'stdio' ? parsedArgs : null,
      status: 'disconnected',
      installed: true,
      enabled: true,
    );

    final success = await ref.read(mcpNotifierProvider.notifier).addServer(newServer);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('MCP Server added successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to add MCP server')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Add MCP Server',
                  style: AppTypography.titleMedium,
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'stdio',
                  label: Text('STDIO'),
                  icon: Icon(Icons.terminal_outlined, size: 16),
                ),
                ButtonSegment(
                  value: 'http',
                  label: Text('HTTP / SSE'),
                  icon: Icon(Icons.http_outlined, size: 16),
                ),
              ],
              selected: {_transport},
              onSelectionChanged: (selected) {
                setState(() => _transport = selected.first);
              },
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              key: const Key('add_mcp_name_input'),
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Server Name',
                hintText: 'e.g. Memory, GitHub, Postgres',
                prefixIcon: Icon(Icons.label_outlined, size: 18),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Name is required';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              key: const Key('add_mcp_command_url_input'),
              controller: _commandOrUrlController,
              decoration: InputDecoration(
                labelText: _transport == 'stdio' ? 'Command' : 'Server URL',
                hintText: _transport == 'stdio' ? 'e.g. npx -y @modelcontextprotocol/server' : 'https://example.com/sse',
                prefixIcon: Icon(
                  _transport == 'stdio' ? Icons.code : Icons.link,
                  size: 18,
                ),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return _transport == 'stdio' ? 'Command is required' : 'URL is required';
                }
                return null;
              },
            ),
            if (_transport == 'stdio') ...[
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                key: const Key('add_mcp_args_input'),
                controller: _argsController,
                decoration: const InputDecoration(
                  labelText: 'Arguments (Optional)',
                  hintText: 'e.g. -y @modelcontextprotocol/server-postgres',
                  prefixIcon: Icon(Icons.data_array, size: 18),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              key: const Key('add_mcp_submit_btn'),
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Add Server'),
            ),
          ],
        ),
      ),
    );
  }
}
