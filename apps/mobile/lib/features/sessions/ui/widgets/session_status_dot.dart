import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class SessionStatusDot extends StatefulWidget {
  final String status;
  final double size;

  const SessionStatusDot({
    super.key,
    required this.status,
    this.size = 8.0,
  });

  @override
  State<SessionStatusDot> createState() => _SessionStatusDotState();
}

class _SessionStatusDotState extends State<SessionStatusDot>
    with SingleTickerProviderStateMixin {
  AnimationController? _pulseController;
  Animation<double>? _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimationIfNeeded();
  }

  @override
  void didUpdateWidget(covariant SessionStatusDot oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.status != widget.status) {
      _setupAnimationIfNeeded();
    }
  }

  void _setupAnimationIfNeeded() {
    final normalized = widget.status.toLowerCase().trim();
    final isStreaming = normalized == 'streaming';

    if (isStreaming) {
      if (_pulseController == null) {
        _pulseController = AnimationController(
          vsync: this,
          duration: const Duration(milliseconds: 700),
        );
        _opacityAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
          CurvedAnimation(
            parent: _pulseController!,
            curve: Curves.easeInOut,
          ),
        );
        _pulseController!.repeat(reverse: true);
      }
    } else {
      _pulseController?.dispose();
      _pulseController = null;
      _opacityAnimation = null;
    }
  }

  @override
  void dispose() {
    _pulseController?.dispose();
    super.dispose();
  }

  Color _getColor() {
    switch (widget.status.toLowerCase().trim()) {
      case 'active':
        return AppColors.primary;
      case 'streaming':
      case 'running':
        return AppColors.success;
      case 'task-running':
      case 'task_running':
      case 'waiting_approval':
      case 'waiting-approval':
        return AppColors.warning;
      case 'error':
        return AppColors.destructive;
      case 'sleeping':
      case 'idle':
      default:
        return AppColors.mutedForeground;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    final normalized = widget.status.toLowerCase().trim();
    final isStreaming = normalized == 'streaming';

    Widget dot = Container(
      key: Key('session_status_dot_${widget.status}'),
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: isStreaming
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.5),
                  blurRadius: 4,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
    );

    if (isStreaming && _opacityAnimation != null && _pulseController != null) {
      return AnimatedBuilder(
        animation: _opacityAnimation!,
        builder: (context, child) {
          return Opacity(
            opacity: _opacityAnimation!.value,
            child: child,
          );
        },
        child: dot,
      );
    }

    return dot;
  }
}
