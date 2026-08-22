import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/shared/widgets/offline_banner.dart';

void main() {
  group('OfflineBanner', () {
    testWidgets('shows banner when disconnected and hides when connected',
        (tester) async {
      final streamController =
          StreamController<List<ConnectivityResult>>.broadcast();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OfflineBanner(
              connectivityStream: streamController.stream,
              child: const Text('App Content'),
            ),
          ),
        ),
      );

      // Initially connected (no banner shown)
      expect(find.text('App Content'), findsOneWidget);
      expect(find.byKey(const Key('offline_banner_container')), findsNothing);

      // Simulate disconnection (empty or none)
      streamController.add([ConnectivityResult.none]);
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('offline_banner_container')), findsOneWidget);
      expect(
        find.text('No internet connection. Operating offline.'),
        findsOneWidget,
      );

      // Simulate connection restored
      streamController.add([ConnectivityResult.wifi]);
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('offline_banner_container')), findsNothing);

      await streamController.close();
    });
  });
}
