import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/core/theme/app_theme.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_accordion.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_audio.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_badge.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_card.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_card_list.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_code.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_diff.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_html.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_image_grid.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_markdown.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_metric.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_pdf.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_progress.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_section.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_stats.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_steps.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_table.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_tabs.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_timeline.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/cu_video.dart';
import 'package:spaces_mobile/features/chat/ui/widgets/tools/custom_ui/custom_ui_renderer.dart';

void main() {
  Widget buildWrapper(Widget child) {
    return MaterialApp(
      theme: AppTheme.dark(),
      home: Scaffold(
        body: SingleChildScrollView(child: child),
      ),
    );
  }

  group('CustomUiRenderer Dispatcher and Components', () {
    testWidgets('renders CuBadge', (tester) async {
      final ui = {
        'type': 'badge',
        'text': 'Verified',
        'variant': 'success',
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuBadge), findsOneWidget);
      expect(find.text('Verified'), findsOneWidget);
    });

    testWidgets('renders CuCard and CuCardList', (tester) async {
      final ui = {
        'type': 'cards',
        'title': 'Projects',
        'cards': [
          {
            'title': 'Spaces Mobile',
            'description': 'Flutter AI Workspace App',
            'status': 'success',
            'metadata': {'Version': '1.0.0'},
          },
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuCardList), findsOneWidget);
      expect(find.byType(CuCard), findsOneWidget);
      expect(find.text('Spaces Mobile'), findsOneWidget);
      expect(find.text('Flutter AI Workspace App'), findsOneWidget);
      expect(find.text('SUCCESS'), findsOneWidget);
      expect(find.text('Version'), findsOneWidget);
      expect(find.text('1.0.0'), findsOneWidget);
    });

    testWidgets('renders CuTable', (tester) async {
      final ui = {
        'type': 'table',
        'title': 'Active Users',
        'columns': ['Name', 'Role'],
        'rows': [
          {'Name': 'Alice', 'Role': 'Admin'},
          {'Name': 'Bob', 'Role': 'Developer'},
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuTable), findsOneWidget);
      expect(find.text('ACTIVE USERS'), findsOneWidget);
      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Role'), findsOneWidget);
      expect(find.text('Alice'), findsOneWidget);
      expect(find.text('Developer'), findsOneWidget);
    });

    testWidgets('renders CuMetric and CuStats', (tester) async {
      final ui = {
        'type': 'stats',
        'title': 'Performance Metrics',
        'stats': [
          {
            'label': 'CPU Usage',
            'value': '24%',
            'trend': 'down',
            'subtitle': '-5% from avg',
          },
          {
            'label': 'Memory',
            'value': '1.2 GB',
            'trend': 'up',
          },
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuStats), findsOneWidget);
      expect(find.byType(CuMetric), findsNWidgets(2));
      expect(find.text('CPU USAGE'), findsOneWidget);
      expect(find.text('24%'), findsOneWidget);
      expect(find.text('-5% from avg'), findsOneWidget);
      expect(find.text('MEMORY'), findsOneWidget);
      expect(find.text('1.2 GB'), findsOneWidget);
    });

    testWidgets('renders CuProgress in bar and circle variants', (tester) async {
      final ui = [
        {'type': 'progress', 'value': 75, 'label': 'Task Completion'},
        {'type': 'progress', 'value': 40, 'variant': 'circle', 'label': 'Storage'},
      ];

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuProgress), findsNWidgets(2));
      expect(find.text('Task Completion'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('Storage'), findsOneWidget);
      expect(find.text('40%'), findsOneWidget);
    });

    testWidgets('renders CuCode with copy button', (tester) async {
      final ui = {
        'type': 'code',
        'code': 'final x = 42;',
        'language': 'dart',
        'title': 'Example Dart Code',
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuCode), findsOneWidget);
      expect(find.text('EXAMPLE DART CODE'), findsOneWidget);
      expect(find.text('final x = 42;'), findsOneWidget);
      expect(find.text('COPY'), findsOneWidget);
    });

    testWidgets('renders CuMarkdown', (tester) async {
      final ui = {
        'type': 'markdown',
        'title': 'Release Notes',
        'content': '### Version 2.0\n* Feature A\n* Feature B',
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuMarkdown), findsOneWidget);
      expect(find.text('Release Notes'), findsOneWidget);
      expect(find.textContaining('Version 2.0'), findsOneWidget);
      expect(find.textContaining('Feature A'), findsOneWidget);
    });

    testWidgets('renders CuSection with nested children', (tester) async {
      final ui = {
        'type': 'section',
        'title': 'Deployment Group',
        'children': [
          {'type': 'badge', 'text': 'Production', 'variant': 'info'},
          {'type': 'metric', 'label': 'Uptime', 'value': '99.9%'},
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuSection), findsOneWidget);
      expect(find.text('DEPLOYMENT GROUP'), findsOneWidget);
      expect(find.byType(CuBadge), findsOneWidget);
      expect(find.text('Production'), findsOneWidget);
      expect(find.byType(CuMetric), findsOneWidget);
      expect(find.text('99.9%'), findsOneWidget);
    });

    testWidgets('renders CuTabs and toggles tab', (tester) async {
      final ui = {
        'type': 'tabs',
        'tabs': [
          {
            'label': 'Overview',
            'content': [
              {'type': 'badge', 'text': 'Tab 1 Content'},
            ],
          },
          {
            'label': 'Details',
            'content': [
              {'type': 'badge', 'text': 'Tab 2 Content'},
            ],
          },
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuTabs), findsOneWidget);
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Details'), findsOneWidget);
      expect(find.text('Tab 1 Content'), findsOneWidget);

      await tester.tap(find.text('Details'));
      await tester.pumpAndSettle();

      expect(find.text('Tab 2 Content'), findsOneWidget);
    });

    testWidgets('renders CuAccordion and collapses/expands', (tester) async {
      final ui = {
        'type': 'accordion',
        'items': [
          {
            'title': 'FAQ Item 1',
            'defaultOpen': true,
            'content': [
              {'type': 'badge', 'text': 'Answer 1'},
            ],
          },
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuAccordion), findsOneWidget);
      expect(find.text('FAQ Item 1'), findsOneWidget);
      expect(find.text('Answer 1'), findsOneWidget);

      await tester.tap(find.text('FAQ Item 1'));
      await tester.pumpAndSettle();

      expect(find.text('Answer 1'), findsNothing);
    });

    testWidgets('renders CuSteps and CuTimeline', (tester) async {
      final ui = [
        {
          'type': 'steps',
          'steps': [
            {'label': 'Build', 'status': 'done'},
            {'label': 'Test', 'status': 'active'},
            {'label': 'Deploy', 'status': 'pending'},
          ],
        },
        {
          'type': 'timeline',
          'title': 'Audit Log',
          'items': [
            {'date': '10:00 AM', 'title': 'Server Started', 'status': 'success'},
            {'date': '10:05 AM', 'title': 'Backup Completed'},
          ],
        },
      ];

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuSteps), findsOneWidget);
      expect(find.text('Build'), findsOneWidget);
      expect(find.text('Test'), findsOneWidget);
      expect(find.text('Deploy'), findsOneWidget);

      expect(find.byType(CuTimeline), findsOneWidget);
      expect(find.text('AUDIT LOG'), findsOneWidget);
      expect(find.text('Server Started'), findsOneWidget);
      expect(find.text('Backup Completed'), findsOneWidget);
    });

    testWidgets('renders CuDiff', (tester) async {
      final ui = {
        'type': 'diff',
        'title': 'Code Patch',
        'oldCode': 'var a = 1;',
        'newCode': 'var a = 2;',
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuDiff), findsOneWidget);
      expect(find.text('CODE PATCH'), findsOneWidget);
      expect(find.text('var a = 1;'), findsOneWidget);
      expect(find.text('var a = 2;'), findsOneWidget);
    });

    testWidgets('renders CuAudio, CuVideo, CuPdf, CuHtml', (tester) async {
      final ui = [
        {
          'type': 'audio',
          'title': 'Podcast Episode 1',
          'artist': 'Spaces Team',
          'src': '/media/audio.mp3',
        },
        {
          'type': 'video',
          'title': 'Demo Video',
          'src': '/media/video.mp4',
        },
        {
          'type': 'pdf',
          'title': 'Manual PDF',
          'page': 3,
          'scale': 1.5,
          'src': '/docs/manual.pdf',
        },
        {
          'type': 'html',
          'title': 'Report Widget',
          'html': '<h1>Summary Report</h1><p>All services healthy</p>',
        },
      ];

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuAudio), findsOneWidget);
      expect(find.text('Podcast Episode 1'), findsOneWidget);
      expect(find.text('Spaces Team'), findsOneWidget);

      expect(find.byType(CuVideo), findsOneWidget);
      expect(find.text('Demo Video'), findsOneWidget);

      expect(find.byType(CuPdf), findsOneWidget);
      expect(find.text('Manual PDF'), findsOneWidget);
      expect(find.text('Page 3'), findsOneWidget);
      expect(find.text('Zoom 150%'), findsOneWidget);

      expect(find.byType(CuHtml), findsOneWidget);
      expect(find.text('REPORT WIDGET'), findsOneWidget);
      expect(find.textContaining('Summary Report'), findsOneWidget);
    });

    testWidgets('renders CuImageGrid', (tester) async {
      final ui = {
        'type': 'image-grid',
        'title': 'Generated Graphics',
        'images': [
          {'url': 'https://example.com/img1.png', 'title': 'Graphic 1'},
          {'url': 'https://example.com/img2.png', 'title': 'Graphic 2'},
        ],
      };

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.byType(CuImageGrid), findsOneWidget);
      expect(find.text('GENERATED GRAPHICS'), findsOneWidget);
    });

    testWidgets('handles unknown UI component gracefully', (tester) async {
      final ui = {'type': 'unknown_custom_xyz'};

      await tester.pumpWidget(buildWrapper(CustomUiRenderer(ui: ui)));

      expect(find.text('Unknown UI component: unknown_custom_xyz'), findsOneWidget);
    });
  });
}
