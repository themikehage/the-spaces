import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';

class AskQuestionForm extends StatefulWidget {
  final QuestionRequest request;
  final void Function(List<String> selectedOptions, String? customAnswer)? onAnswer;

  const AskQuestionForm({
    super.key,
    required this.request,
    this.onAnswer,
  });

  @override
  State<AskQuestionForm> createState() => _AskQuestionFormState();
}

class _AskQuestionFormState extends State<AskQuestionForm> {
  late Set<String> _selectedOptions;
  late TextEditingController _customTextController;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedOptions = Set<String>.from(widget.request.selectedOptions ?? []);
    _customTextController = TextEditingController(text: widget.request.customAnswer ?? '');
  }

  @override
  void dispose() {
    _customTextController.dispose();
    super.dispose();
  }

  void _toggleOption(String option) {
    if (widget.request.resolved || _isSubmitting) return;
    setState(() {
      if (widget.request.isMultiSelect) {
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

  void _submit() {
    if (_isSubmitting || widget.request.resolved) return;
    final custom = _customTextController.text.trim();
    if (_selectedOptions.isEmpty && custom.isEmpty) return;

    setState(() {
      _isSubmitting = true;
    });

    widget.onAnswer?.call(
      _selectedOptions.toList(),
      custom.isNotEmpty ? custom : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final req = widget.request;

    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final borderSideColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final primaryColor = AppColors.primary;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: borderSideColor),
      ),
      child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            child: Container(color: primaryColor),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.08),
                    border: Border(
                      bottom: BorderSide(
                        color: borderSideColor,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.help_outline, size: 18, color: AppColors.primary),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          'Agent Question',
                          style: AppTypography.titleSmall.copyWith(
                            color: isDark
                                ? AppColors.darkForeground
                                : AppColors.lightForeground,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (req.resolved)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(
                              color: AppColors.success.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.check, size: 12, color: AppColors.success),
                              const SizedBox(width: 4),
                              Text(
                                'Answered',
                                style: AppTypography.labelSmall.copyWith(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        req.question,
                        style: AppTypography.titleMedium.copyWith(
                          color: isDark
                              ? AppColors.darkForeground
                              : AppColors.lightForeground,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (req.options.isNotEmpty) ...[
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.xs,
                          children: req.options.map((option) {
                            final isSelected = req.resolved
                                ? (req.selectedOptions?.contains(option) == true)
                                : _selectedOptions.contains(option);

                            return FilterChip(
                              label: Text(option),
                              selected: isSelected,
                              onSelected: req.resolved || _isSubmitting
                                  ? null
                                  : (_) => _toggleOption(option),
                              checkmarkColor: AppColors.primaryForeground,
                              selectedColor: AppColors.primary,
                              labelStyle: AppTypography.bodySmall.copyWith(
                                color: isSelected
                                    ? AppColors.primaryForeground
                                    : (isDark
                                        ? AppColors.darkForeground
                                        : AppColors.lightForeground),
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.normal,
                              ),
                              backgroundColor: isDark
                                  ? AppColors.darkSurface
                                  : AppColors.lightSurface,
                              side: BorderSide(
                                color: isSelected
                                    ? AppColors.primary
                                    : borderSideColor,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(AppSpacing.radiusSm),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                      if (req.allowCustom && !req.resolved) ...[
                        TextField(
                          controller: _customTextController,
                          enabled: !_isSubmitting,
                          decoration: InputDecoration(
                            hintText: 'Type your custom answer...',
                            hintStyle: AppTypography.bodySmall.copyWith(
                              color: isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight,
                            ),
                            filled: true,
                            fillColor: isDark
                                ? AppColors.black.withValues(alpha: 0.3)
                                : AppColors.white,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.sm,
                            ),
                            border: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                              borderSide: BorderSide(color: borderSideColor),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                              borderSide: BorderSide(color: borderSideColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                              borderSide:
                                  const BorderSide(color: AppColors.primary),
                            ),
                          ),
                          style: AppTypography.bodySmall.copyWith(
                            color: isDark
                                ? AppColors.darkForeground
                                : AppColors.lightForeground,
                          ),
                        ),
                      ] else if (req.resolved &&
                          req.customAnswer != null &&
                          req.customAnswer!.isNotEmpty) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkSurface
                                : AppColors.lightSurface,
                            borderRadius:
                                BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(color: borderSideColor),
                          ),
                          child: SelectableText(
                            req.customAnswer!,
                            style: AppTypography.bodySmall.copyWith(
                              color: isDark
                                  ? AppColors.darkForeground
                                  : AppColors.lightForeground,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (!req.resolved) ...[
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        FilledButton(
                          onPressed: _isSubmitting ? null : _submit,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.primaryForeground,
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: AppSpacing.xs,
                            ),
                            minimumSize: const Size(100, 34),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.radiusSm),
                            ),
                          ),
                          child: Text(_isSubmitting ? 'Sending...' : 'Send Answer'),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
