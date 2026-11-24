# Mobile Design System (« sobre et pro ») Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Flutter staff app a neutral, professional look (no violet tint, one font, flat surfaces, salon colour as the only accent) without changing any behaviour.

**Architecture:** Centralise design tokens and text styles in `lib/theme/` (neutral colours, type scale, radii, `onPrimary` contrast helper). Keep every existing `AppTheme.*` name compiling (old constants re-pointed to neutral values) so screens can be migrated one at a time. Stage 1 = tokens + Home dashboard + bottom bar (witness screen, validated by Fabio on TestFlight). Stage 2 = remaining screens, only after that validation.

**Tech Stack:** Flutter (Dart ^3.11), google_fonts, flutter_test. Work in `barber_app/`.

**Spec:** `docs/superpowers/specs/2026-11-24-mobile-design-system-design.md`

## Global Constraints

- Branch `feat/mobile-design-system` (worktree `.worktrees/production-launch`). Never merge to `main` before Fabio validates; no merge before 7 Dec 2026 unless he says so.
- No change to navigation, flows, API calls, or business logic. Visual code only.
- Neutral tokens (exact): app bg `#F7F7F5`, card `#FFFFFF`, surface `#F0F0EE`, border `#E4E4E0`, text `#161616`, text secondary `#55554F`, text muted `#6E6E67`, success `#1A7A43`, warning `#8F5E12`, error `#C2362F`.
- Accent = salon colour (`AppTheme.primaryNotifier`), used only for primary actions and selected/active state. Text on accent = black or white chosen by luminance (`AppTheme.onPrimary`).
- One font family: Inter (google_fonts). Weights 400/500/600/700. Type scale: 12 · 13 · 15 · 17 · 20 · 28. Tabular figures for times and amounts.
- Radii: 8 (small), 12 (cards, fields, buttons), 20 (bottom sheets). Buttons: radius 12, height 48–52, no pill shape.
- No gradients, no heavy shadows (flat + 1px border), no decorative emojis (replace with outlined Material icons or remove). Emojis that are **data** (e.g. `serviceIcon` from the API) stay.
- Text contrast ≥ 4.5:1. Never use the salon colour as text on white unless contrast ≥ 4.5:1 (use `AppTheme.accentText`).
- `flutter analyze` must report **No issues found** (CI fails on infos) and `flutter test` must pass.
- After `flutter analyze`/`pub get`, revert generated noise: `git checkout -- macos windows pubspec.lock` (from `barber_app/`).
- User-visible text stays in French.

## Review Focus

- Very light salon colour (Da Cutzz `#ff66c4`, or near-white): text/icons on it must stay readable → `onPrimary` returns black; `accentText` darkens. Tested in Task 1.
- Very dark salon colour (`#0a0a0a`): `onPrimary` white; selected states use `accentTint` on neutral bg plus weight so they differ from black text. Tested in Task 1.
- iOS large text (Dynamic Type): times and stat values must not wrap/clip (bug already seen on iPhone 17 Pro) → keep `FittedBox`/`maxLines: 1`; bottom bar checked at text scale 1.3 in Task 2, booking card in Task 3.
- Admin banner (« Mode admin ») and `NoSlotsNotice` must stay visible and distinct after neutralisation (dark banner kept).
- Callers of legacy decorative constants (`shadowSm`, `shadowMd`, `primaryLight`, `bgElevated`, `primaryDark`, `primaryMid`) must still compile → names kept, values re-pointed.

---

### Task 1: Design tokens, type scale, contrast helpers

**Files:**
- Modify: `barber_app/lib/theme/app_theme.dart`
- Create: `barber_app/lib/theme/app_text.dart`
- Test: `barber_app/test/theme/app_theme_test.dart` (extend)

