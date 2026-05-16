# Sprint 1 — Launch Readiness for App Store v1

**Date:** 2026-05-16
**Goal:** Make Kreno ready for App Store v1 submission by fixing perceived slowness, adding push notifications, and publishing a privacy policy.

## Context

Kreno is approaching v1 launch on the Apple App Store. Three blockers identified:

1. **Perceived slowness**: Render Starter plan cold-starts after inactivity. First API call after idle takes ~30s. Currently users see only a spinner during this wait.
2. **No push notifications**: Salon owners don't know when a customer books online — they have to manually open the app.
3. **No published privacy policy**: Apple App Store requires a publicly accessible privacy policy URL.

User decisions:
- Crash reporting: **deferred** (no Sentry/Crashlytics for v1)
- Render plan: **keep Starter** + mitigations (no $25/mo upgrade)
- Privacy policy: adapt the existing English draft in `.worktrees/production-launch/website/privacy.html`
- Push triggers: new online booking, customer cancellation, daily 8am reminder
- No Firebase account yet — user will create it during Sprint 1

## Architecture

### Part A — Cold Start Mitigations (3 layers, complementary)

**A1. Warmup ping at app launch** (`barber_app/lib/main.dart`)
- Fire-and-forget `GET /api/health` immediately after `WidgetsFlutterBinding.ensureInitialized()`
- No `await` — runs in parallel with `initializeDateFormatting` and `loadSession`
- Server wakes up while user types password (~3–5s)
- When user taps "Connexion", server is warm → login is fast

**A2. Bootstrap endpoint** (`server.js`)
- New route: `GET /api/pro/salon/:salonId/bootstrap`
- Response shape:
  ```json
  {
    "success": true,
    "data": {
      "salon": { ... },
      "employees": [...],
      "services": [...],
      "stats": { todayBookings, todayRevenue, totalClients, totalRevenue, totalBookings },
      "todayBookings": [...]
    }
  }
  ```
- Uses existing `db.findSalonById`, `db.findEmployees`, `db.findBookings`, etc. in `Promise.all`
- Auth: same `verifySalonAccess` as the individual routes
- Existing individual endpoints kept for backward compatibility with `pro/` web portal

**A3. Stale-while-revalidate in app** (`api_service.dart`, `dashboard_screen.dart`, `settings_screen.dart`)
- New `ApiService.getBootstrap()` calls the bootstrap endpoint and updates `_currentSalon` + branding
- Dashboard:
  - On `initState`, render immediately with cached data from `ApiService.currentSalon` and `_stats = {}` (showing skeletons / dashes)
  - Trigger `getBootstrap()` async; update via `setState` when fresh data arrives
  - No blocking spinner if cached data is present
- Settings:
  - Same pattern: render with cached `_salon = ApiService.currentSalon` immediately
  - Trigger bootstrap in background to refresh

### Part B — Push Notifications (Firebase Cloud Messaging)

**Stack:** Firebase Cloud Messaging via Firebase Admin SDK (HTTP v1 API). FCM is the standard for Flutter cross-platform push (works on Android natively + iOS via APNs bridge).

**B1. Backend — token storage** (`db.js`, `server.js`)
- New mongoose model `PushToken`: `{ owner: ObjectId, token: String, platform: 'ios'|'android', createdAt: Date }`
- Index on `{ owner: 1, token: 1 }` unique
- Helpers in `db.js`: `savePushToken(ownerId, token, platform)`, `removePushToken(token)`, `findPushTokensByOwner(ownerId)`, `findPushTokensBySalon(salonId)` (joins via owner→salon)

**B2. Backend — registration routes** (`server.js`)
- `POST /api/pro/push-token` — body `{ token, platform }`, auth required, upserts token
- `DELETE /api/pro/push-token` — body `{ token }`, removes token (called on logout)

