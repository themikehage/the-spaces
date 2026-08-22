import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Generic skeleton card with smooth pulse animation.
class SkeletonCard extends StatefulWidget {
  final double? height;
  final double? width;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  const SkeletonCard({
    super.key,
    this.height,
    this.width,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.borderRadius = AppSpacing.radiusMd,
  });

  @override
  State<SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<SkeletonCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _buildBox({
    required double width,
    required double height,
    double radius = AppSpacing.radiusSm,
  }) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: AppColors.darkSurface.withValues(alpha: _animation.value),
            borderRadius: BorderRadius.circular(radius),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      padding: widget.padding,
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _buildBox(width: 36, height: 36, radius: AppSpacing.radiusSm),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildBox(width: 140, height: 14),
                    const SizedBox(height: AppSpacing.xs),
                    _buildBox(width: 80, height: 10),
                  ],
                ),
              ),
              _buildBox(width: 50, height: 20, radius: AppSpacing.radiusFull),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _buildBox(width: double.infinity, height: 12),
          const SizedBox(height: AppSpacing.xs),
          _buildBox(width: 200, height: 12),
        ],
      ),
    );
  }
}
