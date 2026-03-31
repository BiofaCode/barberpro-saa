import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ── Brand Colors ─────────────────────────────────────────
  static const Color primary      = Color(0xFF5850E8);
  static const Color primaryDark  = Color(0xFF4740D4);
  static const Color primaryLight = Color(0xFFEEEDFD);
  static const Color primaryMid   = Color(0xFFB5B0F5);

  // ── Surfaces ─────────────────────────────────────────────
  static const Color bgMain     = Color(0xFFF8F8FC); // scaffold
  static const Color bgCard     = Color(0xFFFFFFFF); // cards
  static const Color bgSurface  = Color(0xFFF1F1F8); // secondary bg
  static const Color bgElevated = Color(0xFFEEEDFD); // tinted surface

  // Used as white text on colored backgrounds (backward compat name)
  static const Color bgDark = Colors.white;

  // ── Text ─────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF0C0B1A);
  static const Color textSecondary = Color(0xFF4A4A6A);
  static const Color textMuted     = Color(0xFF9898B5);

  // ── Borders ──────────────────────────────────────────────
  static const Color border     = Color(0xFFE5E5F0);
  static const Color borderDark = Color(0xFFD0D0E8);

  // ── Status ───────────────────────────────────────────────
  static const Color success = Color(0xFF00C48C);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error   = Color(0xFFEF4444);

  // ── Shadows ──────────────────────────────────────────────
  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x0A0C0B1A),
      blurRadius: 6,
      offset: Offset(0, 2),
    ),
  ];
  static const List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Color(0x0F0C0B1A),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Color(0x070C0B1A),
      blurRadius: 4,
      offset: Offset(0, 1),
    ),
  ];

  // ── Theme ─────────────────────────────────────────────────
  static ThemeData get theme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgMain,
      primaryColor: primary,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: primaryMid,
        surface: bgCard,
        error: error,
      ),
      textTheme: GoogleFonts.dmSansTextTheme(
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
        backgroundColor: bgCard,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.bricolageGrotesque(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: const IconThemeData(color: primary),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: bgCard,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMuted),
        labelStyle: const TextStyle(color: textSecondary),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
          textStyle:
              GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
          textStyle:
              GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: bgSurface,
        selectedColor: primaryLight,
        labelStyle: GoogleFonts.dmSans(color: textSecondary, fontSize: 13),
        secondaryLabelStyle: GoogleFonts.dmSans(
            color: primary, fontSize: 13, fontWeight: FontWeight.w600),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: const BorderSide(color: border),
      ),
    );
  }

  // Backward-compat alias
  static ThemeData get darkTheme => theme;
}
