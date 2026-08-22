import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/env_vars/data/env_vars_repository.dart';
import 'package:spaces_mobile/features/env_vars/data/models/env_var.dart';
import 'package:spaces_mobile/features/env_vars/ui/env_vars_notifier.dart';

class FakeEnvVarsRepository implements EnvVarsRepository {
  List<EnvVar> vars = [
    const EnvVar(key: 'OPENAI_API_KEY', value: '••••••••'),
    const EnvVar(key: 'PORT', value: '3000'),
  ];
  Map<String, String> realValues = {
    'OPENAI_API_KEY': 'sk-test-12345',
    'PORT': '3000',
  };

  @override
  Future<List<EnvVar>> getEnvVars() async => List.from(vars);

  @override
  Future<String> revealEnvVar(String key) async => realValues[key] ?? '';

  @override
  Future<void> addEnvVar({required String key, required String value}) async {
    vars.add(EnvVar(key: key, value: value));
    realValues[key] = value;
  }

  @override
  Future<void> deleteEnvVar(String key) async {
    vars.removeWhere((v) => v.key == key);
    realValues.remove(key);
  }

  @override
  Future<void> bulkSaveEnvVars(Map<String, String> variables) async {
    vars = variables.entries
        .map((e) => EnvVar(key: e.key, value: e.value))
        .toList();
    realValues = Map.from(variables);
  }
}

void main() {
  group('EnvVarsNotifier Unit Tests', () {
    late FakeEnvVarsRepository fakeRepo;
    late EnvVarsNotifier notifier;

    setUp(() {
      fakeRepo = FakeEnvVarsRepository();
      notifier = EnvVarsNotifier(repository: fakeRepo);
    });

    test('initial state loads env vars', () async {
      await notifier.load();
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.vars.length, equals(2));
      expect(notifier.state.vars.first.key, equals('OPENAI_API_KEY'));
      expect(notifier.state.revealedKeys, isEmpty);
    });

    test('toggleReveal reveals masked variable and fetches decrypted value', () async {
      await notifier.load();
      expect(notifier.state.revealedKeys.contains('OPENAI_API_KEY'), isFalse);

      await notifier.toggleReveal('OPENAI_API_KEY');
      expect(notifier.state.revealedKeys.contains('OPENAI_API_KEY'), isTrue);
      final item = notifier.state.vars.firstWhere((v) => v.key == 'OPENAI_API_KEY');
      expect(item.value, equals('sk-test-12345'));

      // Toggling again hides it
      await notifier.toggleReveal('OPENAI_API_KEY');
      expect(notifier.state.revealedKeys.contains('OPENAI_API_KEY'), isFalse);
    });

    test('addVar adds variable in uppercase and reloads', () async {
      final success = await notifier.addVar(key: 'db_host', value: 'localhost');
      expect(success, isTrue);
      expect(notifier.state.vars.any((v) => v.key == 'DB_HOST'), isTrue);
    });

    test('deleteVar removes variable from state and revealedKeys', () async {
      await notifier.load();
      await notifier.toggleReveal('PORT');
      expect(notifier.state.revealedKeys.contains('PORT'), isTrue);

      final success = await notifier.deleteVar('PORT');
      expect(success, isTrue);
      expect(notifier.state.vars.any((v) => v.key == 'PORT'), isFalse);
      expect(notifier.state.revealedKeys.contains('PORT'), isFalse);
    });

    test('bulkSave parses dotEnv formatted content and persists', () async {
      const content = '''
# Comments should be ignored
API_URL=https://api.example.com
DEBUG=true

INVALID_LINE_WITHOUT_EQUALS
''';
      final success = await notifier.bulkSave(content);
      expect(success, isTrue);
      expect(notifier.state.vars.length, equals(2));
      expect(notifier.state.vars.any((v) => v.key == 'API_URL'), isTrue);
      expect(notifier.state.vars.any((v) => v.key == 'DEBUG'), isTrue);
    });
  });
}