**B3. Backend — sender** (new file `push.js`)
- Uses `firebase-admin` npm package
- Initialized with service account JSON (env var `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON as string)
- Exports `sendPush(tokens, { title, body, data })` — batched, handles invalid tokens (removes them from DB)
- Gracefully no-ops if `FIREBASE_SERVICE_ACCOUNT_JSON` is unset (local dev)

**B4. Backend — triggers** (`server.js`)
- After successful `POST /api/salon/:slug/book` (online booking): find all push tokens for owners of that salon → send push `"Nouvelle réservation"` / `"{client} – {service} à {time}"` with `data: { type: 'booking', bookingId }`
- After successful `POST /api/booking/:token/cancel` (client cancellation): same pattern → `"Annulation"` / `"{client} a annulé son RDV du {date} à {time}"`
- Daily reminder: extend existing `setInterval` (used for SMS reminders) — at 08:00 local time, for each salon with bookings today, send push `"Bonjour ☀️"` / `"{N} rendez-vous aujourd'hui"`

**B5. App — Firebase init** (`barber_app/`)
- Add `firebase_core` + `firebase_messaging` to `pubspec.yaml`
- Run `flutterfire configure` to generate `lib/firebase_options.dart` and download platform config files
- iOS: drop `GoogleService-Info.plist` in `ios/Runner/`, enable Push Notifications capability in Xcode, upload APNs Auth Key (.p8) in Firebase Console
- Android: drop `google-services.json` in `android/app/`, gradle config (auto-handled by flutterfire)

**B6. App — token registration** (`api_service.dart`, `main.dart`)
- In `main.dart`: `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)` before `runApp`
- New `PushService` class:
  - `init()` — request permission (iOS), get FCM token, register message handlers
  - `registerToken()` — sends token to backend via `POST /api/pro/push-token`
  - `clearToken()` — called from `ApiService.logout`
- Called from `ApiService.login` after successful login
- Foreground handler: show in-app SnackBar with the notification body
- Background tap handler: navigate to AppointmentsScreen

**B7. User setup steps** (documented in spec, not code)
1. Create Firebase project at console.firebase.google.com
2. Add iOS app (bundle id from `ios/Runner.xcodeproj`), download `GoogleService-Info.plist`
3. Add Android app (package name from `android/app/build.gradle`), download `google-services.json`
4. In Apple Developer Console: create APNs Auth Key (Keys → +) for the team, download .p8
5. In Firebase Console → Cloud Messaging → Apple app config: upload .p8, fill Key ID + Team ID
6. In Firebase Console → Project Settings → Service Accounts: generate private key → copy JSON content into `FIREBASE_SERVICE_ACCOUNT_JSON` env var on Render

### Part C — Privacy Policy

**C1. Adapt existing draft** (`.worktrees/production-launch/website/privacy.html`)
- Rewrite in French
- Match Kreno SaaS styling (link to `saas/css/saas.css` for consistency with `cgu.html`)
- Single file published at TWO locations:
  - `saas/privacy.html` — for `kreno.ch/privacy` (SaaS site)
  - `website/privacy.html` — for individual salon sites
- Content sections required:
  1. Identité du responsable (Kreno + email contact)
  2. Données collectées (email, téléphone, photos galerie, notifications push, IP)
  3. Finalités (gestion bookings, communication avec clients, notifications, statistiques)
  4. Base légale (consentement + exécution contrat)
  5. Sous-traitants (Render.com, MongoDB Atlas, Stripe, Resend, Twilio, Firebase, Cloudinary)
  6. Durée de conservation
  7. Droits RGPD (accès, rectification, effacement, opposition, portabilité)
  8. Cookies (lien vers `saas/js/cookie.js` qui gère déjà le consentement)
  9. **Section Mobile App** : permissions photos (galerie salon), notifications push (FCM), stockage local (SharedPreferences pour session)
  10. Contact DPO + autorité de contrôle (PFPDT en Suisse)
  11. Date de dernière mise à jour

**C2. Link from app** (`barber_app/`)
- `login_screen.dart`: ajouter en bas du formulaire un lien texte "Politique de confidentialité" → `launchUrl('https://kreno.ch/privacy')`
- `home_screen.dart` Drawer: ajouter un item "Politique de confidentialité" en bas (avant le numéro de version)

**C3. Link from website**
- `website/index.html` footer: lien "Politique de confidentialité" → `/privacy.html`
- `saas/index.html` footer: idem

## Build/Execution Order

1. **C — Privacy Policy** (fastest, no external dependency)
2. **A — Cold Start** (high impact, all internal)
3. **B — Push Notifications** (most work, requires user-side Firebase setup in parallel)

## Files Touched

**New:**
- `push.js`
- `docs/superpowers/plans/2026-05-16-sprint1-launch-readiness.md` (next)
- `saas/privacy.html`
- `website/privacy.html`
- `barber_app/lib/services/push_service.dart`
- `barber_app/lib/firebase_options.dart` (auto-generated)

**Modified:**
- `server.js` — bootstrap endpoint, push-token routes, online-booking trigger, cancellation trigger, daily-reminder trigger
- `db.js` — PushToken model + helpers
- `barber_app/lib/main.dart` — warmup ping, Firebase init
- `barber_app/lib/services/api_service.dart` — getBootstrap, login/logout calls PushService
- `barber_app/lib/screens/dashboard_screen.dart` — stale-while-revalidate
- `barber_app/lib/screens/settings_screen.dart` — stale-while-revalidate
- `barber_app/lib/screens/login_screen.dart` — privacy link
- `barber_app/lib/screens/home_screen.dart` — privacy link in drawer
- `barber_app/pubspec.yaml` — firebase_core, firebase_messaging
- `barber_app/ios/Runner/Info.plist` — push notification background mode (if not present)
- `barber_app/android/app/build.gradle` — google-services plugin (auto by flutterfire)
- `package.json` — firebase-admin
- `website/index.html` — privacy link
- `saas/index.html` — privacy link
- `.env.example` — `FIREBASE_SERVICE_ACCOUNT_JSON` placeholder
- `render.yaml` — `FIREBASE_SERVICE_ACCOUNT_JSON` env var

## Testing

- Cold start: kill server, open app, observe login flow (warmup should make login feel instant after warmup window)
- Bootstrap: verify single endpoint returns same data shape as 5 individual calls
- Stale-while-revalidate: open app offline (airplane mode), confirm dashboard/settings render from cache
- Push: real device test (simulators have limited push support) — make a test booking, verify notification appears
- Privacy: visit `kreno.ch/privacy`, verify rendering; tap app links, verify they open browser

## Out of Scope (deferred to later sprints)

- Crash reporting (Sentry/Crashlytics)
- Skeleton loaders (current spinners stay, just less visible thanks to stale data)
- Calendar view, quick actions on bookings
- Refactor of `pro.js` (3895 lines)
- Render plan upgrade to Standard
