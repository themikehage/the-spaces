import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/sessions/ui/widgets/session_status_dot.dart';

void main() {
  group('SessionStatusDot Widget Tests', () {
    testWidgets('renders active status with primary color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SessionStatusDot(status: 'active'),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byKey(const Key('session_status_dot_active')));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.primary);
      expect(decoration.shape, BoxShape.circle);
    });

    testWidgets('renders streaming status with AnimatedBuilder and pulse effect', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SessionStatusDot(status: 'streaming'),
          ),
        ),
      );

      expect(
        find.descendant(
          of: find.byType(SessionStatusDot),
          matching: find.byType(AnimatedBuilder),
        ),
        findsOneWidget,
      );

      final container = tester.widget<Container>(find.byKey(const Key('session_status_dot_streaming')));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.success);
      expect(decoration.boxShadow, isNotNull);

      // Verify pulse animation ticks
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.byType(Opacity), findsOneWidget);
    });

    testWidgets('renders task-running status with warning color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SessionStatusDot(status: 'task_running'),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byKey(const Key('session_status_dot_task_running')));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.warning);
    });

    testWidgets('renders sleeping status with muted color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SessionStatusDot(status: 'sleeping'),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byKey(const Key('session_status_dot_sleeping')));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.mutedForeground);
    });
  });
}
