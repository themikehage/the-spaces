import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/attention_item.dart';

class QuestionCard extends StatefulWidget {
  final AttentionItem item;
  final Future<void> Function({
    List<String>? selectedOptions,
    String? customAnswer,
  }) onRespond;
  final VoidCallback? onOpenSession;

  const QuestionCard({
    super.key,
    required this.item,
    required this.onRespond,
    this.onOpenSession,
  });

  @override
  State<QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<QuestionCard> {
  final TextEditingController _customController = TextEditingController();
  final Set<String> _selectedOptions = {};
  bool _isSubmitting = false;

  @override
  void dispose() {
    _customController.dispose();
    super.dispose();
  }

  void _toggleOption(String option) {
    setState(() {
      if (widget.item.isMultiSelect) {
        if (_selectedOptions.contains(option)) {
          _selectedOptions.remove(option);
        } else {
          _selectedOptions.add(option);
        }
      } else {
        _selectedOptions.clear();
        _selectedOptions.add(option);
      }
    });
  }

  Future<void> _submit({bool skip = false}) async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    try {
      if (skip) {
        await widget.onRespond();
      } else {
        await widget.onRespond(
          selectedOptions: _selectedOptions.isNotEmpty ? _selectedOptions.toList() : null,
          customAnswer: _customController.text.trim().isNotEmpty
              ? _customController.text.trim()
              : null,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final options = item.optionsList;

    return Card(
      key: Key('question_card_${item.approvalId}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.darkBorder, width: 1),
      ),
      color: AppColors.darkSurface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.lightBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.help_outline_rounded,
                        size: 14,
                        color: Colors.lightBlueAccent,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Question',
                        style: AppTypography.bodySmall.copyWith(
                          color: Colors.lightBlueAccent,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.onOpenSession != null)
                  InkWell(
                    key: Key('open_session_${item.approvalId}'),
                    onTap: widget.onOpenSession,
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            item.sessionId.length > 8
                                ? '${item.sessionId.substring(0, 8)}...'
                                : item.sessionId,
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.mutedForeground,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.open_in_new_rounded,
                            size: 12,
                            color: AppColors.mutedForeground,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              item.questionText,
              style: AppTypography.bodyLarge.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.darkForeground,
              ),
            ),
            if (options.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: options.map((option) {
                  final isSelected = _selectedOptions.contains(option);
                  return ChoiceChip(
                    key: Key('question_chip_${item.approvalId}_$option'),
                    label: Text(option),
                    selected: isSelected,
                    onSelected: (_) => _toggleOption(option),
                    selectedColor: AppColors.primary.withValues(alpha: 0.25),
                    backgroundColor: AppColors.darkBackground,
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.primary : AppColors.darkForeground,
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.darkBorder,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  );
                }).toList(),
              ),
            ],
            if (item.allowCustom) ...[
              const SizedBox(height: 12),
              TextField(
                key: Key('question_custom_input_${item.approvalId}'),
                controller: _customController,
                style: const TextStyle(fontSize: 13, color: AppColors.darkForeground),
                decoration: InputDecoration(
                  hintText: item.placeholder ?? 'Type your answer...',
                  hintStyle: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.darkBackground,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.darkBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.darkBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  key: Key('question_skip_btn_${item.approvalId}'),
                  onPressed: _isSubmitting ? null : () => _submit(skip: true),
                  child: Text(
                    'Skip',
                    style: TextStyle(
                      color: AppColors.mutedForeground,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  key: Key('question_send_btn_${item.approvalId}'),
                  onPressed: _isSubmitting ? null : () => _submit(skip: false),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.darkBackground,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.darkBackground,
                          ),
                        )
                      : const Text(
                          'Send',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
