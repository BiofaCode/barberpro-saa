import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:kreno_app/theme/app_theme.dart';
import 'package:kreno_app/widgets/kreno_bottom_bar.dart';

const _salonPink = Color(0xFFFF66C4);

Widget _host({
  required Widget bar,
  double textScale = 1.0,
}) {
  return MaterialApp(
    theme: AppTheme.themeFor(_salonPink),
    home: MediaQuery(
      data: MediaQueryData(
        size: const Size(390, 844),
        textScaler: TextScaler.linear(textScale),
      ),
      child: Scaffold(body: const SizedBox.shrink(), bottomNavigationBar: bar),
    ),
  );
}

Color? _iconColor(WidgetTester tester, IconData icon) =>
    tester.widget<Icon>(find.byIcon(icon)).color;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  setUp(() => AppTheme.primaryNotifier.value = _salonPink);
  tearDown(() => AppTheme.primaryNotifier.value = AppTheme.defaultPrimary);

  testWidgets('shows the four tab labels', (tester) async {
    await tester.pumpWidget(_host(
      bar: KrenoBottomBar(current: 1, onTap: (_) {}, onNew: () {}),
    ));
    for (final label in ['Accueil', 'RDV', 'Clients', 'Salon']) {
      expect(find.text(label), findsOneWidget);
    }
  });

  testWidgets('selected icon uses the salon colour, others are muted',
      (tester) async {
    await tester.pumpWidget(_host(
      bar: KrenoBottomBar(current: 1, onTap: (_) {}, onNew: () {}),
    ));
    expect(_iconColor(tester, KrenoBottomBar.icons[1]), AppTheme.primary);
    expect(_iconColor(tester, KrenoBottomBar.icons[0]), AppTheme.textMuted);
  });

  testWidgets('tapping a tab reports its index', (tester) async {
    int? tapped;
    await tester.pumpWidget(_host(
      bar: KrenoBottomBar(current: 1, onTap: (i) => tapped = i, onNew: () {}),
    ));
    await tester.tap(find.text('Clients'));
    expect(tapped, 2);
  });

  testWidgets('tapping « + » calls onNew', (tester) async {
    var calls = 0;
    await tester.pumpWidget(_host(
      bar: KrenoBottomBar(current: 0, onTap: (_) {}, onNew: () => calls++),
    ));
    await tester.tap(find.byIcon(Icons.add_rounded));
    expect(calls, 1);
  });

  testWidgets('no overflow at 1.3x text scale on a 390pt-wide screen',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(
      textScale: 1.3,
      bar: KrenoBottomBar(current: 3, onTap: (_) {}, onNew: () {}),
    ));
    expect(tester.takeException(), isNull);
  });
}
