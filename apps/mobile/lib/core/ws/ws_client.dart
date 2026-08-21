import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../storage/app_storage.dart';

typedef WebSocketChannelFactory = WebSocketChannel Function(Uri uri);

class WsClient {
  final String _baseUrl;
  final AppStorage? _storage;
  final WebSocketChannelFactory _channelFactory;

  WebSocketChannel? _channel;
  StreamSubscription? _channelSubscription;
  Timer? _reconnectTimer;

  final _eventsController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStatusController = StreamController<bool>.broadcast();

  bool _isDisposed = false;
  bool _manuallyDisconnected = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;

  String? _currentSessionId;
  String? _currentToken;

  WsClient({
    String? baseUrl,
    AppStorage? storage,
    WebSocketChannelFactory? channelFactory,
  })  : _baseUrl = baseUrl ?? AppConfig.wsBaseUrl,
        _storage = storage,
        _channelFactory =
            channelFactory ?? ((uri) => WebSocketChannel.connect(uri));

  Stream<Map<String, dynamic>> get events => _eventsController.stream;
  Stream<bool> get isConnected => _connectionStatusController.stream;
  bool get connected => _channel != null;

  Future<void> connect({String? sessionId, String? token}) async {
    _manuallyDisconnected = false;
    _currentSessionId = sessionId;
    _currentToken = token ?? await _storage?.secureRead(StorageKey.authToken);

    final queryParams = <String, String>{};
    if (_currentSessionId != null && _currentSessionId!.isNotEmpty) {
      queryParams['sessionId'] = _currentSessionId!;
    }
    if (_currentToken != null && _currentToken!.isNotEmpty) {
      queryParams['token'] = _currentToken!;
    }

    final baseUri = Uri.parse(_baseUrl);
    final wsUri = Uri(
      scheme: baseUri.scheme == 'https' ? 'wss' : (baseUri.scheme == 'http' ? 'ws' : baseUri.scheme),
      host: baseUri.host,
      port: baseUri.port,
      path: '${baseUri.path.replaceAll(RegExp(r'/+$'), '')}/ws',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    _establishConnection(wsUri);
  }

  void _establishConnection(Uri uri) {
    if (_isDisposed || _manuallyDisconnected) return;

    _cleanupCurrentConnection();

    try {
      _channel = _channelFactory(uri);
      if (!_connectionStatusController.isClosed) {
        _connectionStatusController.add(true);
      }
      _reconnectAttempts = 0;
      _sendAuthMessage();

      _channelSubscription = _channel!.stream.listen(
        (dynamic rawData) {
          _handleIncomingData(rawData);
        },
        onError: (error) {
          if (!_connectionStatusController.isClosed) {
            _connectionStatusController.add(false);
          }
          _scheduleReconnect(uri);
        },
        onDone: () {
          if (!_connectionStatusController.isClosed) {
            _connectionStatusController.add(false);
          }
          if (!_manuallyDisconnected) {
            _scheduleReconnect(uri);
          }
        },
        cancelOnError: false,
      );
    } catch (_) {
      if (!_connectionStatusController.isClosed) {
        _connectionStatusController.add(false);
      }
      _scheduleReconnect(uri);
    }
  }

  void _sendAuthMessage() {
    if (_currentToken != null && _currentToken!.isNotEmpty) {
      send({
        'type': 'auth',
        'token': _currentToken,
        if (_currentSessionId != null && _currentSessionId!.isNotEmpty)
          'sessionId': _currentSessionId,
      });
    }
  }

  void subscribeToSession(String sessionId) {
    _currentSessionId = sessionId;
    if (connected) {
      send({'type': 'session_subscribe', 'sessionId': sessionId});
    }
  }

  void unsubscribeFromSession(String sessionId) {
    if (connected) {
      send({'type': 'session_unsubscribe', 'sessionId': sessionId});
    }
  }

  void _handleIncomingData(dynamic rawData) {
    try {
      final String payload;
      if (rawData is String) {
        payload = rawData;
      } else if (rawData is List<int>) {
        payload = utf8.decode(rawData);
      } else {
        payload = rawData.toString();
      }

      final dynamic decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        final type = decoded['type'] as String?;
        if (type == 'ping') {
          send({'type': 'pong'});
          return;
        }
        if (type == 'auth_success' &&
            _currentSessionId != null &&
            _currentSessionId!.isNotEmpty) {
          send({'type': 'session_subscribe', 'sessionId': _currentSessionId});
        }
        if (!_eventsController.isClosed) {
          _eventsController.add(decoded);
        }
      }
    } catch (_) {}
  }

  void _scheduleReconnect(Uri uri) {
    if (_manuallyDisconnected || _isDisposed) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) return;

    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    final delaySeconds = pow(2, _reconnectAttempts).toInt();
    _reconnectAttempts++;

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (!_manuallyDisconnected && !_isDisposed) {
        _establishConnection(uri);
      }
    });
  }

  void send(Map<String, dynamic> message) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void _cleanupCurrentConnection() {
    _channelSubscription?.cancel();
    _channelSubscription = null;
    _channel?.sink.close();
    _channel = null;
  }

  Future<void> disconnect() async {
    _manuallyDisconnected = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _cleanupCurrentConnection();
    if (!_connectionStatusController.isClosed) {
      _connectionStatusController.add(false);
    }
  }

  void dispose() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _cleanupCurrentConnection();
    _eventsController.close();
    _connectionStatusController.close();
  }
}

final wsClientProvider = Provider<WsClient>((ref) {
  final storage = ref.watch(appStorageProvider);
  final client = WsClient(storage: storage);
  ref.onDispose(() => client.dispose());
  return client;
});
