# Dynamic Salon Color Theming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapter la couleur primaire de l'interface Flutter en fonction de `salon.branding.primaryColor`, au login, à la reprise de session, et en temps réel après sauvegarde du branding.

**Architecture:** `AppTheme.primaryNotifier` (ValueNotifier<Color>) est la source de vérité. `KrenoApp` wrap `MaterialApp` dans un `ValueListenableBuilder` et passe `AppTheme.themeFor(color)` au lieu du getter statique. Les 3 points d'appel (login, loadSession, save branding) écrivent dans le notifier.

**Tech Stack:** Flutter, Dart, `HSLColor` (natif Flutter), `ValueNotifier` / `ValueListenableBuilder` (natif Flutter), `flutter_test`

---

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `barber_app/lib/theme/app_theme.dart` | Source de vérité : `primaryNotifier`, `colorFromHex`, `_darken`, `themeFor` |
| `barber_app/lib/main.dart` | `KrenoApp.build()` → `ValueListenableBuilder` |
| `barber_app/lib/services/api_service.dart` | Mise à jour notifier dans `login`, `loadSession`, `logout` |
| `barber_app/lib/screens/settings_screen.dart` | Mise à jour notifier après save branding |
| `barber_app/test/theme/app_theme_test.dart` | Tests unitaires pour `colorFromHex` et `themeFor` |

---

## Task 1 : Étendre `AppTheme` avec les méthodes dynamiques

**Files:**
- Modify: `barber_app/lib/theme/app_theme.dart`
- Create: `barber_app/test/theme/app_theme_test.dart`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `barber_app/test/theme/app_theme_test.dart` :

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kreno_app/theme/app_theme.dart';

