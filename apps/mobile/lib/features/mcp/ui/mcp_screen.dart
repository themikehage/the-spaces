import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import 'mcp_notifier.dart';
import 'widgets/add_mcp_server_sheet.dart';
import 'widgets/mcp_server_list_item.dart';

class McpScreen extends ConsumerStatefulWidget {
  const McpScreen({super.key});

  @override
  ConsumerState<McpScreen> createState() => _McpScreenState();
}

class _McpScreenState extends ConsumerState<McpScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final TextEditingController _rawJsonController;
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging || _tabController.index != _currentTabIndex) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });

    final initialRaw = ref.read(mcpNotifierProvider).rawJson;
    _rawJsonController = TextEditingController(text: initialRaw);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _rawJsonController.dispose();
    super.dispose();
  }

  Future<void> _handleSaveRaw() async {
    final text = _rawJsonController.text.trim();

    // Strict JSON validation in UI before network call
    try {
      jsonDecode(text);
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid JSON configuration syntax'),
          backgroundColor: AppColors.destructive,
        ),
      );
      return;
    }

    final success =
        await ref.read(mcpNotifierProvider.notifier).saveRaw(text);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('MCP configuration saved successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to save MCP configuration'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mcpNotifierProvider);
    final notifier = ref.read(mcpNotifierProvider.notifier);

    // Sync raw JSON if changed from server and not currently typing
    ref.listen<McpState>(mcpNotifierProvider, (previous, next) {
      if (previous?.rawJson != next.rawJson &&
          _rawJsonController.text != next.rawJson &&
          !next.isSubmitting) {
        _rawJsonController.text = next.rawJson;
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('MCP Servers'),
        actions: [
          if (_currentTabIndex == 1)
            TextButton.icon(
              key: const Key('save_raw_mcp_btn'),
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined, size: 18),
              label: const Text('Save'),
              onPressed: state.isSubmitting ? null : _handleSaveRaw,
            ),
          const SizedBox(width: AppSpacing.xs),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(key: Key('mcp_tab_servers'), text: 'Servers'),
            Tab(key: Key('mcp_tab_raw'), text: 'Raw'),
          ],
        ),
      ),
      floatingActionButton: _currentTabIndex == 0
          ? FloatingActionButton(
              key: const Key('add_mcp_server_fab'),
              tooltip: 'Add MCP Server',
              onPressed: () => AddMcpServerSheet.show(context),
              child: const Icon(Icons.add),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 0: Servers list
          _buildServersTab(state, notifier),
          // Tab 1: Raw JSON Editor
          _buildRawTab(state),
        ],
      ),
    );
  }

  Widget _buildServersTab(McpState state, McpNotifier notifier) {
    if (state.isLoading && state.servers.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.servers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline,
                color: AppColors.destructive,
                size: 48,
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Failed to load MCP servers',
                style: AppTypography.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                state.error!,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton.icon(
                onPressed: () => notifier.load(),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.servers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.extension_outlined,
                  color: AppColors.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'No MCP Servers Configured',
                style: AppTypography.titleMedium,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Add Model Context Protocol servers to provide external tools to your agents',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton.icon(
                onPressed: () => AddMcpServerSheet.show(context),
                icon: const Icon(Icons.add),
                label: const Text('Add MCP Server'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => notifier.load(),
      child: ListView.builder(
        padding: const EdgeInsets.only(
          top: AppSpacing.sm,
          bottom: 80, // Space for FAB
        ),
        itemCount: state.servers.length,
        itemBuilder: (context, index) {
          final server = state.servers[index];
          final isConnecting = state.connectingServerId == server.id;

          return McpServerListItem(
            server: server,
            isConnecting: isConnecting,
            onReconnect: () => notifier.reconnect(server.id),
            onDelete: () => notifier.deleteServer(server.id),
          );
        },
      ),
    );
  }

  Widget _buildRawTab(McpState state) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.darkCard,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Direct JSON configuration for MCP servers. Validated before save.',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.darkBackground,
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                border: Border.all(color: AppColors.darkBorder),
              ),
              child: TextField(
                key: const Key('mcp_raw_json_input'),
                controller: _rawJsonController,
                maxLines: null,
                expands: true,
                style: AppTypography.code.copyWith(
                  color: AppColors.darkForeground,
                  fontSize: 12,
                ),
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.all(AppSpacing.md),
                  border: InputBorder.none,
                  hintText: '{\n  "mcpServers": {}\n}',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
