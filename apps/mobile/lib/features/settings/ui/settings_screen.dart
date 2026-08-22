import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import '../../env_vars/ui/env_vars_notifier.dart';
import '../../env_vars/ui/widgets/add_env_var_sheet.dart';
import '../../env_vars/ui/widgets/bulk_env_editor_sheet.dart';
import '../../env_vars/ui/widgets/env_var_list_item.dart';
import '../../mcp/ui/mcp_notifier.dart';
import '../../mcp/ui/widgets/add_mcp_server_sheet.dart';
import '../../mcp/ui/widgets/mcp_server_list_item.dart';
import '../data/models/provider_config.dart';
import 'settings_notifier.dart';
import 'widgets/provider_list_item.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  final int initialTabIndex;

  const SettingsScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  static const List<Map<String, String>> supportedLanguages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'es', 'name': 'Español'},
    {'code': 'pt', 'name': 'Português'},
    {'code': 'fr', 'name': 'Français'},
    {'code': 'de', 'name': 'Deutsch'},
    {'code': 'zh', 'name': '中文'},
    {'code': 'ja', 'name': '日本語'},
  ];

  static const List<Map<String, String>> fallbackProviders = [
    {'id': 'openai', 'name': 'OpenAI'},
    {'id': 'anthropic', 'name': 'Anthropic'},
    {'id': 'gemini', 'name': 'Google Gemini'},
    {'id': 'xai', 'name': 'xAI'},
    {'id': 'deepseek', 'name': 'DeepSeek'},
    {'id': 'groq', 'name': 'Groq'},
    {'id': 'mistral', 'name': 'Mistral'},
    {'id': 'openrouter', 'name': 'OpenRouter'},
    {'id': 'qwen', 'name': 'Qwen'},
  ];

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentTabIndex = widget.initialTabIndex;
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _tabController.addListener(_handleTabChange);
  }

  void _handleTabChange() {
    if (_tabController.index != _currentTabIndex) {
      setState(() {
        _currentTabIndex = _tabController.index;
      });
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    super.dispose();
  }

  List<ProviderConfig> _mergeProviders(List<ProviderConfig> existing) {
    final map = {for (final p in existing) p.id: p};
    final List<ProviderConfig> merged = [];

    for (final def in SettingsScreen.fallbackProviders) {
      final id = def['id']!;
      if (map.containsKey(id)) {
        merged.add(map[id]!);
      } else {
        merged.add(
          ProviderConfig(
            id: id,
            name: def['name']!,
            isConfigured: false,
          ),
        );
      }
    }

    for (final p in existing) {
      if (!merged.any((m) => m.id == p.id)) {
        merged.add(p);
      }
    }

    return merged;
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out'),
        content: const Text('Are you sure you want to log out from Spaces?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('confirm_logout_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            onPressed: () {
              Navigator.of(dialogContext).pop();
              ref.read(settingsNotifierProvider.notifier).logout();
            },
            child: const Text('Log Out'),
          ),
        ],
      ),
    );
  }

  void _showClearDataDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Clear Local Cache'),
        content: const Text(
          'This will clear cached data and preferences from device storage. Your settings in the cloud will remain safe.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('confirm_clear_cache_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: AppColors.destructiveForeground,
            ),
            onPressed: () {
              Navigator.of(dialogContext).pop();
              ref.read(settingsNotifierProvider.notifier).clearLocalData();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Local cache cleared successfully.'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(settingsNotifierProvider);
    final notifier = ref.read(settingsNotifierProvider.notifier);

    final mergedProviders = _mergeProviders(state.providers);
    final configuredCount =
        mergedProviders.where((p) => p.isConfigured).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          if (_currentTabIndex == 2)
            IconButton(
              key: const Key('edit_bulk_env_btn'),
              icon: const Icon(Icons.edit_note_outlined),
              tooltip: 'Edit .env',
              onPressed: () => BulkEnvEditorSheet.show(context),
            ),
          IconButton(
            key: const Key('refresh_settings_button'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload settings',
            onPressed: () {
              notifier.load();
              if (_currentTabIndex == 2) {
                ref.read(envVarsNotifierProvider.notifier).load();
              } else if (_currentTabIndex == 3) {
                ref.read(mcpNotifierProvider.notifier).load();
              }
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(key: Key('settings_tab_general'), text: 'General'),
            Tab(key: Key('settings_tab_providers'), text: 'AI Providers'),
            Tab(key: Key('settings_tab_env'), text: 'Env Vars'),
            Tab(key: Key('settings_tab_mcp'), text: 'MCP Servers'),
          ],
        ),
      ),
      floatingActionButton: _currentTabIndex == 2
          ? FloatingActionButton(
              key: const Key('add_env_var_fab'),
              tooltip: 'Add Environment Variable',
              onPressed: () => AddEnvVarSheet.show(context),
              child: const Icon(Icons.add),
            )
          : _currentTabIndex == 3
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
          // Tab 0: General
          _buildGeneralTab(context, isDark, state, notifier, mergedProviders),

          // Tab 1: AI Providers
          _buildProvidersTab(isDark, state, notifier, mergedProviders, configuredCount),

          // Tab 2: Env Vars
          _buildEnvVarsTab(),

          // Tab 3: MCP Servers
          _buildMcpTab(),
        ],
      ),
    );
  }

  Widget _buildGeneralTab(
    BuildContext context,
    bool isDark,
    dynamic state,
    dynamic notifier,
    List<ProviderConfig> mergedProviders,
  ) {
    if (state.isLoading && state.providers.isEmpty) {
      return const SkeletonList(itemCount: 5);
    }

    return RefreshIndicator(
      onRefresh: () => notifier.load(),
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          _buildSectionHeader(
            context,
            title: 'General',
            icon: Icons.tune,
            isDark: isDark,
          ),
          const SizedBox(height: AppSpacing.sm),
          _buildCard(
            isDark: isDark,
            children: [
              // Response Language
              ListTile(
                title: const Text('Response Language'),
                subtitle: Text(
                  SettingsScreen.supportedLanguages.firstWhere(
                    (l) => l['code'] == state.settings.responseLanguage,
                    orElse: () => {'name': state.settings.responseLanguage},
                  )['name']!,
                ),
                trailing: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    key: const Key('response_language_dropdown'),
                    value: SettingsScreen.supportedLanguages.any(
                            (l) => l['code'] == state.settings.responseLanguage)
                        ? state.settings.responseLanguage
                        : 'en',
                    items: SettingsScreen.supportedLanguages
                        .map(
                          (l) => DropdownMenuItem<String>(
                            value: l['code'],
                            child: Text(l['name']!),
                          ),
                        )
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        notifier.updateSetting('responseLanguage', val);
                      }
                    },
                  ),
                ),
              ),
              const Divider(),
              // Default Provider Selector
              ListTile(
                title: const Text('Default Provider'),
                subtitle: Text(
                  state.settings.defaultProvider ?? 'Auto / None',
                ),
                trailing: DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    key: const Key('default_provider_dropdown'),
                    value: mergedProviders.any(
                            (p) => p.id == state.settings.defaultProvider)
                        ? state.settings.defaultProvider
                        : null,
                    hint: const Text('Select default'),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('None (Auto)'),
                      ),
                      ...mergedProviders.map(
                        (p) => DropdownMenuItem<String?>(
                          value: p.id,
                          child: Text(p.name),
                        ),
                      ),
                    ],
                    onChanged: (val) {
                      notifier.updateSetting('defaultProvider', val);
                    },
                  ),
                ),
              ),
              const Divider(),
              // Memory Enabled
              SwitchListTile(
                key: const Key('memory_enabled_switch'),
                title: const Text('Memory Enabled'),
                subtitle: const Text('Recall context across chat sessions'),
                value: state.settings.memoryEnabled,
                activeThumbColor: AppColors.primary,
                onChanged: (val) {
                  notifier.updateSetting('memoryEnabled', val);
                },
              ),
              const Divider(),
              // Memory Auto Store
              SwitchListTile(
                key: const Key('memory_auto_store_switch'),
                title: const Text('Memory Auto-Store'),
                subtitle: const Text('Automatically extract facts and memories'),
                value: state.settings.memoryAutoStore,
                activeThumbColor: AppColors.primary,
                onChanged: (val) {
                  notifier.updateSetting('memoryAutoStore', val);
                },
              ),
              const Divider(),
              // Exa Search Enabled
              SwitchListTile(
                key: const Key('exa_search_enabled_switch'),
                title: const Text('Exa Web Search'),
                subtitle: const Text('Allow agents to search live web content'),
                value: state.settings.exaSearchEnabled,
                activeThumbColor: AppColors.primary,
                onChanged: (val) {
                  notifier.updateSetting('exaSearchEnabled', val);
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xl),

          // Security & Storage Section
          _buildSectionHeader(
            context,
            title: 'Security & Storage',
            icon: Icons.shield_outlined,
            isDark: isDark,
          ),
          const SizedBox(height: AppSpacing.sm),
          _buildCard(
            isDark: isDark,
            children: [
              ListTile(
                key: const Key('clear_cache_tile'),
                leading: const Icon(
                  Icons.cleaning_services_outlined,
                  color: AppColors.warning,
                ),
                title: const Text('Clear Local Cache'),
                subtitle: const Text('Reset device storage cache'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showClearDataDialog,
              ),
              const Divider(),
              ListTile(
                key: const Key('logout_tile'),
                leading: const Icon(
                  Icons.logout,
                  color: AppColors.destructive,
                ),
                title: Text(
                  'Log Out',
                  style: TextStyle(
                    color: isDark
                        ? AppColors.destructive
                        : AppColors.destructive,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text('Sign out from this device'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showLogoutDialog,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  Widget _buildProvidersTab(
    bool isDark,
    dynamic state,
    dynamic notifier,
    List<ProviderConfig> mergedProviders,
    int configuredCount,
  ) {
    if (state.isLoading && state.providers.isEmpty) {
      return const SkeletonList(itemCount: 5);
    }

    return RefreshIndicator(
      onRefresh: () => notifier.load(),
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          _buildSectionHeader(
            context,
            title: 'AI Providers',
            subtitle: 'Configured $configuredCount of ${mergedProviders.length}',
            icon: Icons.hub,
            isDark: isDark,
          ),
          const SizedBox(height: AppSpacing.sm),
          ...mergedProviders.map(
            (provider) => ProviderListItem(
              key: ValueKey('provider_${provider.id}_${provider.isConfigured}'),
              provider: provider,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  Widget _buildEnvVarsTab() {
    final envState = ref.watch(envVarsNotifierProvider);
    final envNotifier = ref.read(envVarsNotifierProvider.notifier);

    if (envState.isLoading && envState.vars.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (envState.error != null && envState.vars.isEmpty) {
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
                'Failed to load environment variables',
                style: AppTypography.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                envState.error!,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton.icon(
                onPressed: () => envNotifier.load(),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (envState.vars.isEmpty) {
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
                  Icons.vpn_key_outlined,
                  color: AppColors.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'No Environment Variables',
                style: AppTypography.titleMedium,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Define workspace variables for agents and tools',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton.icon(
                onPressed: () => AddEnvVarSheet.show(context),
                icon: const Icon(Icons.add),
                label: const Text('Add First Variable'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => envNotifier.load(),
      child: ListView.builder(
        padding: const EdgeInsets.only(
          top: AppSpacing.sm,
          bottom: 80,
        ),
        itemCount: envState.vars.length,
        itemBuilder: (context, index) {
          final envVar = envState.vars[index];
          final isRevealed = envState.revealedKeys.contains(envVar.key);

          return EnvVarListItem(
            envVar: envVar,
            isRevealed: isRevealed,
            onToggleReveal: () => envNotifier.toggleReveal(envVar.key),
            onDelete: () => envNotifier.deleteVar(envVar.key),
          );
        },
      ),
    );
  }

  Widget _buildMcpTab() {
    final mcpState = ref.watch(mcpNotifierProvider);
    final mcpNotifier = ref.read(mcpNotifierProvider.notifier);

    if (mcpState.isLoading && mcpState.servers.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (mcpState.error != null && mcpState.servers.isEmpty) {
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
                mcpState.error!,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.mutedForeground,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton.icon(
                onPressed: () => mcpNotifier.load(),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (mcpState.servers.isEmpty) {
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
      onRefresh: () => mcpNotifier.load(),
      child: ListView.builder(
        padding: const EdgeInsets.only(
          top: AppSpacing.sm,
          bottom: 80,
        ),
        itemCount: mcpState.servers.length,
        itemBuilder: (context, index) {
          final server = mcpState.servers[index];
          final isConnecting = mcpState.connectingServerId == server.id;

          return McpServerListItem(
            server: server,
            isConnecting: isConnecting,
            onReconnect: () => mcpNotifier.reconnect(server.id),
            onDelete: () => mcpNotifier.deleteServer(server.id),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required String title,
    String? subtitle,
    required IconData icon,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: AppColors.primary,
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          title,
          style: AppTypography.titleLarge.copyWith(
            color: isDark
                ? AppColors.darkForeground
                : AppColors.lightForeground,
          ),
        ),
        const Spacer(),
        if (subtitle != null)
          Text(
            subtitle,
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.mutedForeground,
            ),
          ),
      ],
    );
  }

  Widget _buildCard({
    required bool isDark,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        children: children,
      ),
    );
  }
}
