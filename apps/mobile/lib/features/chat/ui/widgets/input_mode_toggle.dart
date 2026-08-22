import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../chat_state.dart';

class InputModeToggle extends StatelessWidget {
  final InputMode currentMode;
  final ValueChanged<InputMode> onModeChanged;

  const InputModeToggle({
    super.key,
    required this.currentMode,
    required this.onModeChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSteer = currentMode == InputMode.steer;

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildOption(
            context: context,
            keyName: 'input_mode_steer',
            label: 'Steer',
            icon: Icons.navigation_outlined,
            isSelected: isSteer,
            selectedBg: AppColors.primary,
            selectedFg: AppColors.primaryForeground,
            onTap: () => onModeChanged(InputMode.steer),
          ),
          _buildOption(
            context: context,
            keyName: 'input_mode_followup',
            label: 'Follow-up',
            icon: Icons.reply_outlined,
            isSelected: !isSteer,
            selectedBg: AppColors.warning,
            selectedFg: AppColors.black,
            onTap: () => onModeChanged(InputMode.followup),
          ),
        ],
      ),
    );
  }

  Widget _buildOption({
    required BuildContext context,
    required String keyName,
    required String label,
    required IconData icon,
    required bool isSelected,
    required Color selectedBg,
    required Color selectedFg,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      key: Key(keyName),
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: 3,
        ),
        decoration: BoxDecoration(
          color: isSelected ? selectedBg : Colors.transparent,
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 12,
              color: isSelected
                  ? selectedFg
                  : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: AppTypography.labelSmall.copyWith(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? selectedFg
                    : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
