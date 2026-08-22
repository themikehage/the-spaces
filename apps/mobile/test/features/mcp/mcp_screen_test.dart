import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/mcp/data/mcp_repository.dart';
import 'package:spaces_mobile/features/mcp/data/models/mcp_server.dart';
import 'package:spaces_mobile/features/mcp/ui/mcp_screen.dart';

class MockMcpRepository implements McpRepository {
  List<McpServer> servers = [
    const McpServer(
      id: 'fetch',
      name: 'Fetch MCP',
      transport: 'stdio',
      command: 'uvx mcp-server-fetch',
      status: 'connected',
      tools: ['fetch_url'],
    ),
    const McpServer(
      id: 'github',
      name: 'GitHub MCP',
      transport: 'http',
      url: 'https://mcp.github.com',
      status: 'disconnected',
    ),
  ];

  String rawConfig = '{\n  "mcpServers": {\n    "fetch": {}\n  }\n}';
  bool saveCalled = false;
  String? lastSavedConfig;
  String? lastReconnectedId;

  @override
  Future<List<McpServer>> getServers() async => List.from(servers);

  @override
  Future<String> getConfigRaw() async => rawConfig;

  @override
  Future<void> saveConfig(String rawJson) async {
    saveCalled = true;
    lastSavedConfig = rawJson;
    rawConfig = rawJson;
  }

  @override
  Future<void> reconnectServer(String id) async {
    lastReconnectedId = id;
  }

  @override
  Future<void> addServer(McpServer server) async {
    servers.add(server);
  }

  @override
  Future<void> deleteServer(String id) async {
    servers.removeWhere((s) => s.id == id);
  }
}

void main() {
  group('McpScreen Widget Tests', () {
    late MockMcpRepository mockRepo;

    setUp(() {
      mockRepo = MockMcpRepository();
    });

    Widget buildTestWidget() {
      return ProviderScope(
        overrides: [
          mcpRepositoryProvider.overrideWithValue(mockRepo),
        ],
        child: MaterialApp(
          theme: AppTheme.dark(),
          home: const McpScreen(),
        ),
      );
    }

    testWidgets('renders Servers tab by default with server list and status badges', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('MCP Servers'), findsOneWidget);
      expect(find.text('Servers'), findsOneWidget);
      expect(find.text('Raw'), findsOneWidget);
      expect(find.text('Fetch MCP'), findsOneWidget);
      expect(find.text('GitHub MCP'), findsOneWidget);
      expect(find.text('STDIO'), findsOneWidget);
      expect(find.text('HTTP'), findsOneWidget);
      expect(find.text('CONNECTED'), findsOneWidget);
      expect(find.text('DISCONNECTED'), findsOneWidget);
      expect(find.text('• 1 tools'), findsOneWidget);
    });

    testWidgets('reconnect button triggers server reconnect', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final reconnectBtn = find.byKey(const Key('reconnect_btn_github'));
      expect(reconnectBtn, findsOneWidget);

      await tester.tap(reconnectBtn);
      await tester.pumpAndSettle();

      expect(mockRepo.lastReconnectedId, equals('github'));
    });

    testWidgets('tapping FAB opens AddMcpServerSheet and submits new server', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('add_mcp_server_fab')));
      await tester.pumpAndSettle();

      expect(find.text('Add MCP Server'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('add_mcp_name_input')),
        'Postgres Server',
      );
      await tester.enterText(
        find.byKey(const Key('add_mcp_command_url_input')),
        'npx -y @modelcontextprotocol/server-postgres',
      );

      await tester.tap(find.byKey(const Key('add_mcp_submit_btn')));
      await tester.pumpAndSettle();

      expect(find.text('Postgres Server'), findsOneWidget);
    });

    testWidgets('switching to Raw tab and saving with invalid JSON shows error without network call', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Switch to Raw tab
      await tester.tap(find.byKey(const Key('mcp_tab_raw')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('save_raw_mcp_btn')), findsOneWidget);
      expect(find.byKey(const Key('mcp_raw_json_input')), findsOneWidget);

      // Enter invalid JSON
      await tester.enterText(
        find.byKey(const Key('mcp_raw_json_input')),
        '{ invalid json: missing quotes }',
      );

      await tester.tap(find.byKey(const Key('save_raw_mcp_btn')));
      await tester.pumpAndSettle();

      expect(mockRepo.saveCalled, isFalse);
      expect(find.text('Invalid JSON configuration syntax'), findsOneWidget);
    });

    testWidgets('saving valid JSON calls repository and displays success SnackBar', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Switch to Raw tab
      await tester.tap(find.byKey(const Key('mcp_tab_raw')));
      await tester.pumpAndSettle();

      // Enter valid JSON
      const validJson = '{"mcpServers": {"memory": {"command": "npx -y @modelcontextprotocol/server-memory"}}}';
      await tester.enterText(
        find.byKey(const Key('mcp_raw_json_input')),
        validJson,
      );

      await tester.tap(find.byKey(const Key('save_raw_mcp_btn')));
      await tester.pumpAndSettle();

      expect(mockRepo.saveCalled, isTrue);
      expect(mockRepo.lastSavedConfig, equals(validJson));
      expect(find.text('MCP configuration saved successfully'), findsOneWidget);
    });
  });
}
