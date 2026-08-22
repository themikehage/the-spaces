import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/branch_nav.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/delegation_notification.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_footer.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ChatMessage Metadata & Branching Model', () {
    test('parses provider, model, usage, steerMode, and siblings correctly', () {
      final json = {
        'id': 'msg-assistant-1',
        'role': 'assistant',
        'content': 'Code refactoring completed.',
        'provider': 'anthropic',
        'model': 'claude-3-5-sonnet',
        'usage': {
          'input': 1200,
          'output': 350,
          'cost': {'total': 0.00585},
        },
        'steerMode': 'steering',
        'siblings': ['msg-assistant-0', 'msg-assistant-1', 'msg-assistant-2'],
      };

      final message = ChatMessage.fromJson(json);
      expect(message.provider, 'anthropic');
      expect(message.model, 'claude-3-5-sonnet');
      expect(message.inputTokens, 1200);
      expect(message.outputTokens, 350);
      expect(message.totalTokens, 1550);
      expect(message.costUsd, closeTo(0.00585, 0.00001));
      expect(message.steerMode, 'steering');
      expect(message.siblings?.length, 3);
      expect(message.currentBranchIndex, 1);
      expect(message.branchCount, 3);
      expect(message.isDelegation, false);
    });

    test('parses delegation details properly', () {
      final json = {
        'id': 'msg-del-1',
        'role': 'toolResult',
        'content': '[Delegation Completed]\nCreated component files.',
        'details': {
          'type': 'delegation_notification',
          'status': 'success',
          'toolName': 'delegate_architect',
          'executiveSummary': 'Completed architectural blueprint.',
          'artifacts': 'src/arch.ts, src/types.ts',
          'hasOutputText': true,
        },
      };

      final message = ChatMessage.fromJson(json);
      expect(message.isDelegation, true);
      expect(message.details?['status'], 'success');
      expect(message.details?['toolName'], 'delegate_architect');
      expect(message.details?['executiveSummary'], 'Completed architectural blueprint.');
      expect(message.details?['artifacts'], 'src/arch.ts, src/types.ts');
    });

    test('omits cost when not provided', () {
      final json = {
        'id': 'msg-2',
        'role': 'assistant',
        'content': 'Hello without cost',
      };

      final message = ChatMessage.fromJson(json);
      expect(message.costUsd, isNull);
      expect(message.totalTokens, isNull);
    });
  });

  group('MessageFooter Widget Tests', () {
    testWidgets('renders all metadata fields and copy button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageFooter(
              provider: 'anthropic',
              model: 'claude-3-5-sonnet',
              totalTokens: 1420,
              costUsd: 0.0024,
              rawTimestamp: '2026-08-22T14:00:00.000Z',
              messageContent: 'Test content to copy',
            ),
          ),
        ),
      );

      expect(find.text('provider: anthropic'), findsOneWidget);
      expect(find.text('model: claude-3-5-sonnet'), findsOneWidget);
      expect(find.text('tokens: 1420'), findsOneWidget);
      expect(find.text('cost: \$0.0024'), findsOneWidget);
      expect(find.text('Copy'), findsOneWidget);
    });

    testWidgets('taps copy and shows clipboard feedback', (tester) async {
      final log = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, (MethodCall methodCall) async {
        log.add(methodCall);
        return null;
      });

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageFooter(
              provider: 'openai',
              model: 'gpt-4o',
              messageContent: 'Copyable prompt response',
            ),
          ),
        ),
      );

      await tester.tap(find.text('Copy'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Copied'), findsOneWidget);
      expect(find.text('Message copied to clipboard'), findsOneWidget);

      // Drain the 2s timer
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('omits cost when costUsd is null', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageFooter(
              provider: 'ollama',
              model: 'llama3',
              totalTokens: 850,
              costUsd: null,
              messageContent: 'Local run',
            ),
          ),
        ),
      );

      expect(find.text('provider: ollama'), findsOneWidget);
      expect(find.text('tokens: 850'), findsOneWidget);
      expect(find.textContaining('cost:'), findsNothing);
    });

    testWidgets('toggles expand/collapse on tap', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageFooter(
              provider: 'google',
              model: 'gemini-1.5-pro',
              totalTokens: 500,
              rawTimestamp: '2026-08-22T14:00:00.000Z',
              messageContent: 'Google model response',
            ),
          ),
        ),
      );

      expect(find.text('provider: google'), findsOneWidget);
      expect(find.byIcon(Icons.unfold_less), findsOneWidget);

      // Tap to collapse
      await tester.tap(find.byIcon(Icons.unfold_less));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.unfold_more), findsOneWidget);

      // Tap to expand again
      await tester.tap(find.byIcon(Icons.unfold_more));
      await tester.pumpAndSettle();

      expect(find.text('provider: google'), findsOneWidget);
    });
  });

  group('BranchNav Widget Tests', () {
    testWidgets('renders current branch count and handles navigation', (tester) async {
      String? navigatedId;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: BranchNav(
              siblings: const ['branch-1', 'branch-2', 'branch-3'],
              currentId: 'branch-2',
              onNavigate: (id) => navigatedId = id,
            ),
          ),
        ),
      );

      expect(find.text('2 / 3'), findsOneWidget);
      expect(find.text('←'), findsOneWidget);
      expect(find.text('→'), findsOneWidget);

      // Tap prev (should navigate to branch-1)
      await tester.tap(find.text('←'));
      expect(navigatedId, 'branch-1');

      // Tap next (should navigate to branch-3)
      await tester.tap(find.text('→'));
      expect(navigatedId, 'branch-3');
    });

    testWidgets('hides when only 1 branch exists', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: BranchNav(
              siblings: ['single-branch'],
              currentId: 'single-branch',
            ),
          ),
        ),
      );

      expect(find.text('1 / 1'), findsNothing);
    });
  });

  group('User SteerMode Badge Tests in MessageBubble', () {
    testWidgets('renders STEERING badge on user message', (tester) async {
      const userMsg = ChatMessage(
        id: 'u-steer',
        role: 'user',
        content: 'Fix the layout',
        steerMode: 'steering',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageBubble(message: userMsg),
          ),
        ),
      );

      expect(find.text('STEERING'), findsOneWidget);
      expect(find.text('Fix the layout', findRichText: true), findsOneWidget);
    });

    testWidgets('renders FOLLOW-UP badge on user message', (tester) async {
      const userMsg = ChatMessage(
        id: 'u-followup',
        role: 'user',
        content: 'Continue with next step',
        steerMode: 'follow_up',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageBubble(message: userMsg),
          ),
        ),
      );

      expect(find.text('FOLLOW-UP'), findsOneWidget);
      expect(find.text('Continue with next step', findRichText: true), findsOneWidget);
    });
  });

  group('DelegationNotification Widget Tests', () {
    testWidgets('renders success delegation with summary and artifacts', (tester) async {
      const delMessage = ChatMessage(
        id: 'del-1',
        role: 'delegation',
        content: 'Initial planning done.\nDetailed log line 1\nDetailed log line 2',
        details: {
          'type': 'delegation_notification',
          'status': 'success',
          'toolName': 'frontend_agent',
          'executiveSummary': 'Built responsive chat widgets.',
          'artifacts': 'lib/widgets/message_footer.dart',
          'hasOutputText': true,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageBubble(message: delMessage),
          ),
        ),
      );

      expect(find.byType(DelegationNotification), findsOneWidget);
      expect(find.text('FRONTEND_AGENT Completed'), findsOneWidget);
      expect(find.text('Built responsive chat widgets.'), findsOneWidget);
      expect(find.text('lib/widgets/message_footer.dart'), findsOneWidget);
      expect(find.text('View output'), findsOneWidget);

      // Tap View Output to expand
      await tester.tap(find.text('View output'));
      await tester.pumpAndSettle();

      expect(find.text('Hide output'), findsOneWidget);
      expect(find.textContaining('Detailed log line 1'), findsOneWidget);
    });

    testWidgets('renders error delegation with error status', (tester) async {
      const delMessage = ChatMessage(
        id: 'del-err',
        role: 'delegation',
        content: 'Failed to compile subagent bundle.',
        details: {
          'type': 'delegation_notification',
          'status': 'error',
          'toolName': 'build_agent',
          'executiveSummary': 'Build failed with code 1.',
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: DelegationNotification(message: delMessage),
          ),
        ),
      );

      expect(find.text('BUILD_AGENT Error'), findsOneWidget);
      expect(find.text('Build failed with code 1.'), findsOneWidget);
    });
  });
}
