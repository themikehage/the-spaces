import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/attention_item.dart';

class LocalNotificationService with WidgetsBindingObserver {
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  final void Function(String route)? _onNotificationTap;
  final void Function(String title, String body, String? payload)? _onShowNotification;

  LocalNotificationService({
    void Function(String route)? onNotificationTap,
    void Function(String title, String body, String? payload)? onShowNotification,
  })  : _onNotificationTap = onNotificationTap,
        _onShowNotification = onShowNotification {
    WidgetsBinding.instance.addObserver(this);
  }

  bool get isBackground =>
      _lifecycleState == AppLifecycleState.paused ||
      _lifecycleState == AppLifecycleState.detached ||
      _lifecycleState == AppLifecycleState.hidden;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
  }

  void setLifecycleStateForTesting(AppLifecycleState state) {
    _lifecycleState = state;
  }

  Future<void> showAttentionNotification(AttentionItem item) async {
    if (!isBackground) {
      return;
    }

    final title = item.isQuestion
        ? 'Spaces — Question from Agent'
        : 'Spaces — Approval Required';
    final body = item.isQuestion
        ? item.questionText
        : (item.reason.isNotEmpty ? item.reason : item.commandPreview);
    final payload = item.sessionId.isNotEmpty ? item.sessionId : item.approvalId;

    _onShowNotification?.call(title, body, payload);
  }

  void handleNotificationTap(String? payload) {
    _onNotificationTap?.call('/attention');
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
  }
}

final localNotificationServiceProvider = Provider<LocalNotificationService>((ref) {
  final service = LocalNotificationService();
  ref.onDispose(() => service.dispose());
  return service;
});
