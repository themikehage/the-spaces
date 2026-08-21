import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum StorageKey {
  authToken('auth_token'),
  userId('user_id'),
  userEmail('user_email'),
  userName('user_name'),
  selectedModel('selected_model'),
  defaultProvider('default_provider'),
  themeMode('theme_mode'),
  activeSessionId('active_session_id'),
  activeProjectId('active_project_id'),
  sessionFilter('session_filter');

  final String keyName;
  const StorageKey(this.keyName);
}

class AppStorage {
  final FlutterSecureStorage _secureStorage;
  final SharedPreferences _prefs;

  AppStorage({
    required FlutterSecureStorage secureStorage,
    required SharedPreferences prefs,
  })  : _secureStorage = secureStorage,
        _prefs = prefs;

  static Future<AppStorage> create({
    FlutterSecureStorage? secureStorage,
    SharedPreferences? prefs,
  }) async {
    final secure = secureStorage ?? const FlutterSecureStorage();
    final sharedPrefs = prefs ?? await SharedPreferences.getInstance();
    return AppStorage(secureStorage: secure, prefs: sharedPrefs);
  }

  Future<String?> secureRead(StorageKey key) async {
    return _secureStorage.read(key: key.keyName);
  }

  Future<void> secureWrite(StorageKey key, String value) async {
    await _secureStorage.write(key: key.keyName, value: value);
  }

  Future<void> secureDelete(StorageKey key) async {
    await _secureStorage.delete(key: key.keyName);
  }

  Future<void> secureClear() async {
    await _secureStorage.deleteAll();
  }

  String? prefRead(StorageKey key) {
    return _prefs.getString(key.keyName);
  }

  Future<bool> prefWrite(StorageKey key, String value) {
    return _prefs.setString(key.keyName, value);
  }

  bool? prefReadBool(StorageKey key) {
    return _prefs.getBool(key.keyName);
  }

  Future<bool> prefWriteBool(StorageKey key, bool value) {
    return _prefs.setBool(key.keyName, value);
  }

  int? prefReadInt(StorageKey key) {
    return _prefs.getInt(key.keyName);
  }

  Future<bool> prefWriteInt(StorageKey key, int value) {
    return _prefs.setInt(key.keyName, value);
  }

  Future<bool> prefRemove(StorageKey key) {
    return _prefs.remove(key.keyName);
  }

  Future<bool> prefClear() {
    return _prefs.clear();
  }
}

final appStorageProvider = Provider<AppStorage>((ref) {
  throw UnimplementedError('appStorageProvider must be initialized in main');
});
