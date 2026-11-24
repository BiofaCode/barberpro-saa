import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:kreno_app/models/booking_model.dart';
import 'package:kreno_app/theme/app_theme.dart';
import 'package:kreno_app/widgets/booking_card.dart';

const _salonPink = Color(0xFFFF66C4);

BookingModel _booking({BookingStatus status = BookingStatus.confirmed}) =>
    BookingModel(
      id: 'b1',
      serviceName: 'Coupe + barbe dégradé américain',
      serviceIcon: '✂️',
      price: 45,
      durationMinutes: 45,
      dateTime: DateTime(2026, 11, 24, 9, 0),
      clientName: 'Jean-Baptiste Delacroix-Montmollin',
      clientEmail: 'jb@example.com',
      clientPhone: '+41790000000',
      status: status,
      createdAt: DateTime(2026, 11, 20),
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  setUp(() => AppTheme.primaryNotifier.value = _salonPink);
  tearDown(() => AppTheme.primaryNotifier.value = AppTheme.defaultPrimary);

  Future<void> pumpCard(WidgetTester tester, BookingModel booking,
      {VoidCallback? onTap}) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.themeFor(_salonPink),
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(390, 844),
          textScaler: TextScaler.linear(1.3),
        ),
        child: Scaffold(
          body: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: BookingCard(booking: booking, onTap: onTap),
          ),
        ),
      ),
    ));
  }

  testWidgets('09:00 renders on one line at 1.3x text scale, no overflow',
      (tester) async {
    await pumpCard(tester, _booking());
    expect(find.text('09:00'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('status label never uses the salon colour as text',
      (tester) async {
    for (final status in BookingStatus.values) {
      await pumpCard(tester, _booking(status: status));
      final label = tester.widget<Text>(find.text(status.label));
      expect(label.style?.color, isNot(_salonPink), reason: status.name);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('tap still calls onTap', (tester) async {
    var taps = 0;
    await pumpCard(tester, _booking(), onTap: () => taps++);
    await tester.tap(find.text('09:00'));
    expect(taps, 1);
  });
}
