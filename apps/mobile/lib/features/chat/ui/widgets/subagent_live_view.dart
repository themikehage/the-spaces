import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/subagent_session.dart';

class SubagentLiveView extends StatefulWidget {
  final SubagentSession? session;
  final List<SubagentEvent> events;
  final String? subagentName;
  final SubagentStatus status;
  final String? result;
  final bool? initiallyExpanded;

  const SubagentLiveView({
    super.key,
    this.session,
    this.events = const [],
    this.subagentName,
    this.status = SubagentStatus.running,
    this.result,
    this.initiallyExpanded,
  });

  @override
  State<SubagentLiveView> createState() => _SubagentLiveViewState();
}

class _SubagentLiveViewState extends State<SubagentLiveView>
    with SingleTickerProviderStateMixin {
  late bool _expanded;
  final ScrollController _scrollController = ScrollController();
  late AnimationController _pulseController;

  SubagentStatus get _effectiveStatus =>
      widget.session?.status ?? widget.status;

  List<SubagentEvent> get _effectiveEvents =>
      widget.session?.events ?? widget.events;

  String get _effectiveName =>
      widget.session?.name ?? widget.subagentName ?? 'Subagent Task';

  String? get _effectiveResult => widget.session?.result ?? widget.result;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded ?? (_effectiveStatus == SubagentStatus.running);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant SubagentLiveView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_effectiveStatus == SubagentStatus.running && _expanded) {
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final events = _effectiveEvents;
    final status = _effectiveStatus;

    final Color statusColor;
    final String statusLabel;

    switch (status) {
      case SubagentStatus.running:
        statusColor = AppColors.warning;
        statusLabel = 'LIVE';
        break;
      case SubagentStatus.done:
        statusColor = AppColors.success;
        statusLabel = 'Done';
        break;
      case SubagentStatus.error:
        statusColor = AppColors.error;
        statusLabel = 'Error';
        break;
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header / Toggle
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
                    Icons.hub_outlined,
                    size: 16,
                    color: status == SubagentStatus.running
                        ? AppColors.primary
                        : (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      _effectiveName,
                      style: AppTypography.labelMedium.copyWith(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
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
                        if (status == SubagentStatus.running) ...[
                          FadeTransition(
                            opacity: _pulseController,
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: statusColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                        ],
                        Text(
                          statusLabel,
                          style: AppTypography.labelSmall.copyWith(
                            fontSize: 10,
                            color: statusColor,
                            fontWeight: FontWeight.bold,
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

          if (_expanded) ...[
            const Divider(height: 1),
            // Log Event List
            Container(
              constraints: const BoxConstraints(maxHeight: 200),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              color: isDark ? AppColors.darkBackground : AppColors.lightSurface,
              child: events.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      child: Text(
                        'Waiting for subagent execution events...',
                        style: AppTypography.bodySmall.copyWith(
                          fontStyle: FontStyle.italic,
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      shrinkWrap: true,
                      itemCount: events.length,
                      itemBuilder: (context, index) {
                        final evt = events[index];
                        return _buildEventRow(context, evt, isDark);
                      },
                    ),
            ),

            if (_effectiveResult != null && _effectiveResult!.isNotEmpty) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Result:',
                      style: AppTypography.labelSmall.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      _effectiveResult!,
                      style: AppTypography.bodySmall.copyWith(
                        fontFamily: 'monospace',
                        color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildEventRow(BuildContext context, SubagentEvent evt, bool isDark) {
    Color textColor = isDark ? AppColors.darkForeground : AppColors.lightForeground;
    FontStyle fontStyle = FontStyle.normal;
    FontWeight fontWeight = FontWeight.normal;
    String prefix = '';

    final timeStr = DateFormat('HH:mm:ss').format(evt.timestamp);

    switch (evt.type) {
      case 'tool_start':
      case 'tool_call_start':
        textColor = AppColors.primary;
        fontWeight = FontWeight.w600;
        break;
      case 'tool_end':
      case 'tool_call_end':
        textColor = AppColors.success;
        break;
      case 'error':
        textColor = AppColors.error;
        fontWeight = FontWeight.w600;
        break;
      case 'thinking':
        textColor = AppColors.warning;
        fontStyle = FontStyle.italic;
        prefix = '💭 [thinking] ';
        break;
      case 'agent_start':
      case 'agent_end':
      case 'info':
        textColor = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
        break;
    }

    return Padding(
      key: ValueKey(evt.id),
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            timeStr,
            style: AppTypography.labelSmall.copyWith(
              fontSize: 9,
              fontFamily: 'monospace',
              color: (isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight).withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: SelectableText(
              '$prefix${evt.content}',
              style: AppTypography.bodySmall.copyWith(
                fontSize: 11,
                fontFamily: 'monospace',
                color: textColor,
                fontStyle: fontStyle,
                fontWeight: fontWeight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
