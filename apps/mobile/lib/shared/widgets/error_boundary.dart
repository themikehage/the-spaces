import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Global error boundary that catches unhandled Flutter widget errors
/// and displays a user-friendly error UI with retry capability.
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final VoidCallback? onRetry;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.onRetry,
  });

  /// Configures Flutter's default [ErrorWidget.builder] to render an [ErrorDisplay].
  static void initialize() {
    ErrorWidget.builder = (FlutterErrorDetails details) {
      return Material(
        color: AppColors.darkBackground,
        child: ErrorDisplay(
          message: details.exceptionAsString(),
          stackTrace: details.stack?.toString(),
        ),
      );
    };
  }

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  FlutterErrorDetails? _errorDetails;

  @override
  void initState() {
    super.initState();
  }

  void _resetError() {
    setState(() {
      _errorDetails = null;
    });
    widget.onRetry?.call();
  }

  @override
  Widget build(BuildContext context) {
    if (_errorDetails != null) {
      return ErrorDisplay(
        message: _errorDetails!.exceptionAsString(),
        stackTrace: _errorDetails!.stack?.toString(),
        onRetry: _resetError,
      );
    }
    return widget.child;
  }
}

/// Standalone reusable friendly error display widget.
class ErrorDisplay extends StatefulWidget {
  final String message;
  final String? stackTrace;
  final VoidCallback? onRetry;

  const ErrorDisplay({
    super.key,
    required this.message,
    this.stackTrace,
    this.onRetry,
  });

  @override
  State<ErrorDisplay> createState() => _ErrorDisplayState();
}

class _ErrorDisplayState extends State<ErrorDisplay> {
  bool _showDetails = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.destructive.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: AppColors.destructive,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Something went wrong',
              style: AppTypography.headlineSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'An unexpected error occurred. Please try again.',
              style: AppTypography.bodyMedium.copyWith(
                color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            if (widget.onRetry != null) ...[
              ElevatedButton.icon(
                key: const Key('error_boundary_retry_button'),
                onPressed: widget.onRetry,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.primaryForeground,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                    vertical: AppSpacing.md,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
            TextButton(
              onPressed: () => setState(() => _showDetails = !_showDetails),
              child: Text(
                _showDetails ? 'Hide technical details' : 'Show technical details',
                style: AppTypography.labelSmall.copyWith(
                  color: isDark ? AppColors.mutedForeground : AppColors.textSecondaryLight,
                ),
              ),
            ),
            if (_showDetails) ...[
              const SizedBox(height: AppSpacing.sm),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCard : AppColors.lightCard,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  ),
                ),
                child: SelectableText(
                  widget.stackTrace != null
                      ? '${widget.message}\n\n${widget.stackTrace}'
                      : widget.message,
                  style: AppTypography.code.copyWith(
                    fontSize: 11,
                    color: AppColors.destructive,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
