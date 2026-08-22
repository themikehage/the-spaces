import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/env_vars_repository.dart';
import '../data/models/env_var.dart';

class EnvVarsState {
  final bool isLoading;
  final List<EnvVar> vars;
  final Set<String> revealedKeys;
  final String? error;
  final bool isSubmitting;

  const EnvVarsState({
    this.isLoading = false,
    this.vars = const [],
    this.revealedKeys = const {},
    this.error,
    this.isSubmitting = false,
  });

  EnvVarsState copyWith({
    bool? isLoading,
    List<EnvVar>? vars,
    Set<String>? revealedKeys,
    String? error,
    bool? isSubmitting,
    bool clearError = false,
  }) {
    return EnvVarsState(
      isLoading: isLoading ?? this.isLoading,
      vars: vars ?? this.vars,
      revealedKeys: revealedKeys ?? this.revealedKeys,
      error: clearError ? null : (error ?? this.error),
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

class EnvVarsNotifier extends StateNotifier<EnvVarsState> {
  final EnvVarsRepository _repository;

  EnvVarsNotifier({required EnvVarsRepository repository})
      : _repository = repository,
        super(const EnvVarsState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final vars = await _repository.getEnvVars();
      state = state.copyWith(
        isLoading: false,
        vars: vars,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> toggleReveal(String key) async {
    final newRevealed = Set<String>.from(state.revealedKeys);
    if (newRevealed.contains(key)) {
      newRevealed.remove(key);
      state = state.copyWith(revealedKeys: newRevealed);
      return;
    }

    final existingIndex = state.vars.indexWhere((v) => v.key == key);
    if (existingIndex == -1) return;

    final currentVar = state.vars[existingIndex];
    if (currentVar.value == '••••••••') {
      try {
        final revealedValue = await _repository.revealEnvVar(key);
        final updatedVars = List<EnvVar>.from(state.vars);
        updatedVars[existingIndex] = currentVar.copyWith(value: revealedValue);
        newRevealed.add(key);
        state = state.copyWith(
          vars: updatedVars,
          revealedKeys: newRevealed,
        );
      } catch (_) {
        // Fallback: still reveal whatever value is currently held
        newRevealed.add(key);
        state = state.copyWith(revealedKeys: newRevealed);
      }
    } else {
      newRevealed.add(key);
      state = state.copyWith(revealedKeys: newRevealed);
    }
  }

  Future<bool> addVar({required String key, required String value}) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final trimmedKey = key.trim().toUpperCase();
      await _repository.addEnvVar(key: trimmedKey, value: value);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> deleteVar(String key) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await _repository.deleteEnvVar(key);
      final updatedVars = state.vars.where((v) => v.key != key).toList();
      final newRevealed = Set<String>.from(state.revealedKeys)..remove(key);
      state = state.copyWith(
        isSubmitting: false,
        vars: updatedVars,
        revealedKeys: newRevealed,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> bulkSave(String dotEnvContent) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final variables = <String, String>{};
      final lines = dotEnvContent.split('\n');
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty || trimmed.startsWith('#')) continue;
        final eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          final k = trimmed.substring(0, eqIndex).trim().toUpperCase();
          final v = trimmed.substring(eqIndex + 1).trim();
          variables[k] = v;
        }
      }

      await _repository.bulkSaveEnvVars(variables);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }
}

final envVarsNotifierProvider =
    StateNotifierProvider<EnvVarsNotifier, EnvVarsState>((ref) {
  final repository = ref.watch(envVarsRepositoryProvider);
  return EnvVarsNotifier(repository: repository);
});
