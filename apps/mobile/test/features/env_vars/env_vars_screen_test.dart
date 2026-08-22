import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/env_vars/data/env_vars_repository.dart';
import 'package:spaces_mobile/features/env_vars/data/models/env_var.dart';
import 'package:spaces_mobile/features/env_vars/ui/env_vars_screen.dart';

class MockEnvVarsRepository implements EnvVarsRepository {
  List<EnvVar> vars = [
    const EnvVar(key: 'SECRET_TOKEN', value: '••••••••'),
    const EnvVar(key: 'ENVIRONMENT', value: 'production'),
  ];
  Map<String, String> realValues = {
    'SECRET_TOKEN': 'super-secret-1234',
    'ENVIRONMENT': 'production',
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
  group('EnvVarsScreen Widget Tests', () {
    late MockEnvVarsRepository mockRepo;

    setUp(() {
      mockRepo = MockEnvVarsRepository();
    });

    Widget buildTestWidget() {
      return ProviderScope(
        overrides: [
          envVarsRepositoryProvider.overrideWithValue(mockRepo),
        ],
        child: MaterialApp(
          theme: AppTheme.dark(),
          home: const EnvVarsScreen(),
        ),
      );
    }

    testWidgets('renders list with masked values by default', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Env Vars'), findsOneWidget);
      expect(find.text('SECRET_TOKEN'), findsOneWidget);
      expect(find.text('ENVIRONMENT'), findsOneWidget);
      expect(find.text('••••••••'), findsWidgets);
      expect(find.text('super-secret-1234'), findsNothing);
    });

    testWidgets('tapping eye icon reveals value and tapping again hides it', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Find reveal button for SECRET_TOKEN
      final revealBtn = find.byKey(const Key('reveal_btn_SECRET_TOKEN'));
      expect(revealBtn, findsOneWidget);

      await tester.tap(revealBtn);
      await tester.pumpAndSettle();

      // Now revealed
      expect(find.text('super-secret-1234'), findsOneWidget);

      // Tap again to hide
      await tester.tap(revealBtn);
      await tester.pumpAndSettle();

      expect(find.text('super-secret-1234'), findsNothing);
      expect(find.text('••••••••'), findsWidgets);
    });

    testWidgets('tapping FAB opens AddEnvVarSheet and adds variable', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('add_env_var_fab')));
      await tester.pumpAndSettle();

      expect(find.text('Add Environment Variable'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('add_env_var_key_input')),
        'new_api_key',
      );
      await tester.enterText(
        find.byKey(const Key('add_env_var_value_input')),
        'key-value-999',
      );

      await tester.tap(find.byKey(const Key('add_env_var_submit_btn')));
      await tester.pumpAndSettle();

      expect(find.text('NEW_API_KEY'), findsOneWidget);
    });

    testWidgets('tapping Edit .env opens bulk editor and saves variables', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('edit_bulk_env_btn')));
      await tester.pumpAndSettle();

      expect(find.text('Edit .env (Bulk)'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('bulk_env_content_input')),
        'APP_NAME=SpacesMobile\nAPP_ENV=staging',
      );

      await tester.tap(find.byKey(const Key('bulk_env_save_btn')));
      await tester.pumpAndSettle();

      expect(find.text('APP_NAME'), findsOneWidget);
      expect(find.text('APP_ENV'), findsOneWidget);
    });
  });
}