**Interfaces:**
- Produces (used by every later task):
  - `AppTheme` neutral constants with the Global Constraints values (`bgMain`, `bgCard`, `bgSurface`, `border`, `textPrimary`, `textSecondary`, `textMuted`, `success`, `warning`, `error`). Legacy names kept: `primaryLight`, `bgElevated` → `#F0F0EE`; `borderDark` → `#D6D6D0`; `primaryDark` → `#161616`; `primaryMid` → `#6E6E67`; `shadowSm`/`shadowMd` → `const <BoxShadow>[]`. `defaultPrimary` stays `#5850E8` (fallback when a salon has no colour).
  - `static Color onColor(Color c)` → whichever of `Colors.white` and `Color(0xFF161616)` has the higher WCAG contrast ratio against `c` (ties → white).
  - `static Color get onPrimary` → `onColor(primary)`.
  - `static Color get accentText` → `primary` if contrast vs white ≥ 4.5, else `primary` darkened (HSL lightness −0.05 per step) until ≥ 4.5.
  - `static Color get accentTint` → `primary.withAlpha(26)`.
  - Radii: `static const double rSm = 8, rMd = 12, rLg = 20;`
  - `themeFor(Color primary)`: Inter (`GoogleFonts.interTextTheme`), neutral surfaces, ElevatedButton radius 12 / min height 50 / `foregroundColor: onColor(primary)`, inputs radius 12, cards flat with 1px `border` and elevation 0, AppBar bg `bgMain` elevation 0 title `AppText.title`, bottom nav bg white.
  - `class AppText` in `app_text.dart`: `static TextStyle get display/title/heading/body/label/caption` = sizes 28/20/17/15/13/12, weights 700/700/600/400/500/400, colour `textPrimary` (caption `textMuted`), Inter; `static TextStyle num(TextStyle s)` → `s.copyWith(fontFeatures: [FontFeature.tabularFigures()])`.

- [ ] **Step 1: Write failing tests** in `app_theme_test.dart`:
  - `AppTheme.onColor(const Color(0xFFFF66C4)) == const Color(0xFF161616)`; `onColor(const Color(0xFF0A0A0A)) == Colors.white`; `onColor(const Color(0xFF5850E8)) == Colors.white`.
  - with `AppTheme.primaryNotifier.value = const Color(0xFFFF66C4)`: `contrast(AppTheme.accentText, Colors.white) >= 4.5` (local helper `(L1+0.05)/(L2+0.05)` from `computeLuminance`). Reset notifier after.
  - `AppTheme.bgMain == const Color(0xFFF7F7F5)`, `AppTheme.textMuted == const Color(0xFF8A8A83)`, `AppTheme.shadowSm.isEmpty`.
  - `AppText.title.fontSize == 20`, `AppText.caption.color == AppTheme.textMuted`.
  - Update existing `themeFor` assertions that check old values.
- [ ] **Step 2:** `cd barber_app && flutter test test/theme` → FAIL (missing members).
- [ ] **Step 3:** Implement per Interfaces.
- [ ] **Step 4:** `flutter test` all pass; `flutter analyze` → No issues found.
- [ ] **Step 5:** Revert generated noise; commit `feat(mobile): neutral design tokens, Inter type scale, contrast helpers`.

### Task 2: Witness screen — Home dashboard + bottom bar

**Files:**
- Create: `barber_app/lib/widgets/kreno_bottom_bar.dart`
- Modify: `barber_app/lib/screens/dashboard_screen.dart`; `barber_app/lib/screens/home_screen.dart` (only `HomeScreen` scaffold/bottom bar, `_NavItem`, `_NewButton`, `_adminBanner`, drawer styling — not the new-booking sheet, that is Task 3)
- Test: `barber_app/test/screens/bottom_bar_test.dart` (create)

**Interfaces:**
- Consumes: Task 1 (`AppTheme` tokens, `onPrimary`, `accentTint`, radii, `AppText`).
- Produces: `class KrenoBottomBar extends StatelessWidget { const KrenoBottomBar({super.key, required int current, required ValueChanged<int> onTap, required VoidCallback onNew}); }` (tabs index 0 Accueil, 1 RDV, 2 Clients, 3 Salon; « + » between RDV and Clients). The flat-card pattern later tasks copy: white, radius `rMd`, `Border.all(color: AppTheme.border)`, padding 16; section title `AppText.heading`; stat value `AppText.num(AppText.display)` inside `FittedBox`.

