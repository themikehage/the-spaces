import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spaces_mobile/core/api/api_client.dart';
import 'package:spaces_mobile/core/storage/app_storage.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:spaces_mobile/main.dart';

import 'core/api/api_client_test.dart';
import 'core/ws/ws_client_test.dart';
import 'helpers/fake_secure_storage.dart';

void main() {
  testWidgets('SpacesApp smoke test redirects to login when unauthenticated', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    final storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    final mockAdapter = MockHttpAdapter();
    dio.httpClientAdapter = mockAdapter;
    final apiClient = ApiClient(storage: storage, dio: dio);

    final fakeChannel = FakeWebSocketChannel();
    final wsClient = WsClient(
      baseUrl: 'ws://localhost:3000',
      channelFactory: (uri) => fakeChannel,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appStorageProvider.overrideWithValue(storage),
          apiClientProvider.overrideWithValue(apiClient),
          wsClientProvider.overrideWithValue(wsClient),
        ],
        child: const SpacesApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Welcome to Spaces'), findsOneWidget);
    expect(find.byKey(const Key('login_submit_button')), findsOneWidget);

    wsClient.dispose();
    fakeChannel.incomingController.close();
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('SpacesApp renders dashboard when token is present on startup', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({'user_name': 'spacesadmin'});
    final prefs = await SharedPreferences.getInstance();
    final fakeSecure = FakeSecureStorage();
    await fakeSecure.write(key: 'auth_token', value: 'saved-token');
    final storage = AppStorage(secureStorage: fakeSecure, prefs: prefs);

    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    final mockAdapter = MockHttpAdapter();
    mockAdapter.responseBody = ResponseBody.fromString(
      jsonEncode({'status': 'ok', 'version': '1.0.0'}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
    dio.httpClientAdapter = mockAdapter;
    final apiClient = ApiClient(storage: storage, dio: dio);

    final fakeChannel = FakeWebSocketChannel();
    final wsClient = WsClient(
      baseUrl: 'ws://localhost:3000',
      channelFactory: (uri) => fakeChannel,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appStorageProvider.overrideWithValue(storage),
          apiClientProvider.overrideWithValue(apiClient),
          wsClientProvider.overrideWithValue(wsClient),
        ],
        child: const SpacesApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.textContaining('Welcome back, spacesadmin!'), findsOneWidget);
    expect(find.byKey(const Key('dashboard_logout_button')), findsOneWidget);

    wsClient.dispose();
    fakeChannel.incomingController.close();
    await tester.pumpWidget(const SizedBox());
  });
}
