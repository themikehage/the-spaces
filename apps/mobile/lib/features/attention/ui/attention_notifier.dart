import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'attention_state.dart';

class AttentionNotifier extends Notifier<AttentionState> {
  @override
  AttentionState build() {
    return const AttentionState(pendingCount: 0);
  }

  void setPendingCount(int count) {
    state = state.copyWith(pendingCount: count);
  }
}

final attentionNotifierProvider =
    NotifierProvider<AttentionNotifier, AttentionState>(
  AttentionNotifier.new,
);
