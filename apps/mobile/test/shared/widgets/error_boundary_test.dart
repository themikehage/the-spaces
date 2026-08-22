import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/shared/widgets/error_boundary.dart';

void main() {
  group('ErrorBoundary & ErrorDisplay', () {
    testWidgets('renders child normally when there is no error',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ErrorBoundary(
            child: Text('Normal Screen Content'),
          ),
        ),
      );

      expect(find.text('Normal Screen Content'), findsOneWidget);
      expect(find.text('Something went wrong'), findsNothing);
    });

    testWidgets('ErrorDisplay renders message and retry button', (tester) async {
      bool retried = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ErrorDisplay(
              message: 'Database connection failed',
              onRetry: () => retried = true,
            ),
          ),
        ),
      );

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(
        find.text('An unexpected error occurred. Please try again.'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('error_boundary_retry_button')), findsOneWidget);

      await tester.tap(find.byKey(const Key('error_boundary_retry_button')));
      await tester.pump();

      expect(retried, isTrue);

      // Toggle technical details
      expect(find.text('Show technical details'), findsOneWidget);
      await tester.tap(find.text('Show technical details'));
      await tester.pump();

      expect(find.text('Hide technical details'), findsOneWidget);
      expect(find.text('Database connection failed'), findsOneWidget);
    });
  });
}
