import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';

class CuCode extends StatefulWidget {
  final String code;
  final String? language;
  final String? title;

  const CuCode({
    super.key,
    required this.code,
    this.language,
    this.title,
  });

  factory CuCode.fromJson(Map<String, dynamic> json) {
    return CuCode(
      code: json['code']?.toString() ?? '',
      language: json['language']?.toString(),
      title: json['title']?.toString(),
    );
  }

  @override
  State<CuCode> createState() => _CuCodeState();
}

class _CuCodeState extends State<CuCode> {
  bool _copied = false;

  Future<void> _handleCopy() async {
    await Clipboard.setData(ClipboardData(text: widget.code));
    if (!mounted) return;
    setState(() => _copied = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Code copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _copied = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headerTitle = widget.title ?? widget.language ?? 'code';

    final bg = isDark ? AppColors.darkBackground : AppColors.lightSurface;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final textColor = isDark ? AppColors.darkForeground : AppColors.lightForeground;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkCard.withValues(alpha: 0.8)
                  : AppColors.lightSurface,
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  headerTitle.toUpperCase(),
                  style: AppTypography.labelSmall.copyWith(
                    color: isDark
                        ? AppColors.mutedForeground
                        : AppColors.textSecondaryLight,
                    fontWeight: FontWeight.w600,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  ),
                ),
                InkWell(
                  onTap: _handleCopy,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                      vertical: 2,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _copied ? Icons.check : Icons.copy_rounded,
                          size: 14,
                          color: _copied
                              ? AppColors.success
                              : (isDark
                                  ? AppColors.mutedForeground
                                  : AppColors.textSecondaryLight),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _copied ? 'COPIED' : 'COPY',
                          style: AppTypography.labelSmall.copyWith(
                            fontSize: 10,
                            color: _copied
                                ? AppColors.success
                                : (isDark
                                    ? AppColors.mutedForeground
                                    : AppColors.textSecondaryLight),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(AppSpacing.md),
            child: SelectableText(
              widget.code,
              style: AppTypography.code.copyWith(
                color: textColor,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
