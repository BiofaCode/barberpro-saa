import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_theme.dart';

/// Type scale: 28 / 20 / 17 / 15 / 13 / 12, single family (Inter).
class AppText {
  static TextStyle _s(double size, FontWeight w, Color c) =>
      GoogleFonts.inter(fontSize: size, fontWeight: w, color: c);

  static TextStyle get display =>
      _s(28, FontWeight.w700, AppTheme.textPrimary);
  static TextStyle get title => _s(20, FontWeight.w700, AppTheme.textPrimary);
  static TextStyle get heading =>
      _s(17, FontWeight.w600, AppTheme.textPrimary);
  static TextStyle get body => _s(15, FontWeight.w400, AppTheme.textPrimary);
  static TextStyle get label => _s(13, FontWeight.w500, AppTheme.textPrimary);
  static TextStyle get caption =>
      _s(12, FontWeight.w400, AppTheme.textMuted);

  /// Tabular figures for amounts, times and counters.
  static TextStyle num(TextStyle s) =>
      s.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
}
