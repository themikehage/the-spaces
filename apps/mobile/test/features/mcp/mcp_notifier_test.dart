import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/mcp/data/mcp_repository.dart';
import 'package:spaces_mobile/features/mcp/data/models/mcp_server.dart';
import 'package:spaces_mobile/features/mcp/ui/mcp_notifier.dart';

class FakeMcpRepository implements McpRepository {
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

  String rawConfig = '''
{
  "mcpServers": {
    "fetch": {
      "command": "uvx mcp-server-fetch"
    }
  }
}
''';

  String? lastReconnectedId;
  String? lastSavedRaw;
  String? lastDeletedId;

  @override
  Future<List<McpServer>> getServers() async => List.from(servers);

  @override
  Future<String> getConfigRaw() async => rawConfig;

  @override
  Future<void> saveConfig(String rawJson) async {
    lastSavedRaw = rawJson;
    rawConfig = rawJson;
  }

  @override
  Future<void> reconnectServer(String id) async {
    lastReconnectedId = id;
    final idx = servers.indexWhere((s) => s.id == id);
    if (idx != -1) {
      servers[idx] = servers[idx].copyWith(status: 'connected');
    }
  }

  @override
  Future<void> addServer(McpServer server) async {
    servers.add(server);
  }

  @override
  Future<void> deleteServer(String id) async {
    lastDeletedId = id;
    servers.removeWhere((s) => s.id == id);
  }
}

void main() {
  group('McpNotifier Unit Tests', () {
    late FakeMcpRepository fakeRepo;
    late McpNotifier notifier;

    setUp(() {
      fakeRepo = FakeMcpRepository();
      notifier = McpNotifier(repository: fakeRepo);
    });

    test('initial load populates servers and raw JSON string', () async {
      await notifier.load();
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.servers.length, equals(2));
      expect(notifier.state.servers.first.name, equals('Fetch MCP'));
      expect(notifier.state.rawJson, contains('mcpServers'));
    });

    test('reconnect triggers repository reconnect and updates server status', () async {
      await notifier.load();
      final success = await notifier.reconnect('github');
      expect(success, isTrue);
      expect(fakeRepo.lastReconnectedId, equals('github'));
      expect(notifier.state.servers.firstWhere((s) => s.id == 'github').status, equals('connected'));
    });

    test('saveRaw saves raw JSON string without converting to complex model', () async {
      const newJson = '{"mcpServers": {"sqlite": {"command": "uvx mcp-server-sqlite"}}}';
      final success = await notifier.saveRaw(newJson);
      expect(success, isTrue);
      expect(fakeRepo.lastSavedRaw, equals(newJson));
      expect(notifier.state.rawJson, equals(newJson));
    });

    test('addServer adds new server and reloads list', () async {
      const newServer = McpServer(
        id: 'brave-search',
        name: 'Brave Search',
        transport: 'stdio',
        command: 'npx -y @modelcontextprotocol/server-brave-search',
        status: 'disconnected',
      );

      final success = await notifier.addServer(newServer);
      expect(success, isTrue);
      expect(notifier.state.servers.any((s) => s.id == 'brave-search'), isTrue);
    });

    test('deleteServer removes server from repository and state', () async {
      await notifier.load();
      final success = await notifier.deleteServer('github');
      expect(success, isTrue);
      expect(fakeRepo.lastDeletedId, equals('github'));
      expect(notifier.state.servers.any((s) => s.id == 'github'), isFalse);
    });
  });
}
