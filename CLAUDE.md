# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kreno** is a multi-tenant SaaS platform for barber shop / salon management. It serves three distinct user roles: super-admin (platform owner), salon owners (pro portal), and end customers (public booking). There is also a Flutter mobile app for staff.

## Commands

### Backend (Node.js)
```bash
npm start        # Run server (also used for dev — no nodemon)
npm install      # Install dependencies
```

### Flutter Mobile App
```bash
cd barber_app
flutter pub get       # Install dependencies
flutter run           # Run on connected device/simulator
flutter build apk     # Build Android APK
flutter build web     # Build for web
```

## Architecture

### Backend: `server.js`
A single large (~3200 line) raw Node.js HTTP server — **no Express**. It handles routing, authentication, and all business logic directly using `http.createServer`. Routes are matched via `if/else` on `req.method` and `req.url`. JWT tokens are verified manually on protected routes. Body parsing is done inline.

### Database: `db.js`
A thin adapter over MongoDB (mongoose). All DB operations go through helper functions exported from this file. Key collections: `salons`, `owners`, `employees`, `clients`, `bookings`, `blocks`.

### Email & SMS: `email.js`, `sms.js`
- Email: Resend API, with all templates (confirmation, reminders, OTP, review requests) in `email.js`
- SMS: Twilio, prepaid credits system per salon

### Frontend (Web): Vanilla HTML/CSS/JS
Four separate static frontends — no framework, no bundler:
- `admin/` — Super-admin dashboard (salon CRUD, platform stats, subscription management)
- `pro/` — Salon owner/manager portal (bookings, staff, analytics, SMS credits)
- `website/` — Public landing page + customer booking flow
- `saas/` — SaaS signup/marketing pages

Static files are served by `server.js` itself (reads and pipes files directly).

### Flutter App: `barber_app/`
Staff-facing mobile app (Dart/Flutter). Locale is `fr_FR`. API calls go through `lib/services/api_service.dart`. Main screens are under `lib/screens/`. App theme is in `lib/theme/app_theme.dart`. Entry point: `lib/main.dart`.

## Key Patterns

### Authentication
- **Owners/Employees**: JWT stored client-side. Verified by checking `Authorization: Bearer <token>` header in `server.js`.
- **Super Admin**: Separate `ADMIN_PASSWORD` env variable, returns an admin JWT.
- **Magic links**: Time-limited tokens for owner onboarding.

### Multi-Tenancy
Every salon has a unique `slug`. Public booking routes use `/api/salon/:slug/...`. Pro/owner routes use `/api/pro/salon/:salonId/...` where `salonId` is the MongoDB ObjectId.

### Routing in server.js
Routes follow this pattern — always read carefully when adding/modifying:
```js
if (req.method === 'POST' && req.url === '/api/some/route') {
  // parse body, validate, respond
}
```
All API responses are JSON. Static file serving falls through to a file-read block at the bottom.

### SMS Credits
Salons purchase SMS credits (Stripe one-time payment). Reminders are queued and sent via cron-like logic in the server. Credits are decremented per SMS sent.

## Environment Variables
See `.env` for the full list. Required for full functionality:
- `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional: `CLOUDINARY_*`, `TWILIO_*`, Stripe Connect vars

## Deployment
Hosted on Render.com (`render.yaml`). Health check endpoint: `GET /api/health`. Production port: `10000`.

## Recent Changes (Kreno Rebranding)

### Color Palette Picker - Flutter Mobile App
**Status:** ✅ Completed (2026-04-04)

**What changed:**
- Replaced hex input fields with intuitive color palette picker in mobile app's branding settings
- File: `barber_app/lib/screens/settings_screen.dart` → `_showBrandingBottomSheet()` method
- Replaced 2 simple `TextField` inputs ("Couleur Primaire (HEX)", "Couleur Accent (HEX)") with `buildColorPicker()` widget

**Implementation details:**
- 16-color palette (indigo, violet, blues, teals, greens, ambers, oranges, reds, pinks, grays, black, off-white)
- Tap a color swatch to select it (visual feedback: white border + checkmark + shadow glow)
- Selected color displays a small preview circle next to the label
- Hex input field still available below palette for manual entry
- Real-time sync: palette selection updates hex field, typing hex updates palette selection
- No external dependencies—uses standard Flutter (Color, Container, GestureDetector, etc.)

**Consistency note:**
- Mobile color palette now matches web pro portal's branding section (where colors use native `<input type="color">`)
- Web still uses hex input + gradient preview; mobile now has more visual, palette-driven UX
