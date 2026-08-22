import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Top banner that displays when device is offline, automatically hiding upon reconnection.
class OfflineBanner extends StatefulWidget {
  final Widget child;
  final Stream<List<ConnectivityResult>>? connectivityStream;
  final Connectivity? connectivity;

  const OfflineBanner({
    super.key,
    required this.child,
    this.connectivityStream,
    this.connectivity,
  });

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  late StreamSubscription<List<ConnectivityResult>> _subscription;
  bool _isOffline = false;

  @override
  void initState() {
    super.initState();
    _checkInitialConnectivity();
    _subscribeToConnectivity();
  }

  Future<void> _checkInitialConnectivity() async {
    try {
      final connectivity = widget.connectivity ?? Connectivity();
      final results = await connectivity.checkConnectivity();
      _updateStatus(results);
    } catch (_) {
      // If check fails, do not block the app
    }
  }

  void _subscribeToConnectivity() {
    final stream = widget.connectivityStream ??
        (widget.connectivity ?? Connectivity()).onConnectivityChanged;
    _subscription = stream.listen(_updateStatus);
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final isOffline = results.isEmpty ||
        results.every((r) => r == ConnectivityResult.none);
    if (mounted && isOffline != _isOffline) {
      setState(() {
        _isOffline = isOffline;
      });
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_isOffline)
          Container(
            key: const Key('offline_banner_container'),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.xs,
              horizontal: AppSpacing.md,
            ),
            color: AppColors.destructive,
            child: SafeArea(
              bottom: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.wifi_off_rounded,
                    size: 16,
                    color: AppColors.destructiveForeground,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'No internet connection. Operating offline.',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.destructiveForeground,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
