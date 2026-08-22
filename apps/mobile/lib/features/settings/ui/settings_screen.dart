import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../data/models/provider_config.dart';
import 'settings_notifier.dart';
import 'widgets/provider_list_item.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static const List<Map<String, String>> _supportedLanguages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'es', 'name': 'Español'},
    {'code': 'pt', 'name': 'Português'},
    {'code': 'fr', 'name': 'Français'},
    {'code': 'de', 'name': 'Deutsch'},
    {'code': 'zh', 'name': '中文'},
    {'code': 'ja', 'name': '日本語'},
  ];

  static const List<Map<String, String>> _fallbackProviders = [
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

  List<ProviderConfig> _mergeProviders(List<ProviderConfig> existing) {
    final map = {for (final p in existing) p.id: p};
    final List<ProviderConfig> merged = [];

    for (final def in _fallbackProviders) {
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

    // Add any extra providers returned by server
    for (final p in existing) {
      if (!merged.any((m) => m.id == p.id)) {
        merged.add(p);
      }
    }

    return merged;
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
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

  void _showClearDataDialog(BuildContext context, WidgetRef ref) {
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
  Widget build(BuildContext context, WidgetRef ref) {
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
          IconButton(
            key: const Key('refresh_settings_button'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload settings',
            onPressed: () => notifier.load(),
          ),
        ],
      ),
      body: state.isLoading && state.providers.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : RefreshIndicator(
              onRefresh: () => notifier.load(),
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  // Section 1: General
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
                          _supportedLanguages.firstWhere(
                            (l) => l['code'] == state.settings.responseLanguage,
                            orElse: () => {'name': state.settings.responseLanguage},
                          )['name']!,
                        ),
                        trailing: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            key: const Key('response_language_dropdown'),
                            value: _supportedLanguages.any(
                                    (l) => l['code'] == state.settings.responseLanguage)
                                ? state.settings.responseLanguage
                                : 'en',
                            items: _supportedLanguages
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

                  // Section 2: Providers
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

                  const SizedBox(height: AppSpacing.xl),

                  // Section 3: Security & Storage
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
                        onTap: () => _showClearDataDialog(context, ref),
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
                        onTap: () => _showLogoutDialog(context, ref),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                ],
              ),
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
          color: isDark ? AppColors.primary : AppColors.primary,
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
