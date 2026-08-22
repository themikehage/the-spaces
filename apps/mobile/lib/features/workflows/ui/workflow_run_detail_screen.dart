import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../data/models/workflow.dart';
import '../data/models/workflow_run.dart';
import '../data/workflows_repository.dart';
import 'workflows_notifier.dart';

class WorkflowRunDetailScreen extends ConsumerStatefulWidget {
  final String workflowId;
  final String runId;

  const WorkflowRunDetailScreen({
    super.key,
    required this.workflowId,
    required this.runId,
  });

  @override
  ConsumerState<WorkflowRunDetailScreen> createState() =>
      _WorkflowRunDetailScreenState();
}

class _WorkflowRunDetailScreenState
    extends ConsumerState<WorkflowRunDetailScreen> {
  Workflow? _workflow;
  WorkflowRun? _run;
  bool _isLoading = true;
  bool _isAborting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRunData();
  }

  Future<void> _loadRunData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repo = ref.read(workflowsRepositoryProvider);
      final run = await repo.getWorkflowRun(widget.runId);
      Workflow? wf;
      if (widget.workflowId.isNotEmpty) {
        wf = await repo.getWorkflow(widget.workflowId);
      } else if (run.workflowId.isNotEmpty) {
        wf = await repo.getWorkflow(run.workflowId);
      }

      if (mounted) {
        setState(() {
          _run = run;
          _workflow = wf;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _confirmAbort() {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.darkCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
        title: Text(
          'Abort Workflow Run',
          style: AppTypography.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.destructive,
          ),
        ),
        content: const Text(
          'Are you sure you want to stop this workflow execution? Running steps will be terminated.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('abort_workflow_confirm_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              setState(() => _isAborting = true);

              final success = await ref
                  .read(workflowsNotifierProvider.notifier)
                  .abortRun(widget.runId);

              if (mounted) {
                setState(() => _isAborting = false);
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Workflow run aborted'),
                      backgroundColor: AppColors.warning,
                    ),
                  );
                  _loadRunData();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Failed to abort workflow run'),
                      backgroundColor: AppColors.destructive,
                    ),
                  );
                }
              }
            },
            child: const Text('Abort'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return AppColors.success;
      case 'running':
      case 'active':
        return AppColors.primary;
      case 'error':
      case 'failed':
        return AppColors.destructive;
      case 'cancelled':
      case 'aborted':
        return AppColors.warning;
      case 'waiting_approval':
        return AppColors.warning;
      default:
        return AppColors.mutedForeground;
    }
  }

  Widget _buildStepStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return const Icon(Icons.check_circle, color: AppColors.success, size: 20);
      case 'running':
      case 'active':
        return const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary,
          ),
        );
      case 'error':
      case 'failed':
        return const Icon(Icons.cancel, color: AppColors.destructive, size: 20);
      case 'waiting_approval':
        return const Icon(Icons.hourglass_top, color: AppColors.warning, size: 20);
      case 'skipped':
        return const Icon(Icons.skip_next, color: AppColors.mutedForeground, size: 20);
      default:
        return const Icon(Icons.radio_button_unchecked,
            color: AppColors.mutedForeground, size: 20);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Listen to active run updates from notifier
    final state = ref.watch(workflowsNotifierProvider);
    final activeRun = state.activeRun?.id == widget.runId ? state.activeRun : _run;

    if (_isLoading && activeRun == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Run Details'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null && activeRun == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Run Details'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _error!,
                style: AppTypography.bodyMedium
                    .copyWith(color: AppColors.destructive),
              ),
              const SizedBox(height: AppSpacing.sm),
              ElevatedButton(
                onPressed: _loadRunData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final run = activeRun!;
    final statusColor = _getStatusColor(run.status);
    final isRunning = run.isRunning;

    // Steps list combined with workflow definitions
    final workflowSteps = _workflow?.steps ?? [];
    final stepIds = {
      ...workflowSteps.map((s) => s.id),
      ...run.stepStates.keys,
    }.toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(run.workflowName.isNotEmpty
            ? run.workflowName
            : 'Run ${run.id}'),
        actions: [
          if (isRunning)
            TextButton.icon(
              key: const Key('abort_workflow_button'),
              icon: _isAborting
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.destructive,
                      ),
                    )
                  : const Icon(
                      Icons.stop_circle_outlined,
                      color: AppColors.destructive,
                      size: 18,
                    ),
              label: const Text(
                'Abort',
                style: TextStyle(color: AppColors.destructive),
              ),
              onPressed: _isAborting ? null : _confirmAbort,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadRunData,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.darkCard,
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(
                  color: isRunning
                      ? AppColors.primary.withValues(alpha: 0.4)
                      : AppColors.darkBorder,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: _buildStepStatusIcon(run.status),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Run Status: ${run.status.toUpperCase()}',
                              style: AppTypography.titleSmall.copyWith(
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                              ),
                            ),
                            Text(
                              'Run ID: ${run.id}',
                              style: AppTypography.bodySmall.copyWith(
                                color: AppColors.mutedForeground,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (run.error != null && run.error!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: AppColors.destructive.withValues(alpha: 0.1),
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusMd),
                        border: Border.all(
                          color: AppColors.destructive.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline,
                              color: AppColors.destructive, size: 16),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              run.error!,
                              style: AppTypography.bodySmall.copyWith(
                                color: AppColors.destructive,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  Wrap(
                    spacing: AppSpacing.md,
                    runSpacing: AppSpacing.xs,
                    children: [
                      if (run.startedAt.isNotEmpty)
                        _RunMetricChip(
                          icon: Icons.access_time,
                          label: 'Started: ${run.startedAt}',
                        ),
                      if (run.completedAt != null &&
                          run.completedAt!.isNotEmpty)
                        _RunMetricChip(
                          icon: Icons.check_circle_outline,
                          label: 'Completed: ${run.completedAt!}',
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Execution Steps Timeline
            Text(
              'Execution Steps (${stepIds.length})',
              style: AppTypography.titleSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.darkForeground,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            if (stepIds.isEmpty)
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.darkCard,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Center(
                  child: Text(
                    'No steps found for this run',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ),
              )
            else
              ...stepIds.asMap().entries.map((entry) {
                final idx = entry.key;
                final sId = entry.value;
                final stepDef = workflowSteps.firstWhere(
                  (s) => s.id == sId,
                  orElse: () => WorkflowStep(id: sId, type: 'step', label: sId),
                );
                final stepState = run.stepStates[sId] ??
                    WorkflowStepState(stepId: sId, status: 'pending');

                return Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.darkCard,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    border: Border.all(
                      color: stepState.isRunning
                          ? AppColors.primary.withValues(alpha: 0.5)
                          : AppColors.darkBorder,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.darkSurfaceHover,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${idx + 1}',
                              style: AppTypography.bodySmall.copyWith(
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  stepDef.label,
                                  style: AppTypography.bodyMedium.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.darkForeground,
                                  ),
                                ),
                                Text(
                                  'Type: ${stepDef.type} · ID: $sId',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _buildStepStatusIcon(stepState.status),
                        ],
                      ),
                      if (stepState.error != null &&
                          stepState.error!.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.xs),
                          decoration: BoxDecoration(
                            color: AppColors.destructive.withValues(alpha: 0.1),
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusSm),
                          ),
                          child: Text(
                            stepState.error!,
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.destructive,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                      if (stepState.outputs != null &&
                          stepState.outputs!.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.darkBackground,
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Output:',
                                style: AppTypography.bodySmall.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.mutedForeground,
                                  fontSize: 10,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                jsonEncode(stepState.outputs),
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 11,
                                  color: AppColors.darkForeground,
                                ),
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _RunMetricChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _RunMetricChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.mutedForeground),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            color: AppColors.mutedForeground,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
