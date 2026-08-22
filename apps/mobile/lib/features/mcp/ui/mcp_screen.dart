import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class McpScreen extends ConsumerWidget {
  const McpScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('MCP Servers'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Servers'),
              Tab(text: 'Raw'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            Center(child: CircularProgressIndicator()),
            Center(child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }
}
