import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:kreno_app/theme/app_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  group('AppTheme.colorFromHex', () {
    test('parses valid hex with #', () {
      expect(AppTheme.colorFromHex('#5850E8'), const Color(0xFF5850E8));
    });
    test('parses valid hex without #', () {
      expect(AppTheme.colorFromHex('5850E8'), const Color(0xFF5850E8));
    });
    test('returns null for null', () {
      expect(AppTheme.colorFromHex(null), isNull);
    });
    test('returns null for invalid hex', () {
      expect(AppTheme.colorFromHex('#GGGGGG'), isNull);
    });
    test('returns null for short string', () {
      expect(AppTheme.colorFromHex('#FFF'), isNull);
    });
  });

  group('AppTheme.themeFor', () {
    testWidgets('colorScheme.primary matches input', (tester) async {
      const testColor = Color(0xFFFF5722);
      final theme = AppTheme.themeFor(testColor);
      expect(theme.colorScheme.primary, testColor);
      await tester.pumpAndSettle();
    });
    testWidgets('themeFor(defaultPrimary) has same primary as theme',
        (tester) async {
      final a = AppTheme.themeFor(AppTheme.defaultPrimary);
      final b = AppTheme.theme;
      expect(a.colorScheme.primary, b.colorScheme.primary);
      await tester.pumpAndSettle();
    });
  });

  test('primaryNotifier default value is defaultPrimary', () {
    expect(AppTheme.primaryNotifier.value, AppTheme.defaultPrimary);
  });
}
