import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

class AppConfig {
  AppConfig._();

  static const String _prodApiUrl = 'https://the-spaces-api.pages.therry.dev';
  static const String _prodWsUrl = 'wss://the-spaces-api.pages.therry.dev';

  static String get _defaultHost {
    if (!kIsWeb && Platform.isAndroid) {
      return '10.0.2.2';
    }
    return 'localhost';
  }

  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('SPACES_API_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kReleaseMode) return _prodApiUrl;
    return 'http://$_defaultHost:3000';
  }

  static String get wsBaseUrl {
    const fromEnv = String.fromEnvironment('SPACES_WS_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kReleaseMode) return _prodWsUrl;
    return 'ws://$_defaultHost:3000';
  }

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 15);
}
