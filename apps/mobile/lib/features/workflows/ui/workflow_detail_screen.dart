import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../data/models/workflow.dart';
import '../data/models/workflow_run.dart';
import '../data/workflows_repository.dart';
import 'workflows_notifier.dart';

class WorkflowDetailScreen extends ConsumerStatefulWidget {
  final String workflowId;

  const WorkflowDetailScreen({super.key, required this.workflowId});

  @override
  ConsumerState<WorkflowDetailScreen> createState() =>
      _WorkflowDetailScreenState();
}

class _WorkflowDetailScreenState extends ConsumerState<WorkflowDetailScreen> {
  Workflow? _workflow;
  List<WorkflowRun> _runs = [];
  bool _isLoading = true;
  bool _isRunning = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repo = ref.read(workflowsRepositoryProvider);
      final wf = await repo.getWorkflow(widget.workflowId);
      final runs = await repo.getWorkflowRuns(widget.workflowId);

      if (mounted) {
        setState(() {
          _workflow = wf;
          _runs = runs;
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

  IconData _getStepIcon(String type) {
    switch (type.toLowerCase()) {
      case 'agent':
        return Icons.smart_toy_outlined;
      case 'if':
      case 'switch':
        return Icons.alt_route;
      case 'merge':
        return Icons.call_merge;
      case 'code':
        return Icons.code;
      case 'http':
        return Icons.http;
      case 'variables':
        return Icons.data_object;
      case 'webhook':
        return Icons.webhook;
      case 'delay':
        return Icons.hourglass_bottom;
      case 'approval':
        return Icons.verified_user_outlined;
      default:
        return Icons.settings_suggest_outlined;
    }
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

  Future<void> _triggerRun() async {
    setState(() => _isRunning = true);

    final run = await ref
        .read(workflowsNotifierProvider.notifier)
        .runWorkflow(widget.workflowId);

    if (mounted) {
      setState(() => _isRunning = false);

      if (run != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Workflow "${_workflow?.name ?? widget.workflowId}" started!'),
            backgroundColor: AppColors.primary,
          ),
        );
        context.push('/workflows/${widget.workflowId}/runs/${run.id}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to start workflow run'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(_workflow?.name ?? 'Workflow Details'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _workflow == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Workflow Details'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _error ?? 'Workflow not found',
                style: AppTypography.bodyMedium
                    .copyWith(color: AppColors.destructive),
              ),
              const SizedBox(height: AppSpacing.sm),
              ElevatedButton(
                onPressed: _loadData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final wf = _workflow!;

    return Scaffold(
      appBar: AppBar(
        title: Text(wf.name),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            // Overview Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
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
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius:
                              BorderRadius.circular(AppSpacing.radiusMd),
                        ),
                        child: const Icon(
                          Icons.account_tree_outlined,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              wf.name,
                              style: AppTypography.titleMedium.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkForeground,
                              ),
                            ),
                            Text(
                              'ID: ${wf.id}',
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
                  if (wf.description != null && wf.description!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      wf.description!,
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  Wrap(
                    spacing: AppSpacing.md,
                    runSpacing: AppSpacing.xs,
                    children: [
                      _DetailMetricChip(
                        icon: Icons.linear_scale,
                        label: '${wf.steps.length} Steps',
                      ),
                      _DetailMetricChip(
                        icon: Icons.shield_outlined,
                        label: 'On Error: ${wf.onError}',
                      ),
                      if (wf.tag != null)
                        _DetailMetricChip(
                          icon: Icons.tag,
                          label: wf.tag!,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Read-Only Web Client Notice Banner
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Visual workflow node editor is available on the web client. Mobile allows triggering runs and monitoring live step progress.',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.darkForeground,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Steps Sequence List
            Text(
              'Workflow Steps (${wf.steps.length})',
              style: AppTypography.titleSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.darkForeground,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            if (wf.steps.isEmpty)
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.darkCard,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Center(
                  child: Text(
                    'No steps defined in this workflow',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ),
              )
            else
              ...wf.steps.asMap().entries.map((entry) {
                final idx = entry.key;
                final step = entry.value;

                return Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.darkCard,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    border: Border.all(color: AppColors.darkBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.darkSurfaceHover,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.darkBorder),
                        ),
                        child: Text(
                          '${idx + 1}',
                          style: AppTypography.bodySmall.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Icon(
                        _getStepIcon(step.type),
                        color: AppColors.primary,
                        size: 20,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              step.label,
                              style: AppTypography.bodyMedium.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkForeground,
                              ),
                            ),
                            Text(
                              'Type: ${step.type}${step.agentId != null ? ' · Agent: ${step.agentId}' : ''}',
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
                );
              }),

            const SizedBox(height: AppSpacing.lg),

            // Recent Runs Section
            Text(
              'Recent Runs (${_runs.length})',
              style: AppTypography.titleSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.darkForeground,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            if (_runs.isEmpty)
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.darkCard,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Center(
                  child: Text(
                    'No recorded runs yet for this workflow',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                ),
              )
            else
              ..._runs.map((run) {
                final statusColor = _getStatusColor(run.status);

                return InkWell(
                  key: Key('workflow_run_item_${run.id}'),
                  onTap: () {
                    context.push('/workflows/${widget.workflowId}/runs/${run.id}');
                  },
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.darkCard,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: statusColor,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Run ${run.id}',
                                style: AppTypography.bodyMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.darkForeground,
                                ),
                              ),
                              if (run.startedAt.isNotEmpty)
                                Text(
                                  'Started: ${run.startedAt}',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.mutedForeground,
                                    fontSize: 11,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.15),
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusFull),
                          ),
                          child: Text(
                            run.status.toUpperCase(),
                            style: AppTypography.bodySmall.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        const Icon(
                          Icons.chevron_right,
                          size: 18,
                          color: AppColors.mutedForeground,
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 80), // bottom padding for FAB
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'workflow_run_fab',
        key: const Key('workflow_run_button'),
        onPressed: _isRunning ? null : _triggerRun,
        backgroundColor: AppColors.primary,
        icon: _isRunning
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.play_arrow, color: Colors.white),
        label: Text(
          _isRunning ? 'Starting...' : 'Run Workflow',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

class _DetailMetricChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailMetricChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.mutedForeground),
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
