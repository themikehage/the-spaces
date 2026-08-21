import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/ws/ws_client.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class FakeWebSocketSink extends Fake implements WebSocketSink {
  final List<dynamic> sentMessages = [];
  final Completer<void> _doneCompleter = Completer<void>();

  @override
  void add(dynamic data) {
    sentMessages.add(data);
  }

  @override
  Future<void> close([int? closeCode, String? closeReason]) async {
    if (!_doneCompleter.isCompleted) {
      _doneCompleter.complete();
    }
  }

  @override
  Future<void> get done => _doneCompleter.future;
}

class FakeWebSocketChannel extends Fake implements WebSocketChannel {
  final StreamController<dynamic> incomingController = StreamController<dynamic>.broadcast();
  final FakeWebSocketSink fakeSink = FakeWebSocketSink();

  @override
  Stream<dynamic> get stream => incomingController.stream;

  @override
  WebSocketSink get sink => fakeSink;

  @override
  Future<void> get ready => Future.value();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeWebSocketChannel fakeChannel;
  late WsClient wsClient;

  setUp(() {
    fakeChannel = FakeWebSocketChannel();
    wsClient = WsClient(
      baseUrl: 'ws://localhost:3000',
      channelFactory: (uri) => fakeChannel,
    );
  });

  tearDown(() {
    wsClient.dispose();
    fakeChannel.incomingController.close();
  });

  group('WsClient Tests', () {
    test('connect and receive event stream', () async {
      await wsClient.connect(sessionId: 'session-123');

      final futureEvent = wsClient.events.first;
      fakeChannel.incomingController.add(
        jsonEncode({
          'type': 'connected',
          'sessionId': 'session-123',
        }),
      );

      final event = await futureEvent;
      expect(event['type'], equals('connected'));
      expect(event['sessionId'], equals('session-123'));
    });

    test('send message serializes to json and forwards to sink', () async {
      await wsClient.connect();

      wsClient.send({
        'type': 'chat_message',
        'content': 'Hello AI',
      });

      expect(fakeChannel.fakeSink.sentMessages.length, equals(1));
      final decoded = jsonDecode(fakeChannel.fakeSink.sentMessages.first as String);
      expect(decoded['type'], equals('chat_message'));
      expect(decoded['content'], equals('Hello AI'));
    });
  });
}
