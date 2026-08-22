import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class ContextRing extends StatelessWidget {
  final int used;
  final int limit;
  final VoidCallback? onTap;
  final double size;

  const ContextRing({
    super.key,
    required this.used,
    required this.limit,
    this.onTap,
    this.size = 28.0,
  });

  double get ratio => limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;

  Color get ringColor {
    if (ratio > 0.85) return AppColors.destructive;
    if (ratio >= 0.60) return AppColors.warning;
    return AppColors.success;
  }

  void _handleTap(BuildContext context) {
    if (onTap != null) {
      onTap!();
      return;
    }

    final percentage = (ratio * 100).toStringAsFixed(1);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$used / $limit tokens ($percentage%)',
          style: AppTypography.bodySmall.copyWith(
            color: AppColors.white,
          ),
        ),
        duration: const Duration(seconds: 2),
        backgroundColor: AppColors.darkCard,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trackColor = isDark
        ? AppColors.darkBorder
        : AppColors.lightBorder;

    return Tooltip(
      message: 'Context: $used / $limit tokens (${(ratio * 100).toStringAsFixed(0)}%)',
      child: InkWell(
        key: const Key('context_ring_button'),
        onTap: () => _handleTap(context),
        borderRadius: BorderRadius.circular(size / 2),
        child: SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _ContextRingPainter(
              progress: ratio,
              progressColor: ringColor,
              trackColor: trackColor,
              strokeWidth: 3.0,
            ),
            child: Center(
              child: Text(
                '${(ratio * 100).toInt()}%',
                style: TextStyle(
                  fontSize: size * 0.28,
                  fontWeight: FontWeight.w700,
                  color: ringColor,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ContextRingPainter extends CustomPainter {
  final double progress;
  final Color progressColor;
  final Color trackColor;
  final double strokeWidth;

  const _ContextRingPainter({
    required this.progress,
    required this.progressColor,
    required this.trackColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawCircle(center, radius, trackPaint);

    if (progress > 0) {
      final progressPaint = Paint()
        ..color = progressColor
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = strokeWidth;

      final sweepAngle = progress * 2 * math.pi;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        sweepAngle,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ContextRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.progressColor != progressColor ||
        oldDelegate.trackColor != trackColor ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
