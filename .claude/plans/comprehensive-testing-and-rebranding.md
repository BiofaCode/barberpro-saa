# Plan: Testing Suite + Security Improvements + Kreno Rebranding

## Context
Kreno is preparing for production and beta launch on app stores. The project needs:
1. **Test coverage** for critical routes (currently zero tests)
2. **Security hardening** for OWASP compliance
3. **Rebranding from "barber/BarberPro" to "Kreno"** without breaking API or mobile app
4. **Code structure improvements** for maintainability

---

## Phase 1: Jest Test Suite (Backend Routes)

### What & Why
- **No tests exist** — production risk
- Need to cover critical user paths: auth → booking → payment
- Also admin functions and error cases

### What We'll Create

#### 1. **Test Setup** (`tests/setup.js`)
- MongoDB mock (or use test DB connection)
- JWT helper functions
- Server instance for testing
- Cleanup hooks (before/after each test)

#### 2. **Auth Tests** (`tests/auth.test.js`)
Routes to test:
- `POST /api/pro/login` — success, invalid creds, rate limit
- `POST /api/pro/forgot-password` — email sent, silent on invalid email
- `POST /api/pro/reset-password` — valid token, expired token, invalid token
- `POST /api/admin/login` — superadmin only

#### 3. **Booking Tests** (`tests/bookings.test.js`)
Routes to test:
- `GET /api/salon/:slug/available-slots` — slots returned correctly
- `POST /api/salon/:slug/book` — create booking, conflict detection, rate limit
- `PUT /api/salon/:slug/bookings/:id/cancel` — cancel with email link
- `PUT /api/pro/salon/:id/bookings/:id` — update status, notes (owner only)

#### 4. **Payment Tests** (`tests/payments.test.js`)
Routes to test:
- `POST /api/stripe/create-checkout` — session created, invalid plan
- `POST /api/stripe/webhook` — payment.succeeded, customer.subscription.updated
- `POST /api/pro/sms/buy` — SMS credits purchased

#### 5. **Admin Tests** (`tests/admin.test.js`)
Routes to test:
- `GET /api/admin/stats` — stats returned, superadmin only
- `POST /api/admin/salons` — create salon, validate data
- `DELETE /api/admin/salons/:id` — delete with cascading (employees, bookings)
- `PUT /api/admin/salons/:id/plan` — upgrade/downgrade

