import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';
import '../../data/models/subagent_session.dart';
import 'subagent_live_view.dart';
import 'tools/tool_result_router.dart';

class ToolCallCard extends StatefulWidget {
  final ToolCall toolCall;
  final bool initialExpanded;
  final String? authToken;
  final String? sessionId;

  const ToolCallCard({
    super.key,
    required this.toolCall,
    this.initialExpanded = false,
    this.authToken,
    this.sessionId,
  });

  @override
  State<ToolCallCard> createState() => _ToolCallCardState();
}

class _ToolCallCardState extends State<ToolCallCard> {
  late bool _expanded;
  bool _showFullLiveOutput = false;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initialExpanded;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tc = widget.toolCall;

    final Color statusColor;
    final Widget statusIcon;
    final String statusLabel;

    if (tc.isRunning) {
      statusColor = AppColors.warning;
      statusIcon = const SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.warning),
          semanticsLabel: 'Tool executing',
        ),
      );
      statusLabel = 'Running';
    } else if (tc.isError) {
      statusColor = AppColors.error;
      statusIcon = const Icon(Icons.close, size: 14, color: AppColors.error);
      statusLabel = 'Error';
    } else {
      statusColor = AppColors.success;
      statusIcon = const Icon(Icons.check, size: 14, color: AppColors.success);
      statusLabel = 'Completed';
    }

    final hasLiveOutput = tc.isRunning &&
        tc.liveOutput != null &&
        tc.liveOutput!.trim().isNotEmpty;

    final hasSubagentData = (tc.subagentEvents != null && tc.subagentEvents!.isNotEmpty) ||
        tc.subagentSession != null;

    final isSubagentTool = tc.name == 'spawn_subagent' ||
        tc.name == 'delegate_task' ||
        tc.name == 'manage_delegations';

    return Container(
      key: ValueKey('tool_call_${tc.id}'),
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: tc.isError
              ? AppColors.error.withValues(alpha: 0.5)
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _expanded = !_expanded;
              });
            },
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Icon(
                    isSubagentTool ? Icons.hub_outlined : Icons.build_outlined,
                    size: 16,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      tc.name.isNotEmpty ? tc.name : 'Tool execution',
                      style: AppTypography.titleSmall.copyWith(
                        fontFamily: 'monospace',
                        color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        statusIcon,
                        const SizedBox(width: 4),
                        Text(
                          statusLabel,
                          style: AppTypography.labelSmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    size: 18,
                    color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                  ),
                ],
              ),
            ),
          ),

          // Live Subagent View when running or has subagent data
          if (hasSubagentData && (tc.isRunning || _expanded)) ...[
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              child: SubagentLiveView(
                session: tc.subagentSession,
                events: tc.subagentEvents ?? const [],
                subagentName: tc.name,
                status: tc.isRunning
                    ? SubagentStatus.running
                    : (tc.isError ? SubagentStatus.error : SubagentStatus.done),
                initiallyExpanded: tc.isRunning,
              ),
            ),
          ],

          // Live Output Preview (streaming partial results)
          if (hasLiveOutput && !hasSubagentData) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: _buildLiveOutputSection(context, tc.liveOutput!, isDark),
            ),
          ],

          // Completed / Detailed View when expanded
          if (_expanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: ToolResultRouter(
                toolCall: tc,
                authToken: widget.authToken,
                sessionId: widget.sessionId,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLiveOutputSection(
    BuildContext context,
    String liveOutput,
    bool isDark,
  ) {
    final lines = liveOutput.split('\n');
    final exceedsLimit = lines.length > 20;
    final displayedText = exceedsLimit && !_showFullLiveOutput
        ? '${lines.take(20).join('\n')}\n...'
        : liveOutput;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.lightInput,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                'LIVE OUTPUT',
                style: AppTypography.labelSmall.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: AppColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          SelectableText(
            displayedText,
            style: AppTypography.bodySmall.copyWith(
              fontFamily: 'monospace',
              fontSize: 11,
              color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
            ),
          ),
          if (exceedsLimit) ...[
            const SizedBox(height: 4),
            InkWell(
              onTap: () {
                setState(() {
                  _showFullLiveOutput = !_showFullLiveOutput;
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  _showFullLiveOutput ? 'Ver menos' : 'Ver más (${lines.length} líneas)',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
