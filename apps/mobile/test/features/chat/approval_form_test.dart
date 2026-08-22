import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/data/models/chat_message.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/approval_form.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/message_bubble.dart';

void main() {
  group('ApprovalForm widget', () {
    testWidgets('renders critical severity with warning icon and countdown', (tester) async {
      const request = ApprovalRequest(
        toolCallId: 'call-1',
        toolName: 'execute_migration',
        severity: 'critical',
        message: 'This will drop the old schema table.',
        timeoutSeconds: 15,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ApprovalForm(request: request),
          ),
        ),
      );

      expect(find.text('execute_migration'), findsOneWidget);
      expect(find.text('Approval Required'), findsOneWidget);
      expect(find.text('15s'), findsOneWidget);
      expect(find.textContaining('This will drop the old schema table', findRichText: true), findsOneWidget);
      expect(find.text('Approve'), findsOneWidget);
      expect(find.text('Deny'), findsOneWidget);
    });

    testWidgets('triggers onResolve with true on Approve tap', (tester) async {
      bool? resolvedApproval;
      const request = ApprovalRequest(
        toolCallId: 'call-2',
        toolName: 'deploy_service',
        severity: 'warning',
        message: 'Deploy to production?',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ApprovalForm(
              request: request,
              onResolve: (val) => resolvedApproval = val,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Approve'));
      await tester.pump();

      expect(resolvedApproval, true);
    });

    testWidgets('triggers onResolve with false on Deny tap', (tester) async {
      bool? resolvedApproval;
      const request = ApprovalRequest(
        toolCallId: 'call-3',
        toolName: 'delete_resource',
        severity: 'critical',
        message: 'Delete AWS S3 bucket?',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ApprovalForm(
              request: request,
              onResolve: (val) => resolvedApproval = val,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Deny'));
      await tester.pump();

      expect(resolvedApproval, false);
    });

    testWidgets('renders resolved state with Approved badge and hides buttons', (tester) async {
      const request = ApprovalRequest(
        toolCallId: 'call-4',
        toolName: 'restart_cluster',
        severity: 'info',
        message: 'Restart cluster nodes.',
        resolved: true,
        approvedResult: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ApprovalForm(request: request),
          ),
        ),
      );

      expect(find.text('Approved'), findsOneWidget);
      expect(find.byIcon(Icons.check), findsOneWidget);
      expect(find.text('Approve'), findsNothing);
      expect(find.text('Deny'), findsNothing);
    });

    testWidgets('renders resolved state with Denied badge', (tester) async {
      const request = ApprovalRequest(
        toolCallId: 'call-5',
        toolName: 'drop_database',
        severity: 'critical',
        message: 'Drop all databases.',
        resolved: true,
        approvedResult: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: ApprovalForm(request: request),
          ),
        ),
      );

      expect(find.text('Denied'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
      expect(find.text('Approve'), findsNothing);
      expect(find.text('Deny'), findsNothing);
    });

    testWidgets('auto-denies when countdown reaches zero', (tester) async {
      bool? autoResolved;
      const request = ApprovalRequest(
        toolCallId: 'call-auto',
        toolName: 'timed_action',
        severity: 'warning',
        message: 'Confirm in 2 seconds',
        timeoutSeconds: 2,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: ApprovalForm(
              request: request,
              onResolve: (val) => autoResolved = val,
            ),
          ),
        ),
      );

      expect(autoResolved, isNull);

      // Advance timer by 2+ seconds
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('1s'), findsOneWidget);

      await tester.pump(const Duration(seconds: 1));
      expect(autoResolved, false);
    });
  });

  group('MessageBubble inline ApprovalForm integration', () {
    testWidgets('renders ApprovalForm when message is approval request', (tester) async {
      const msg = ChatMessage(
        id: 'msg_approval_1',
        role: 'tool_approval_request',
        approvalRequest: ApprovalRequest(
          toolCallId: 'tc_del',
          toolName: 'delete_file',
          severity: 'warning',
          message: 'Delete configuration file?',
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const Scaffold(
            body: MessageBubble(message: msg),
          ),
        ),
      );

      expect(find.byType(ApprovalForm), findsOneWidget);
      expect(find.text('delete_file'), findsOneWidget);
      expect(find.text('Approve'), findsOneWidget);
    });
  });
}
