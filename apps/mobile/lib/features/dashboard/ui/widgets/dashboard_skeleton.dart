import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class DashboardSkeleton extends StatefulWidget {
  const DashboardSkeleton({super.key});

  @override
  State<DashboardSkeleton> createState() => _DashboardSkeletonState();
}

class _DashboardSkeletonState extends State<DashboardSkeleton>
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

  Widget _buildShimmerBox({
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

  Widget _buildSessionSkeletonCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildShimmerBox(width: 8, height: 8, radius: 4),
              const SizedBox(width: AppSpacing.sm),
              _buildShimmerBox(width: 60, height: 16, radius: AppSpacing.radiusSm),
              const Spacer(),
              _buildShimmerBox(width: 50, height: 12),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _buildShimmerBox(width: 180, height: 18),
          const SizedBox(height: AppSpacing.sm),
          _buildShimmerBox(width: 100, height: 12),
        ],
      ),
    );
  }

  Widget _buildProjectSkeletonCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Row(
        children: [
          _buildShimmerBox(width: 40, height: 40, radius: AppSpacing.radiusMd),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildShimmerBox(width: 140, height: 16),
                const SizedBox(height: AppSpacing.xs),
                _buildShimmerBox(width: 200, height: 12),
                const SizedBox(height: AppSpacing.sm),
                _buildShimmerBox(width: 70, height: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      children: [
        // Active sessions skeleton section
        Row(
          children: [
            _buildShimmerBox(width: 130, height: 20),
            const SizedBox(width: AppSpacing.sm),
            _buildShimmerBox(width: 24, height: 16, radius: AppSpacing.radiusSm),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        _buildSessionSkeletonCard(),
        const SizedBox(height: AppSpacing.sm),
        _buildSessionSkeletonCard(),
        const SizedBox(height: AppSpacing.xl),

        // Recent projects skeleton section
        Row(
          children: [
            _buildShimmerBox(width: 140, height: 20),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        _buildProjectSkeletonCard(),
        const SizedBox(height: AppSpacing.sm),
        _buildProjectSkeletonCard(),
      ],
    );
  }
}