void main() {
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
    test('colorScheme.primary matches input', () {
      const testColor = Color(0xFFFF5722);
      final theme = AppTheme.themeFor(testColor);
      expect(theme.colorScheme.primary, testColor);
    });
    test('themeFor(defaultPrimary) == theme', () {
      final a = AppTheme.themeFor(AppTheme.defaultPrimary);
      final b = AppTheme.theme;
      expect(a.colorScheme.primary, b.colorScheme.primary);
    });
  });

  test('primaryNotifier default value is defaultPrimary', () {
    expect(AppTheme.primaryNotifier.value, AppTheme.defaultPrimary);
  });
}
```

- [ ] **Step 2 : Lancer les tests pour vérifier l'échec**

```bash
cd barber_app && flutter test test/theme/app_theme_test.dart
```

Résultat attendu : erreur de compilation — `colorFromHex`, `themeFor`, `primaryNotifier`, `defaultPrimary` n'existent pas encore.

- [ ] **Step 3 : Ajouter `defaultPrimary`, `primaryNotifier`, `colorFromHex`, `_darken` dans `app_theme.dart`**

Ouvrir `barber_app/lib/theme/app_theme.dart`. Juste après la déclaration de la classe `AppTheme {`, ajouter avant les constantes existantes :

```dart
class AppTheme {
  // ── Dynamic theming ───────────────────────────────────────
  static const Color defaultPrimary = Color(0xFF5850E8);
  static final ValueNotifier<Color> primaryNotifier =
      ValueNotifier(defaultPrimary);

  static Color? colorFromHex(String? hex) {
    if (hex == null || hex.length < 7) return null;
    final clean = hex.startsWith('#') ? hex.substring(1) : hex;
    final value = int.tryParse(clean, radix: 16);
    if (value == null) return null;
    return Color(0xFF000000 | value);
  }

  static Color _darken(Color color, double amount) {
    final hsl = HSLColor.fromColor(color);
    return hsl
        .withLightness((hsl.lightness - amount).clamp(0.0, 1.0))
        .toColor();
  }

  // ── Brand Colors (constantes statiques conservées pour rétrocompat) ──
  static const Color primary      = Color(0xFF5850E8);
  // ... reste inchangé
```

- [ ] **Step 4 : Ajouter `themeFor()` et convertir le getter `theme` en alias**

À la fin de la classe, juste avant `static ThemeData get darkTheme => theme;` :

```dart
  static ThemeData themeFor(Color primary) {
    final primaryDark  = _darken(primary, 0.08);
    final primaryLight = primary.withAlpha(30);
    final primaryMid   = primary.withAlpha(128);

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgMain,
      primaryColor: primary,
      colorScheme: ColorScheme.light(
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
        iconTheme: IconThemeData(color: primary),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: bgCard,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
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
          side: BorderSide(color: primary, width: 1.5),
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

  // Getter existant devient un alias
  static ThemeData get theme => themeFor(defaultPrimary);
```

> **Note :** Remplacer le corps entier du getter `theme` existant par `=> themeFor(defaultPrimary);` et supprimer l'ancien corps.

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
cd barber_app && flutter test test/theme/app_theme_test.dart
```

Résultat attendu : tous les tests passent (00:XX +5: All tests passed!)

- [ ] **Step 6 : Commit**

```bash
git add barber_app/lib/theme/app_theme.dart barber_app/test/theme/app_theme_test.dart
git commit -m "feat(flutter): add dynamic primaryNotifier and themeFor() to AppTheme"
```

---

## Task 2 : Brancher `KrenoApp` sur le `ValueListenableBuilder`

**Files:**
- Modify: `barber_app/lib/main.dart`

- [ ] **Step 1 : Remplacer le `build()` de `KrenoApp`**

Dans `barber_app/lib/main.dart`, remplacer le corps de `KrenoApp.build()` :

```dart
// AVANT
@override
Widget build(BuildContext context) {
  return MaterialApp(
    title: 'Kreno',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.darkTheme,
    locale: const Locale('fr', 'FR'),
    supportedLocales: const [Locale('fr', 'FR'), Locale('en', 'US')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: isLoggedIn ? const HomeScreen() : const LoginScreen(),
  );
}

// APRÈS
@override
Widget build(BuildContext context) {
  return ValueListenableBuilder<Color>(
    valueListenable: AppTheme.primaryNotifier,
    builder: (context, primaryColor, _) => MaterialApp(
      title: 'Kreno',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.themeFor(primaryColor),
      locale: const Locale('fr', 'FR'),
      supportedLocales: const [Locale('fr', 'FR'), Locale('en', 'US')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: isLoggedIn ? const HomeScreen() : const LoginScreen(),
    ),
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
cd barber_app && flutter analyze lib/main.dart
```

Résultat attendu : `No issues found!` (ou uniquement des avertissements existants non liés)

- [ ] **Step 3 : Commit**

```bash
git add barber_app/lib/main.dart
git commit -m "feat(flutter): wire KrenoApp to AppTheme.primaryNotifier via ValueListenableBuilder"
```

---

## Task 3 : Mettre à jour `ApiService` — login, loadSession, logout

**Files:**
- Modify: `barber_app/lib/services/api_service.dart`

- [ ] **Step 1 : Ajouter l'import `AppTheme` en haut du fichier**

Dans `barber_app/lib/services/api_service.dart`, ajouter l'import après les imports existants :

```dart
import '../theme/app_theme.dart';
```

- [ ] **Step 2 : Créer un helper privé `_applyBrandingColor`**

Ajouter cette méthode statique privée dans `ApiService` (avant `salonId` getter par exemple) :

```dart
static void _applyBrandingColor() {
  final hex = _currentSalon?['branding']?['primaryColor'] as String?;
  final color = AppTheme.colorFromHex(hex);
  if (color != null) AppTheme.primaryNotifier.value = color;
}
```

- [ ] **Step 3 : Appeler `_applyBrandingColor()` dans `login()`**

Localiser le bloc `if (data['success'] == true)` dans `login()`. Après l'assignation de `_currentSalon`, ajouter :

```dart
if (data['success'] == true) {
  _token = data['token'];
  _currentUser = Map<String, dynamic>.from(data['user']);
  _currentSalon = data['salon'] != null
      ? Map<String, dynamic>.from(data['salon'])
      : null;
  _salonId = _currentUser?['salonId'];
  _applyBrandingColor();   // ← ajouter cette ligne

  final prefs = await SharedPreferences.getInstance();
  // ... reste inchangé
```

- [ ] **Step 4 : Appeler `_applyBrandingColor()` dans `loadSession()`**

Localiser le bloc `if (token != null && userStr != null)` dans `loadSession()`. Après l'assignation de `_currentSalon`, ajouter :

```dart
if (token != null && userStr != null) {
  _token = token;
  _currentUser = jsonDecode(userStr);
  if (salonStr != null) {
    _currentSalon = jsonDecode(salonStr);
  }
  _salonId = _currentUser?['salonId'];
  _applyBrandingColor();   // ← ajouter cette ligne
  return true;
}
```

- [ ] **Step 5 : Réinitialiser la couleur dans `logout()`**

Dans `logout()`, ajouter après les assignations à null :

```dart
static Future<void> logout() async {
  _token = null;
  _salonId = null;
  _currentUser = null;
  _currentSalon = null;
  AppTheme.primaryNotifier.value = AppTheme.defaultPrimary;  // ← ajouter
  final prefs = await SharedPreferences.getInstance();
  await prefs.clear();
}
```

- [ ] **Step 6 : Vérifier la compilation**

```bash
cd barber_app && flutter analyze lib/services/api_service.dart
```

Résultat attendu : `No issues found!`

- [ ] **Step 7 : Commit**

```bash
git add barber_app/lib/services/api_service.dart
git commit -m "feat(flutter): apply salon branding color on login, loadSession, and logout"
```

---

## Task 4 : Mise à jour temps réel après sauvegarde branding

**Files:**
- Modify: `barber_app/lib/screens/settings_screen.dart`

- [ ] **Step 1 : Localiser le bloc de sauvegarde branding**

Dans `settings_screen.dart`, chercher la méthode `_showBrandingBottomSheet()`. Le bouton de sauvegarde contient ce bloc :

```dart
final ok = await ApiService.updateBranding(newBranding);
if (ok) {
  Navigator.pop(ctx);
  setState(() => _loading = true);
  await _loadSalonData();
  setState(() => _loading = false);
}
```

- [ ] **Step 2 : Ajouter la mise à jour du notifier après save réussi**

```dart
final ok = await ApiService.updateBranding(newBranding);
if (ok) {
  // Appliquer la nouvelle couleur primaire en temps réel
  final color = AppTheme.colorFromHex(primaryColorCtrl.text.trim());
  if (color != null) AppTheme.primaryNotifier.value = color;

  Navigator.pop(ctx);
  setState(() => _loading = true);
  await _loadSalonData();
  setState(() => _loading = false);
}
```

- [ ] **Step 3 : Vérifier que l'import AppTheme est présent**

En haut de `settings_screen.dart`, vérifier qu'il y a :

```dart
import '../theme/app_theme.dart';
```

Si absent, l'ajouter.

- [ ] **Step 4 : Vérifier la compilation complète**

```bash
cd barber_app && flutter analyze
```

Résultat attendu : `No issues found!` (ou avertissements existants uniquement)

- [ ] **Step 5 : Lancer tous les tests**

```bash
cd barber_app && flutter test
```

Résultat attendu : tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add barber_app/lib/screens/settings_screen.dart
git commit -m "feat(flutter): update branding color in real-time after settings save"
```

---

## Task 5 : Vérification manuelle sur device/simulateur

- [ ] **Step 1 : Lancer l'app**

```bash
cd barber_app && flutter run
```

- [ ] **Step 2 : Vérifier le comportement au login**

  - Se connecter avec un compte dont le salon a `branding.primaryColor` configuré (ex: `#E53935` pour rouge)
  - Vérifier que les boutons, la barre de nav active, et les spinners adoptent cette couleur immédiatement

- [ ] **Step 3 : Vérifier la mise à jour temps réel**

  - Aller dans Salon → Branding → changer la couleur primaire → Sauvegarder
  - Vérifier que l'interface recolorie sans redémarrage

- [ ] **Step 4 : Vérifier le fallback**

  - Tester avec un salon sans `branding.primaryColor` configuré → l'indigo Kreno `#5850E8` doit s'afficher

- [ ] **Step 5 : Vérifier le logout**

  - Se déconnecter → se reconnecter avec un autre compte salon (couleur différente)
  - Vérifier que la couleur du second salon s'applique correctement (pas de résidu du premier)

- [ ] **Step 6 : Commit final**

```bash
git add -A
git commit -m "feat(flutter): dynamic salon color theming — complete"
```
