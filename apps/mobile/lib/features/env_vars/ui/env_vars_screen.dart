import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EnvVarsScreen extends ConsumerWidget {
  const EnvVarsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Env Vars'),
      ),
      body: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
