
import 'package:flutter_test/flutter_test.dart';
import 'package:barber_app/main.dart';

void main() {
  testWidgets('BarberPro app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BarberProApp());
    expect(find.text('BarberPro'), findsWidgets);
  });
}
