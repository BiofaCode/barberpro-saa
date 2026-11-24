import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:kreno_app/theme/app_text.dart';
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


  double contrast(Color a, Color b) {
    final l1 = a.computeLuminance(), l2 = b.computeLuminance();
    final hi = l1 > l2 ? l1 : l2, lo = l1 > l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  }

  group('contrast helpers', () {
    test('onColor picks higher contrast text colour', () {
      expect(AppTheme.onColor(const Color(0xFFFF66C4)), const Color(0xFF161616));
      expect(AppTheme.onColor(const Color(0xFF0A0A0A)), Colors.white);
      expect(AppTheme.onColor(const Color(0xFF5850E8)), Colors.white);
    });
    test('accentText has >= 4.5 contrast vs white', () {
      AppTheme.primaryNotifier.value = const Color(0xFFFF66C4);
      try {
        expect(contrast(AppTheme.accentText, Colors.white),
            greaterThanOrEqualTo(4.5));
        expect(AppTheme.onPrimary, const Color(0xFF161616));
      } finally {
        AppTheme.primaryNotifier.value = AppTheme.defaultPrimary;
      }
    });
    test('accentTint is primary at alpha 26', () {
      expect(AppTheme.accentTint, AppTheme.primary.withAlpha(26));
    });
  });

  group('neutral tokens', () {
    test('values', () {
      expect(AppTheme.bgMain, const Color(0xFFF7F7F5));
      expect(AppTheme.textMuted, const Color(0xFF6E6E67));
      expect(AppTheme.primaryMid, const Color(0xFF6E6E67));
      expect(AppTheme.success, const Color(0xFF1A7A43));
      expect(AppTheme.warning, const Color(0xFF8F5E12));
      expect(AppTheme.error, const Color(0xFFC2362F));
      expect(AppTheme.shadowSm.isEmpty, isTrue);
      expect(AppTheme.shadowMd.isEmpty, isTrue);
      expect(AppTheme.rMd, 12);
    });
    test('AppText scale', () {
      expect(AppText.title.fontSize, 20);
      expect(AppText.display.fontSize, 28);
      expect(AppText.caption.color, AppTheme.textMuted);
    });
    testWidgets('themeFor uses radius 12 buttons and flat cards',
        (tester) async {
      final t = AppTheme.themeFor(const Color(0xFFFF66C4));
      final shape = t.elevatedButtonTheme.style!.shape!.resolve({})
          as RoundedRectangleBorder;
      expect(shape.borderRadius, BorderRadius.circular(12));
      expect(t.cardTheme.elevation, 0);
      expect(t.appBarTheme.backgroundColor, AppTheme.bgMain);
      await tester.pumpAndSettle();
    });
  });

  test('primaryNotifier default value is defaultPrimary', () {
    expect(AppTheme.primaryNotifier.value, AppTheme.defaultPrimary);
  });
}