#### 6. **Security Tests** (`tests/security.test.js`)
- Rate limiting enforcement
- JWT expiration
- IDOR protection (user A accessing user B's salon)
- Path traversal on file uploads
- XSS in review comments

### Test Framework
- **Jest** (industry standard for Node.js)
- **Supertest** (HTTP assertion library)
- **MongoDB Memory Server** (or connection to test DB)

### Files to Create
```
tests/
├── setup.js              (common helpers, fixtures)
├── auth.test.js          (~30-40 tests)
├── bookings.test.js      (~25-35 tests)
├── payments.test.js      (~15-20 tests)
├── admin.test.js         (~20-25 tests)
├── security.test.js      (~20-25 tests)
└── fixtures/
    ├── salon.json
    ├── user.json
    └── booking.json
```

### Package Changes
```json
"devDependencies": {
  "jest": "^29.0.0",
  "supertest": "^6.3.0",
  "mongodb-memory-server": "^9.0.0"
}

"scripts": {
  "test": "jest --coverage",
  "test:watch": "jest --watch"
}
```

---

## Phase 2: Security Hardening

### What We'll Add

#### 1. **Security Headers** (in `server.js`)
Add to all responses:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

#### 2. **CORS Restriction**
- Change from `'*'` to specific origins: `https://kreno.com`, `https://admin.kreno.com`, etc.
- Add to `.env`: `ALLOWED_ORIGINS`

#### 3. **Input Validation** (create `/lib/validation.js`)
- Email regex validation (RFC 5322 simplified)
- Password strength (min 8 chars, uppercase, number)
- URL validation for webhooks (already done, but improve)
- HTML sanitization for review comments (use DOMPurify or similar)

#### 4. **Rate Limiting Enhancement**
- Move from in-memory to Redis (or session store with TTL)
- Add rate limits to currently unprotected endpoints:
  - Review submission (10/day per email)
  - Webhook creation (5/hour)
  - Gallery uploads (100/day per salon)

#### 5. **Password Validation**
- Verify bcryptjs is actually used for password hashing
- Add strength requirements on reset/change
- Add check against common passwords

#### 6. **Error Messages Hardening**
- Ensure all error messages are generic (don't leak user existence, internal state)
- Already good in most places, audit for leaks

### Files to Modify
- `server.js` — add security headers to `json()` response function
- Create `lib/validation.js` — centralized input validation
- Create `lib/security.js` — CORS, HTTPS enforcement, helper functions
- `.env` — add `ALLOWED_ORIGINS` example

---

## Phase 3: Rebranding (Barber → Kreno)

### SAFE Renames (UI/Display - Can do immediately)
These won't break anything:

1. **`saas/index.html:231`** — Change "🪒 Barbers" → "🪒 Salons" (or other category)
2. **`saas/index.html:1008, 1146`** — Change "Coiffure / Barber" → "Coiffure / Esthétique" or just "Coiffure"
3. **`server.js:1687`** — Change hero subtitle from "Coiffure & Barber" → "Coiffure & Esthétique"
4. **`server.js:3336, 3342`** — Update console.log messages and demo slug
5. **`barber_app/test/widget_test.dart`** — Rename test from "BarberPro app" → "Kreno app"
6. **`db.js` sample data** — Update demo email domains (optional)

### RISKY Renames (Need coordination)
**These must be done together to not break mobile app:**

1. **API Route Rename** (`/api/barber/` → `/api/pro/`)
   - Update all 50+ calls in `barber_app/lib/services/api_service.dart`
   - Update all 30+ route handlers in `server.js`
   - Verify no hardcoded URLs in prod config

2. **Flutter App Package Rename** (`barber_app/` → `kreno_app/`)
   - Rename folder
   - Update `pubspec.yaml:1` → `name: kreno_app`
   - Update all imports: `import 'package:barber_app/...` → `import 'package:kreno_app/...`
   - Update `barber_app/test/widget_test.dart:3` import
   - Update `barber_app/web/index.html` meta tags
   - Update Android `app/build.gradle` package name (if auto-generated from pubspec)
   - Update iOS `ios/Runner.xcodeproj` bundle ID (if auto-generated)
   - **NOT breaking for beta since app will have new version anyway**

3. **Domain/URL Rename** (`barberpro-saa.onrender.com` → `kreno.com` or new domain)
   - Update all 15+ occurrences
   - Update `.env` → `API_BASE_URL=https://kreno.com`
   - Update email templates in `email.js` (6 occurrences)
   - Update `saas/index.html` canonical, og:, twitter: tags (7 occurrences)
   - Update `barber_app/lib/services/api_service.dart:10` (1 occurrence)
   - Update `render.yaml` if deploying to new domain
   - **Critical: Must update DNS, SSL cert, and deployment in sync**

### Implementation Strategy

#### Step 1: Safe Renames (Do Now)
- Files: `saas/index.html`, `server.js`, `barber_app/test/widget_test.dart`, `db.js`
- No testing needed, just text replacements
- Safe to commit immediately

#### Step 2: API Route Rename (Coordinate with User)
- User's responsibility to update iOS/Android build configs for beta
- Once beta is live with new package name, we rename routes
- Do in separate commit/PR

#### Step 3: Domain Rename (After DNS/SSL Ready)
- Requires infrastructure coordination (DNS, SSL cert, Render.com config)
- Can be done as phased rollout (serve both URLs, deprecate old)
- Do in separate commit/PR

---

## Phase 4: Code Structure Improvements

### Refactor `server.js` into Modules
Current: 3200-line monolith
Goal: Split into clear, testable modules

```
lib/
├── routes/
│   ├── admin.js          (admin routes, ~150 lines)
│   ├── auth.js           (login, password reset, ~100 lines)
│   ├── bookings.js       (booking CRUD, ~250 lines)
│   ├── payments.js       (Stripe, SMS credits, ~150 lines)
│   ├── salon.js          (salon CRUD, branding, ~200 lines)
│   ├── public.js         (public booking, reviews, ~200 lines)
│   └── health.js         (health check, static files, ~50 lines)
├── auth.js               (JWT creation/verification, ~50 lines)
├── validation.js         (input validation helpers, ~100 lines)
├── db.js                 (already exists, ~200 lines)
├── email.js              (already exists, ~800 lines)
└── sms.js                (already exists, ~150 lines)

server.js (new): ~200 lines just for:
  - http.createServer() setup
  - Route matching/dispatch
  - Error handling wrapper
```

### Benefit
- Each route file = ~150-250 lines (readable)
- Easier to test (each module can be imported independently)
- Easier to maintain (changes isolated)
- Better for multiple developers

---

## Phase 5: GitHub Actions CI/CD

### Create `.github/workflows/test.yml`
- Runs on every PR and commit
- Runs tests: `npm test`
- Runs linting: `npm run lint` (add ESLint)
- Blocks merge if tests fail

### Create `.github/workflows/deploy.yml`
- Triggers on merge to `main`
- Deploys to Render.com via webhook (already configured)
- Runs smoke test after deploy

---

## Execution Order

### **This Session (Do Now)**

1. **Create Jest test suite**
   - Setup Jest config, package.json devDependencies
   - Create test skeleton files
   - Write 10-15 core tests (auth, basic booking, error cases)
   - Verify tests run and fail gracefully (not all pass yet)

2. **Add security headers**
   - Update `json()` response function in server.js
   - Add security headers middleware
   - Test with curl or Postman

3. **Safe text renames**
   - UI labels, console logs, test names
   - Quick, low-risk, commit immediately

4. **Start refactoring server.js** (optional, lower priority)
   - At least extract `lib/routes/auth.js` as proof-of-concept

### **Next Session (After User Coordination)**

5. **API route rename** (`/api/barber/` → `/api/pro/`)
   - After user updates Flutter package name
   - Verify no breaking changes

6. **Domain rename** (if DNS/SSL ready)
   - After infrastructure is prepared

7. **Finish module refactoring**
   - Extract remaining routes
   - Update server.js import structure

---

## Verification & Testing

### After Each Phase
- [ ] Tests run without errors: `npm test`
- [ ] No regressions in existing endpoints: `curl -X GET http://localhost:3000/api/health`
- [ ] Security headers present: `curl -I http://localhost:3000/api/health`
- [ ] Booking flow works end-to-end: Create salon → Create service → Book → Check confirmation

### Pre-Production Checklist
- [ ] 80%+ test coverage on routes
- [ ] All security headers present
- [ ] CORS restricted to known origins
- [ ] Rate limiting working
- [ ] No console logs with sensitive data
- [ ] Error messages generic
- [ ] Rebranding complete (safe + risky)
- [ ] GitHub Actions passing

---

## Critical Questions for User

1. **API Route Rename:** Do you want `/api/barber/` → `/api/pro/` or keep `/api/barber/` for backward compat?
   - **Recommendation:** Use `/api/pro/` (more semantic, "pro" = owner/employee portal)

2. **Domain:** What's the target domain? `kreno.com`, `kreno.ch`, something else?
   - **Recommendation:** Get DNS + SSL ready before rename

3. **Flutter Package:** When do you want to rename `barber_app/` → `kreno_app/`?
   - **Recommendation:** After user builds APK/IPA for beta (so package name is already "kreno")

4. **Email Domain:** Should we keep `@barberpro.ch` or use new domain?
   - **Recommendation:** New email domain for branding consistency

5. **Timeline:** Want all of this in one PR or separate PRs?
   - **Recommendation:** Separate PRs (Tests → Security → Rebranding), easier to review