- [ ] **Step 1: Write failing widget test** `bottom_bar_test.dart`: pumping `KrenoBottomBar(current: 1, …)` inside `MaterialApp(theme: AppTheme.themeFor(Color(0xFFFF66C4)))`: (a) texts Accueil/RDV/Clients/Salon found; (b) the RDV icon colour == `AppTheme.primary`, Accueil icon == `AppTheme.textMuted`; (c) tapping « + » calls `onNew`; (d) under `MediaQuery(data: MediaQueryData(textScaler: TextScaler.linear(1.3)))` with width 390 no exception (`tester.takeException()` is null).
- [ ] **Step 2:** `flutter test test/screens/bottom_bar_test.dart` → FAIL (widget missing).
- [ ] **Step 3:** Implement `KrenoBottomBar` (white bg, 1px top border, no shadow; « + » = 48×48 square radius 12 filled `primary`, icon `onPrimary`); use it in `HomeScreen` keeping `_onTap`/`_onNewTap` behaviour and the admin banner above it (banner stays `#161616` with white text). Restyle `dashboard_screen.dart`: remove gradients/shadows/decorative emojis (keep API `serviceIcon`), flat cards, `AppText` styles; next-appointment card = white card with 3px accent left bar instead of a coloured gradient; stats in neutral cards.
- [ ] **Step 4:** `flutter test` and `flutter analyze` → pass / No issues found.
- [ ] **Step 5:** Commit `feat(mobile): sober dashboard and bottom bar (witness screen)`; push branch. **STOP — Fabio validates on TestFlight (Codemagic build from this branch) before Task 3.**

### Task 3: Appointments — list/agenda, booking card, detail sheet, new-booking sheet, slot sheets

**Files:** `lib/screens/appointments_screen.dart`, `lib/widgets/booking_card.dart`, `lib/screens/booking_detail_screen.dart`, `lib/screens/home_screen.dart` (new-booking sheet + `_TimeSlotSheet`), `lib/services/free_slots.dart` (`NoSlotsNotice` only). Test: `test/screens/booking_card_test.dart` (create).
**Interfaces:** Consumes Task 1 + Task 2 card pattern.
- [ ] **Step 1:** Write `booking_card_test.dart`: a `BookingModel` at 09:00 rendered in `BookingCard` at text scale 1.3 and width 390 → `find.text('09:00')` found once and no exception.
- [ ] **Step 2:** Run → passes or fails; it must pass after Step 3 either way (guards the iPhone wrap bug).
- [ ] **Step 3:** Restyle: date strip selected day = `primary` bg + `onPrimary` text; slot grids selected = `primary`/`onPrimary`, others white + border; status colours from tokens; remove decorative emojis/gradients/shadows; sheets radius `rLg`.
- [ ] **Step 4:** `flutter test`, `flutter analyze`.
- [ ] **Step 5:** Commit `feat(mobile): sober appointments screens`.

### Task 4: Clients, services, employees, blocks (pauses), reviews

**Files:** `lib/screens/clients_screen.dart`, `services_screen.dart`, `employees_screen.dart`, `blocks_screen.dart`, `reviews_screen.dart`.
- [ ] **Step 1:** Apply the Task 2 pattern; decorative emojis → outlined icons; review stars → `Icons.star_rounded` in `warning`.
- [ ] **Step 2:** `flutter analyze` No issues found; `flutter test` pass.
- [ ] **Step 3:** Commit `feat(mobile): sober clients/services/staff/blocks/reviews`.

### Task 5: Settings (salon), login, admin console

**Files:** `lib/screens/settings_screen.dart`, `login_screen.dart`, `admin_salons_screen.dart`.
- [ ] **Step 1:** Apply pattern. Login: neutral bg, wordmark « Kreno » in `textPrimary` (no gradient), primary button radius 12. Settings: grouped sections (white card + dividers); colour-theme picker behaviour unchanged. Admin console: replace `bricolageGrotesque`/`dmSans` with `AppText`.
- [ ] **Step 2:** `flutter analyze` No issues found; `flutter test` pass.
- [ ] **Step 3:** Commit `feat(mobile): sober settings, login and admin console`.

### Task 6: Sweep and final check

- [ ] **Step 1:** `grep -rn "bricolageGrotesque\|LinearGradient\|GoogleFonts.dmSans\|GoogleFonts.outfit" barber_app/lib` → none; fix any.
- [ ] **Step 2:** `grep -rn "0xFF4740D4\|0xFFEEEDFD\|0xFFB5B0F5" barber_app/lib` → none.
- [ ] **Step 3:** `flutter analyze` No issues found, `flutter test` pass; push; open PR to `main` (do not merge — Fabio decides after 7 Dec).
