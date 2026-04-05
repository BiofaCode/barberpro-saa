
import 'package:flutter_test/flutter_test.dart';
import 'package:kreno_app/main.dart';

void main() {
  testWidgets('Kreno app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const KrenoApp());
    expect(find.text('Kreno'), findsWidgets);
  });
}
