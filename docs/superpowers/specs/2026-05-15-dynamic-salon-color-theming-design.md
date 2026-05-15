# Design — Dynamic Salon Color Theming (Flutter)

**Date:** 2026-05-15  
**Scope:** Flutter mobile app (`barber_app/`)  
**Status:** Approved

## Objectif

Adapter la couleur primaire de l'interface Flutter en fonction de la couleur configurée dans le branding du salon (`salon.branding.primaryColor`). Actuellement la couleur est hardcodée (`Color(0xFF5850E8)` — indigo Kreno). Le portail web applique déjà ce comportement via CSS variables.

## Périmètre

- **Inclus :** couleur primaire uniquement (buttons, nav active, spinners, icônes actives via `ThemeData`)
- **Exclus :** accentColor, backgroundColor, nuances hardcodées dans les widgets (ex: `BoxDecoration` avec `AppTheme.primary` directement) — celles-ci restent l'indigo par défaut
- **Déclencheurs :** login, reprise de session au démarrage, sauvegarde branding dans Settings

## Architecture

### Source de vérité

`AppTheme.primaryNotifier` — un `ValueNotifier<Color>` statique initialisé à `defaultPrimary`. Toute mise à jour de couleur passe par `AppTheme.primaryNotifier.value = newColor`.

### Flux

```
ApiService.login()        ─┐
ApiService.loadSession()  ─┤─► AppTheme.primaryNotifier.value = colorFromHex(hex)
settings_screen (save)    ─┘

AppTheme.primaryNotifier
        │ ValueListenableBuilder
        ▼
KrenoApp.build()
        │
        ▼
MaterialApp(theme: AppTheme.themeFor(primaryNotifier.value))
```

`KrenoApp` reste un `StatelessWidget` — le `ValueListenableBuilder` gère le rebuild ciblé.

### Fallback

Si `branding.primaryColor` est absent, `null`, ou un hex invalide → le notifier garde sa valeur courante (indigo par défaut au premier démarrage, dernière couleur valide ensuite).

## Fichiers modifiés

### 1. `barber_app/lib/theme/app_theme.dart`

Ajouts :

```dart
// Constante de référence (indigo Kreno)
static const Color defaultPrimary = Color(0xFF5850E8);

// Source de vérité dynamique
static final ValueNotifier<Color> primaryNotifier =
    ValueNotifier(defaultPrimary);

// Parse "#RRGGBB" → Color, retourne null si invalide
static Color? colorFromHex(String? hex) {
  if (hex == null || hex.length < 7) return null;
  final clean = hex.startsWith('#') ? hex.substring(1) : hex;
  final value = int.tryParse(clean, radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}

// Dérive une nuance plus sombre via HSLColor (natif Flutter)
static Color _darken(Color color, double amount) {
  final hsl = HSLColor.fromColor(color);
  return hsl
      .withLightness((hsl.lightness - amount).clamp(0.0, 1.0))
      .toColor();
}

// ThemeData complet paramétré par la couleur primaire
static ThemeData themeFor(Color primary) {
  final primaryDark  = _darken(primary, 0.08);
  final primaryLight = primary.withAlpha(30);
  // ... même structure que le getter `theme` existant,
  //     toutes les constantes `primary` → paramètre `primary`
}
```

Le getter `theme` existant devient un alias : `static ThemeData get theme => themeFor(defaultPrimary)`.  
Les constantes statiques (`primary`, `primaryDark`, etc.) **restent** pour la rétrocompatibilité des widgets qui les référencent directement.

### 2. `barber_app/lib/main.dart`

`KrenoApp.build()` wrap `MaterialApp` dans un `ValueListenableBuilder` :

```dart
@override
Widget build(BuildContext context) {
  return ValueListenableBuilder<Color>(
    valueListenable: AppTheme.primaryNotifier,
    builder: (context, primaryColor, _) => MaterialApp(
      title: 'Kreno',
      theme: AppTheme.themeFor(primaryColor),
      // ... reste inchangé
    ),
  );
}
```

### 3. `barber_app/lib/services/api_service.dart`

**Dans `login()`**, après assignation de `_currentSalon` :
```dart
final hex = _currentSalon?['branding']?['primaryColor'] as String?;
final color = AppTheme.colorFromHex(hex);
if (color != null) AppTheme.primaryNotifier.value = color;
```

**Dans `loadSession()`**, après assignation de `_currentSalon` :
```dart
final hex = _currentSalon?['branding']?['primaryColor'] as String?;
final color = AppTheme.colorFromHex(hex);
if (color != null) AppTheme.primaryNotifier.value = color;
```

**Dans `logout()`** :
```dart
AppTheme.primaryNotifier.value = AppTheme.defaultPrimary;
```

### 4. `barber_app/lib/screens/settings_screen.dart`

Dans `_showBrandingBottomSheet()`, après `ApiService.updateBranding(newBranding)` réussi :

```dart
final color = AppTheme.colorFromHex(primaryColorCtrl.text.trim());
if (color != null) AppTheme.primaryNotifier.value = color;
```

## Nouvelles dépendances

Aucune — `HSLColor`, `ValueNotifier`, `ValueListenableBuilder` sont tous natifs Flutter.

## Limites connues

Les widgets qui lisent `AppTheme.primary` directement (constante statique) ne se recoloreront pas en temps réel — seul le `ThemeData` de `MaterialApp` est dynamique. Cela concerne les `BoxDecoration` hardcodées dans `home_screen.dart` (bouton +, bottom nav border). Extension possible dans un sprint futur en remplaçant ces références par `Theme.of(context).primaryColor`.
