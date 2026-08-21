import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class SessionsSkeleton extends StatefulWidget {
  const SessionsSkeleton({super.key});

  @override
  State<SessionsSkeleton> createState() => _SessionsSkeletonState();
}

class _SessionsSkeletonState extends State<SessionsSkeleton>
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

  Widget _buildItemSkeleton() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildShimmerBox(width: 8, height: 8, radius: 4),
              const SizedBox(width: AppSpacing.sm),
              _buildShimmerBox(width: 50, height: 14, radius: AppSpacing.radiusSm),
              const Spacer(),
              _buildShimmerBox(width: 60, height: 12),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _buildShimmerBox(width: 220, height: 16),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _buildShimmerBox(width: 80, height: 12),
              const SizedBox(width: AppSpacing.md),
              _buildShimmerBox(width: 60, height: 12),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      key: const Key('sessions_skeleton_list'),
      padding: const EdgeInsets.all(AppSpacing.md),
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: 6,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, __) => _buildItemSkeleton(),
    );
  }
}
