import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../chat_state.dart';
import 'compact_button.dart';
import 'context_ring.dart';
import 'input_mode_toggle.dart';

class ChatInputHeaderRow extends StatelessWidget {
  final InputMode inputMode;
  final ValueChanged<InputMode>? onInputModeChanged;
  final List<String> sentHistory;
  final ValueChanged<int>? onNavigateHistory;
  final int contextUsed;
  final int contextLimit;
  final bool isCompacting;
  final VoidCallback? onCompact;

  const ChatInputHeaderRow({
    super.key,
    required this.inputMode,
    this.onInputModeChanged,
    this.sentHistory = const [],
    this.onNavigateHistory,
    this.contextUsed = 0,
    this.contextLimit = 0,
    this.isCompacting = false,
    this.onCompact,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final usedRatio = contextLimit > 0 ? (contextUsed / contextLimit) : 0.0;
    final showCompact = usedRatio > 0.85 && onCompact != null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.xs,
        AppSpacing.md,
        0,
      ),
      child: Row(
        children: [
          if (onInputModeChanged != null)
            InputModeToggle(
              currentMode: inputMode,
              onModeChanged: onInputModeChanged!,
            ),
          if (sentHistory.isNotEmpty && onNavigateHistory != null) ...[
            const SizedBox(width: AppSpacing.sm),
            Tooltip(
              message: 'Previous message (history)',
              child: InkWell(
                key: const Key('history_up_button'),
                onTap: () => onNavigateHistory!(1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.all(3.0),
                  child: Icon(
                    Icons.arrow_upward,
                    size: 14,
                    color: isDark
                        ? AppColors.mutedForeground
                        : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 2),
            Tooltip(
              message: 'Next message (history)',
              child: InkWell(
                key: const Key('history_down_button'),
                onTap: () => onNavigateHistory!(-1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.all(3.0),
                  child: Icon(
                    Icons.arrow_downward,
                    size: 14,
                    color: isDark
                        ? AppColors.mutedForeground
                        : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ),
          ],
          const Spacer(),
          if (showCompact) ...[
            CompactButton(
              onCompact: onCompact!,
              isLoading: isCompacting,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          if (contextLimit > 0 || contextUsed > 0)
            ContextRing(
              used: contextUsed,
              limit: contextLimit > 0 ? contextLimit : 1,
            ),
        ],
      ),
    );
  }
}
