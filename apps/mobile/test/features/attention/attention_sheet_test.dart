import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/attention/data/models/attention_item.dart';
import 'package:spaces_mobile/features/attention/ui/attention_notifier.dart';
import 'package:spaces_mobile/features/attention/ui/attention_sheet.dart';
import 'package:spaces_mobile/features/attention/ui/attention_state.dart';
import 'package:spaces_mobile/features/attention/ui/widgets/approval_card.dart';
import 'package:spaces_mobile/features/attention/ui/widgets/question_card.dart';

class TestAttentionNotifier extends StateNotifier<AttentionState>
    implements AttentionNotifier {
  String? lastResolvedId;
  String? lastAction;
  List<String>? lastSelectedOptions;
  String? lastCustomAnswer;
  bool? lastApproved;

  TestAttentionNotifier(super.state);

  @override
  Future<void> load() async {}

  @override
  Future<bool> respondToQuestion(
    String id, {
    List<String>? selectedOptions,
    String? customAnswer,
  }) async {
    lastResolvedId = id;
    lastAction = 'submit';
    lastSelectedOptions = selectedOptions;
    lastCustomAnswer = customAnswer;
    state = state.copyWith(
      items: state.items.where((i) => i.approvalId != id).toList(),
    );
    return true;
  }

  @override
  Future<bool> respondToApproval(
    String id, {
    required bool approved,
    Map<String, dynamic>? payload,
  }) async {
    lastResolvedId = id;
    lastAction = approved ? 'approve' : 'deny';
    lastApproved = approved;
    state = state.copyWith(
      items: state.items.where((i) => i.approvalId != id).toList(),
    );
    return true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('QuestionCard Widget Tests', () {
    testWidgets('renders question text, options, and sends custom answer', (tester) async {
      const item = AttentionItem(
        approvalId: 'q-1',
        sessionId: 'sess-100',
        toolName: 'ask_question',
        kind: 'question',
        args: {
          'question': 'Which database driver do you want to install?',
          'options': ['pg', 'sqlite3', 'mysql2'],
          'isMultiSelect': false,
          'placeholder': 'Or enter custom package...',
        },
      );

      List<String>? selectedOpts;
      String? customAns;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: QuestionCard(
              item: item,
              onRespond: ({selectedOptions, customAnswer}) async {
                selectedOpts = selectedOptions;
                customAns = customAnswer;
              },
            ),
          ),
        ),
      );

      expect(find.text('Which database driver do you want to install?'), findsOneWidget);
      expect(find.text('pg'), findsOneWidget);
      expect(find.text('sqlite3'), findsOneWidget);
      expect(find.text('mysql2'), findsOneWidget);

      // Select 'sqlite3'
      await tester.tap(find.text('sqlite3'));
      await tester.pump();

      // Type custom answer
      await tester.enterText(
        find.byKey(const Key('question_custom_input_q-1')),
        'better-sqlite3',
      );
      await tester.pump();

      // Tap Send
      await tester.tap(find.byKey(const Key('question_send_btn_q-1')));
      await tester.pump();

      expect(selectedOpts, equals(['sqlite3']));
      expect(customAns, equals('better-sqlite3'));
    });
  });

  group('ApprovalCard Widget Tests', () {
    testWidgets('renders command preview, tool badge, and handles approve/deny', (tester) async {
      const item = AttentionItem(
        approvalId: 'appr-1',
        sessionId: 'sess-200',
        toolName: 'bash',
        kind: 'approval',
        args: {'command': 'pnpm install drizzle-orm'},
        reason: 'Install ORM package',
      );

      bool? approvedResult;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ApprovalCard(
              item: item,
              onRespond: (approved) async {
                approvedResult = approved;
              },
            ),
          ),
        ),
      );

      expect(find.text('bash'), findsOneWidget);
      expect(find.text('pnpm install drizzle-orm'), findsOneWidget);
      expect(find.text('Install ORM package'), findsOneWidget);

      // Tap Approve
      await tester.tap(find.byKey(const Key('approval_approve_btn_appr-1')));
      await tester.pump();

      expect(approvedResult, isTrue);

      // Tap Deny
      await tester.tap(find.byKey(const Key('approval_deny_btn_appr-1')));
      await tester.pump();

      expect(approvedResult, isFalse);
    });
  });

  group('AttentionSheet Widget Tests', () {
    testWidgets('renders empty state when there are no pending items', (tester) async {
      final notifier = TestAttentionNotifier(
        const AttentionState(items: [], pendingCount: 0),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            attentionNotifierProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: AttentionSheet(),
            ),
          ),
        ),
      );

      expect(find.text('Attention Hub'), findsOneWidget);
      expect(find.text('All Caught Up!'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline_rounded), findsOneWidget);
    });

    testWidgets('renders list with QuestionCard and ApprovalCard, and responds', (tester) async {
      const qItem = AttentionItem(
        approvalId: 'q-test',
        sessionId: 'sess-q',
        toolName: 'ask_question',
        kind: 'question',
        args: {'question': 'Confirm deployment?'},
      );
      const aItem = AttentionItem(
        approvalId: 'a-test',
        sessionId: 'sess-a',
        toolName: 'bash',
        kind: 'approval',
        args: {'command': 'git reset --hard'},
      );

      final notifier = TestAttentionNotifier(
        const AttentionState(
          items: [qItem, aItem],
          pendingCount: 2,
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            attentionNotifierProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: AttentionSheet(),
            ),
          ),
        ),
      );

      expect(find.text('Attention Hub'), findsOneWidget);
      expect(find.text('2 pending'), findsOneWidget);
      expect(find.text('Confirm deployment?'), findsOneWidget);
      expect(find.text('git reset --hard'), findsOneWidget);

      // Approve the bash action
      await tester.tap(find.byKey(const Key('approval_approve_btn_a-test')));
      await tester.pump();

      expect(notifier.lastResolvedId, equals('a-test'));
      expect(notifier.lastApproved, isTrue);
      expect(find.text('1 pending'), findsOneWidget);
    });
  });
}
