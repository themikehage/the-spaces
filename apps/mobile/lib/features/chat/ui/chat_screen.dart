import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/skeletons/skeleton_list.dart';
import '../../agents/data/agents_repository.dart';
import '../../agents/data/models/agent.dart';
import '../../auth/ui/auth_notifier.dart';
import '../../projects/data/models/project.dart';
import '../../projects/data/projects_repository.dart';
import '../controllers/autocomplete_controller.dart';
import 'chat_notifier.dart';
import 'widgets/chat_input_bar.dart';
import 'widgets/message_bubble.dart';
import 'widgets/model_selector_sheet.dart';
import 'widgets/skills_selector_sheet.dart';
import 'widgets/streaming_bubble.dart';
import 'widgets/tools_selector_sheet.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? initialTitle;
  final bool showAppBar;
  final String? entityType;
  final String? entityId;

  const ChatScreen({
    super.key,
    required this.sessionId,
    this.initialTitle,
    this.showAppBar = true,
    this.entityType,
    this.entityId,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _inputController = TextEditingController();
  final AutocompleteController _autocompleteController = AutocompleteController();
  bool _autoScrollEnabled = true;
  List<String> _activeTools = [];

  static const List<String> _defaultAvailableTools = [
    'read_file',
    'write_to_file',
    'edit_file',
    'list_dir',
    'grep_search',
    'find_by_name',
    'run_command',
    'web_search',
  ];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadAutocompleteData();
  }

  Future<void> _loadAutocompleteData() async {
    try {
      final agentsRepo = ref.read(agentsRepositoryProvider);
      final projectsRepo = ref.read(projectsRepositoryProvider);

      final skillsFuture = agentsRepo.getAvailableSkills(
        entityType: widget.entityType,
        entityId: widget.entityId,
      );
      final agentsFuture = agentsRepo.getAgents();
      final projectsFuture = projectsRepo.getProjects();

      final results = await Future.wait<dynamic>([
        skillsFuture.catchError((_) => <Map<String, dynamic>>[]),
        agentsFuture.catchError((_) => <Agent>[]),
        projectsFuture.catchError((_) => <Project>[]),
      ]);

      final skills = results[0] as List<Map<String, dynamic>>;
      final agents = (results[1] as List).map((a) => {'id': a.id, 'name': a.name, 'description': a.description}).toList();
      final projects = (results[2] as List).map((p) => {'id': p.id, 'name': p.name, 'description': p.description}).toList();

      if (mounted) {
        _autocompleteController.updateDataSources(
          tools: _defaultAvailableTools,
          skills: skills,
          agents: agents,
          projects: projects,
        );
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _inputController.dispose();
    _autocompleteController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    // If within 50px of bottom, re-enable auto scroll
    if (maxScroll - currentScroll <= 50) {
      if (!_autoScrollEnabled) {
        _autoScrollEnabled = true;
      }
    } else {
      if (_autoScrollEnabled) {
        _autoScrollEnabled = false;
      }
    }
  }

  void _scrollToBottom([bool immediate = false]) {
    if (!_scrollController.hasClients || !_autoScrollEnabled) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      if (immediate) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      } else {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _openModelSelector() {
    final notifier = ref.read(chatNotifierProvider(widget.sessionId).notifier);
    final state = ref.read(chatNotifierProvider(widget.sessionId));

    ModelSelectorSheet.show(
      context,
      models: state.availableModels,
      currentModelId: state.currentModel?.id,
      onSelectModel: (model) {
        notifier.changeModel(model);
      },
    );
  }

  void _openSkillsSelector() {
    SkillsSelectorSheet.show(
      context,
      entityType: widget.entityType,
      entityId: widget.entityId,
      onSelectSkillCommand: (cmd) {
        final currentText = _inputController.text;
        final newText = currentText.isEmpty
            ? cmd
            : '$currentText $cmd';
        _inputController.text = newText;
        _inputController.selection = TextSelection.fromPosition(
          TextPosition(offset: newText.length),
        );
      },
    );
  }

  void _openToolsSelector() {
    ToolsSelectorSheet.show(
      context,
      availableTools: _defaultAvailableTools,
      activeTools: _activeTools,
      onToolsChanged: (tools) {
        setState(() {
          _activeTools = tools;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatNotifierProvider(widget.sessionId));
    final notifier = ref.read(chatNotifierProvider(widget.sessionId).notifier);
    final authToken = ref.watch(authTokenProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Reactively trigger auto-scroll during streaming or on new messages
    ref.listen(chatNotifierProvider(widget.sessionId), (previous, next) {
      if (previous?.messages.length != next.messages.length ||
          previous?.streamingContent != next.streamingContent ||
          previous?.isStreaming != next.isStreaming) {
        _scrollToBottom();
      }
    });

    final currentModelName = state.currentModel?.name.isNotEmpty == true
        ? state.currentModel!.name
        : (state.currentModel?.id ?? 'Default');

    final title = widget.initialTitle ??
        'Session ${widget.sessionId.substring(0, widget.sessionId.length > 8 ? 8 : widget.sessionId.length)}';

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: state.isStreaming ? AppColors.warning : AppColors.success,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        state.isStreaming ? 'Streaming...' : currentModelName,
                        style: AppTypography.labelSmall.copyWith(
                          color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.psychology_outlined),
                  tooltip: 'Change Model',
                  onPressed: _openModelSelector,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Reload History',
                  onPressed: () => notifier.loadHistory(),
                ),
              ],
            )
          : null,
      body: Column(
        children: [
          if (state.error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              color: AppColors.error.withValues(alpha: 0.15),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, size: 18, color: AppColors.error),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: state.isLoading && state.messages.isEmpty
                ? const SkeletonList(itemCount: 6)
                : state.messages.isEmpty && !state.isStreaming
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: 48,
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              'How can I help you today?',
                              style: AppTypography.headlineSmall.copyWith(
                                color: isDark
                                    ? AppColors.darkForeground
                                    : AppColors.lightForeground,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Ask anything or give a task to your agent.',
                              style: AppTypography.bodyMedium.copyWith(
                                color: isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                        itemCount: state.messages.length + (state.isStreaming ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index < state.messages.length) {
                            final msg = state.messages[index];
                            return MessageBubble(
                              key: Key('msg_${msg.id}_$index'),
                              message: msg,
                              authToken: authToken,
                              onResolveApproval: (approved) => notifier.resolveApproval(
                                toolCallId: msg.approvalRequest?.toolCallId ?? msg.id,
                                approved: approved,
                              ),
                              onAnswerQuestion: (selected, custom) => notifier.answerQuestion(
                                questionId: msg.questionRequest?.questionId ?? msg.id,
                                selectedOptions: selected,
                                customAnswer: custom,
                              ),
                              onNavigateBranch: (targetId) => notifier.navigateBranch(targetId),
                            );
                          }
                          return StreamingBubble(
                            key: const Key('streaming_bubble_widget'),
                            content: state.streamingContent,
                            toolCalls: state.activeToolCalls,
                            authToken: authToken,
                          );
                        },
                      ),
          ),
          ChatInputBar(
            isStreaming: state.isStreaming,
            attachments: state.selectedAttachments,
            pendingAttachments: state.pendingAttachments,
            currentModelName: state.currentModel?.name,
            contextUsed: state.contextUsed,
            contextLimit: state.contextLimit,
            isCompacting: state.isCompacting,
            onCompact: () => notifier.compact(),
            sentHistory: state.sentHistory,
            onNavigateHistory: (delta) => notifier.navigateHistory(delta),
            onSend: (text) => notifier.sendMessage(
              text,
              tools: _activeTools.isNotEmpty ? _activeTools : null,
            ),
            onStop: () => notifier.stopStreaming(),
            onPickAttachment: () => notifier.pickAttachment(),
            onRemoveAttachment: (i) => notifier.removeAttachment(i),
            onOpenModelSelector: _openModelSelector,
            onOpenSkillsSelector: _openSkillsSelector,
            onOpenToolsSelector: _openToolsSelector,
            controller: _inputController,
            autocompleteController: _autocompleteController,
          ),
        ],
      ),
    );
  }
}
