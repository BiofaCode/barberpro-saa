import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_text.dart';

class AppTheme {
  // ── Dynamic theming ───────────────────────────────────────
  static const Color defaultPrimary = Color(0xFF5850E8);
  static final ValueNotifier<Color> primaryNotifier =
      ValueNotifier(defaultPrimary);

  static Color? colorFromHex(String? hex) {
    if (hex == null) return null;
    final clean = hex.startsWith('#') ? hex.substring(1) : hex;
    if (clean.length != 6) return null;
    final value = int.tryParse(clean, radix: 16);
    if (value == null) return null;
    return Color(0xFF000000 | value);
  }

  // ── Brand Colors ─────────────────────────────────────────
  static Color get primary => primaryNotifier.value;
  static const Color primaryDark  = Color(0xFF161616);
  static const Color primaryLight = Color(0xFFF0F0EE);
  static const Color primaryMid   = Color(0xFF8A8A83);

  // ── Radii ────────────────────────────────────────────────
  static const double rSm = 8;
  static const double rMd = 12;
  static const double rLg = 20;

  // ── Surfaces ─────────────────────────────────────────────
  static const Color bgMain     = Color(0xFFF7F7F5); // scaffold
  static const Color bgCard     = Color(0xFFFFFFFF); // cards
  static const Color bgSurface  = Color(0xFFF0F0EE); // secondary bg
  static const Color bgElevated = Color(0xFFF0F0EE);

  // Used as white text on colored backgrounds (backward compat name)
  static const Color bgDark = Colors.white;

  // ── Text ─────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF161616);
  static const Color textSecondary = Color(0xFF55554F);
  static const Color textMuted     = Color(0xFF8A8A83);

  // ── Borders ──────────────────────────────────────────────
  static const Color border     = Color(0xFFE4E4E0);
  static const Color borderDark = Color(0xFFD6D6D0);

  // ── Status ───────────────────────────────────────────────
  static const Color success = Color(0xFF1F8A4C);
  static const Color warning = Color(0xFFB7791F);
  static const Color error   = Color(0xFFC2362F);

  // ── Shadows (flat design: none) ──────────────────────────
  static const List<BoxShadow> shadowSm = <BoxShadow>[];
  static const List<BoxShadow> shadowMd = <BoxShadow>[];

  // ── Contrast helpers ─────────────────────────────────────
  static const Color _ink = Color(0xFF161616);

  static double _contrast(Color a, Color b) {
    final l1 = a.computeLuminance();
    final l2 = b.computeLuminance();
    final hi = l1 > l2 ? l1 : l2;
    final lo = l1 > l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  }

  /// Text colour (white or ink) with the higher contrast against [c].
  static Color onColor(Color c) =>
      _contrast(c, Colors.white) >= _contrast(c, _ink) ? Colors.white : _ink;

  static Color get onPrimary => onColor(primary);

  /// Primary usable as text on white (>= 4.5:1), darkened if needed.
  static Color get accentText {
    var hsl = HSLColor.fromColor(primary);
    var c = primary;
    while (_contrast(c, Colors.white) < 4.5 && hsl.lightness > 0) {
      hsl = hsl.withLightness((hsl.lightness - 0.05).clamp(0.0, 1.0));
      c = hsl.toColor();
    }
    return c;
  }

  static Color get accentTint => primary.withAlpha(26);

  // ── Theme ─────────────────────────────────────────────────
  static ThemeData themeFor(Color primary) {
    final on = onColor(primary);

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgMain,
      primaryColor: primary,
      colorScheme: ColorScheme.light(
        primary: primary,
        onPrimary: on,
        secondary: primary.withAlpha(128),
        surface: bgCard,
        error: error,
      ),
      textTheme: GoogleFonts.interTextTheme(
        const TextTheme(
          displayLarge:   TextStyle(color: textPrimary,   fontWeight: FontWeight.w700),
          displayMedium:  TextStyle(color: textPrimary,   fontWeight: FontWeight.w600),
          headlineLarge:  TextStyle(color: textPrimary,   fontWeight: FontWeight.w600),
          headlineMedium: TextStyle(color: textPrimary,   fontWeight: FontWeight.w600),
          headlineSmall:  TextStyle(color: textPrimary,   fontWeight: FontWeight.w500),
          titleLarge:     TextStyle(color: textPrimary,   fontWeight: FontWeight.w600),
          titleMedium:    TextStyle(color: textPrimary,   fontWeight: FontWeight.w500),
          titleSmall:     TextStyle(color: textSecondary, fontWeight: FontWeight.w500),
          bodyLarge:      TextStyle(color: textPrimary),
          bodyMedium:     TextStyle(color: textSecondary),
          bodySmall:      TextStyle(color: textMuted),
          labelLarge:     TextStyle(color: textPrimary,   fontWeight: FontWeight.w600),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: bgMain,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: AppText.title,
        iconTheme: const IconThemeData(color: textPrimary),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(rMd),
          side: const BorderSide(color: border),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: on,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMuted),
        labelStyle: const TextStyle(color: textSecondary),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: on,
          elevation: 0,
          minimumSize: const Size(0, 50),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(rMd)),
          textStyle:
              GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: border, width: 1),
          minimumSize: const Size(0, 50),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(rMd)),
          textStyle:
              GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: bgSurface,
        selectedColor: primary.withAlpha(26),
        labelStyle: GoogleFonts.inter(color: textSecondary, fontSize: 13),
        secondaryLabelStyle: GoogleFonts.inter(
            color: textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(rSm)),
        side: const BorderSide(color: border),
      ),
    );
  }

  static ThemeData get theme => themeFor(defaultPrimary);

  // Backward-compat alias
  static ThemeData get darkTheme => theme;
}
