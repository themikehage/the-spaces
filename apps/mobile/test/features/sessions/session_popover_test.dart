import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spaces_mobile/features/sessions/data/models/session.dart';
import 'package:spaces_mobile/features/sessions/ui/widgets/session_popover.dart';

void main() {
  testWidgets('SessionPopover shows Archive Session when archived is false', (tester) async {
    bool archiveCalled = false;
    const session = Session(
      id: 'sess-1',
      title: 'Active Session',
      archived: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionPopover(
            session: session,
            onArchive: () => archiveCalled = true,
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('session_popover_archive_tile')), findsOneWidget);
    expect(find.byKey(const Key('session_popover_unarchive_tile')), findsNothing);
    expect(find.text('Archive Session'), findsOneWidget);

    await tester.tap(find.byKey(const Key('session_popover_archive_tile')));
    await tester.pumpAndSettle();

    expect(archiveCalled, isTrue);
  });

  testWidgets('SessionPopover shows Unarchive Session when archived is true', (tester) async {
    bool unarchiveCalled = false;
    const session = Session(
      id: 'sess-2',
      title: 'Archived Session',
      archived: true,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionPopover(
            session: session,
            onUnarchive: () => unarchiveCalled = true,
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('session_popover_unarchive_tile')), findsOneWidget);
    expect(find.byKey(const Key('session_popover_archive_tile')), findsNothing);
    expect(find.text('Unarchive Session'), findsOneWidget);

    await tester.tap(find.byKey(const Key('session_popover_unarchive_tile')));
    await tester.pumpAndSettle();

    expect(unarchiveCalled, isTrue);
  });

  testWidgets('SessionPopover delete triggers confirmation dialog and invokes onDelete on confirm', (tester) async {
    bool deleteCalled = false;
    const session = Session(
      id: 'sess-3',
      title: 'Session to Delete',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionPopover(
            session: session,
            onDelete: () => deleteCalled = true,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('session_popover_delete_tile')));
    await tester.pumpAndSettle();

    expect(find.text('Delete Session'), findsWidgets);
    expect(find.textContaining('Are you sure you want to delete'), findsOneWidget);
    expect(find.byKey(const Key('popover_confirm_delete_button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('popover_confirm_delete_button')));
    await tester.pumpAndSettle();

    expect(deleteCalled, isTrue);
  });
}
