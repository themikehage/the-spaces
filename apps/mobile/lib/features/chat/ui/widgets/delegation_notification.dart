import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/chat_message.dart';

class DelegationNotification extends StatefulWidget {
  final ChatMessage message;

  const DelegationNotification({
    super.key,
    required this.message,
  });

  @override
  State<DelegationNotification> createState() => _DelegationNotificationState();
}

class _DelegationNotificationState extends State<DelegationNotification> {
  bool _isOutputExpanded = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = widget.message.details ?? {};

    final status = (details['status'] ?? 'success').toString().toLowerCase();
    final toolName = (details['toolName'] ?? 'Delegation').toString();
    final executiveSummary = (details['executiveSummary'] ??
            details['executive_summary'] ??
            widget.message.content)
        .toString()
        .trim();
    final artifacts = (details['artifacts'] ?? '').toString().trim();
    final hasOutputText = details['hasOutputText'] == true;

    // Determine colors
    Color borderColor;
    Color dotColor;
    String statusLabel;

    switch (status) {
      case 'error':
        borderColor = AppColors.destructive;
        dotColor = AppColors.destructive;
        statusLabel = 'Error';
        break;
      case 'blocked':
        borderColor = AppColors.warning;
        dotColor = AppColors.warning;
        statusLabel = 'Blocked';
        break;
      case 'partial':
        borderColor = AppColors.warning;
        dotColor = AppColors.warning;
        statusLabel = 'Partial';
        break;
      case 'success':
      default:
        borderColor = AppColors.success;
        dotColor = AppColors.success;
        statusLabel = 'Completed';
        break;
    }

    final cardBg = isDark ? AppColors.darkCard : AppColors.lightCard;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final textSecondary = isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight;
    final textPrimary = isDark ? AppColors.darkForeground : AppColors.lightForeground;

    final rawContent = widget.message.content;
    final contentLines = rawContent.split('\n').where((l) => l.trim().isNotEmpty).toList();
    final outputText = hasOutputText && contentLines.length > 1
        ? contentLines.skip(1).join('\n').trim()
        : (hasOutputText ? rawContent : '');

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 3.5,
              color: borderColor,
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Row
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: dotColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '${toolName.toUpperCase()} $statusLabel',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),

                    // Executive Summary
                    if (executiveSummary.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        executiveSummary,
                        style: AppTypography.bodySmall.copyWith(
                          color: textPrimary,
                          height: 1.4,
                        ),
                      ),
                    ],

                    // Artifacts Badge
                    if (artifacts.isNotEmpty && artifacts.toLowerCase() != 'none') ...[
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'ARTIFACTS: ',
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              color: textSecondary,
                              letterSpacing: 0.3,
                            ),
                          ),
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.xs + 2,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                border: Border.all(
                                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.insert_drive_file_outlined,
                                    size: 11,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      artifacts,
                                      style: TextStyle(
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                        color: textPrimary,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],

                    // Output Text Expandable
                    if (outputText.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      InkWell(
                        onTap: () {
                          setState(() {
                            _isOutputExpanded = !_isOutputExpanded;
                          });
                        },
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2.0),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _isOutputExpanded ? 'Hide output' : 'View output',
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 10.5,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: 2),
                              Icon(
                                _isOutputExpanded ? Icons.expand_less : Icons.expand_more,
                                size: 14,
                                color: AppColors.primary,
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (_isOutputExpanded) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            ),
                          ),
                          constraints: const BoxConstraints(maxHeight: 180),
                          child: SingleChildScrollView(
                            child: Text(
                              outputText,
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 10.5,
                                color: textSecondary,
                                height: 1.35,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
