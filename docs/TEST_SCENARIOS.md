# Kreno Test Scenarios - Detailed Step-by-Step

**Last Updated:** 2026-04-16  
**Format:** Copy/paste ready for manual testing  
**Time to Run:** ~2-3 hours total (all scenarios)

---

## Scenario 1: Complete Customer Booking Flow (15 min)

**Objective:** Verify end-to-end booking from customer perspective

### Setup
- Test salon created with name: "Test Salon Kreno"
- At least 1 staff member available
- At least 1 service created (e.g., "Haircut - 30 min - $25")
- Test customer email: `customer+scenario1@test.kreno.ch`

### Steps

**1. Navigate to Booking Page**
```
1. Open: https://kreno.ch/book
2. Verify: Page loads, search box visible
3. Expected: "Find your salon" heading visible, responsive design
```

**2. Search for Salon**
```
1. Type "Test Salon Kreno" in search
2. Wait 1 second for autocomplete
3. Expected: Salon appears in dropdown with location
4. Click on salon in dropdown
5. Expected: Salon detail page loads with calendar
```

**3. Select Available Time**
```
1. Check calendar for today or tomorrow
2. Expected: Green slots = available, grey = booked
3. Click on first available time slot
4. Expected: Time highlights, booking form appears below calendar
```

**4. Fill Booking Form**
```
Fields to fill:
- Full Name: "Test Customer"
- Email: customer+scenario1@test.kreno.ch
- Phone: "+33612345678"
- Service: Select "Haircut" from dropdown
- Special Requests: "No cuts above ears"

1. Fill each field
2. Expected: Form accepts all inputs
3. Verify email format validation (try invalid email first, should show error)
```

**5. Submit Booking**
```
1. Click "Confirm Booking" button
2. Expected: Loading spinner briefly visible
3. Expected: Success message: "Booking Confirmed"
4. Expected: Booking ID displayed (e.g., #ABC123)
5. Expected: Message: "Check your email for verification code"
```

**6. Receive and Enter OTP**
```
1. Check email inbox for customer+scenario1@test.kreno.ch
2. Expected: Email from "Kreno" with subject "Your Booking Verification Code"
3. Expected: Email contains 6-digit OTP (e.g., 123456)
4. Note the OTP
5. On booking page, should see "Enter OTP" field
6. Paste OTP into field
7. Click "Verify Code"
8. Expected: OTP validated, booking marked confirmed
9. Expected: Message: "Your booking is confirmed!"
```

**7. Receive Confirmation Email**
```
1. Wait 10 seconds
2. Check email inbox
3. Expected: Email from "Kreno" with subject "Booking Confirmation"
4. Expected: Email contains:
   - Salon name: "Test Salon Kreno"
   - Date and time of appointment
   - Service name: "Haircut"
   - Staff member name
   - Cancellation/reschedule link
```

**8. Verify Booking in Pro Portal**
```
1. Open: https://pro.kreno.ch
2. Login with owner email: owner@test.kreno.ch
3. Password: TestPass123!
4. Expected: Dashboard shows today's/tomorrow's bookings
5. Look for booking with customer name "Test Customer"
6. Expected: Status = "Pending Confirmation"
7. Click on booking
8. Expected: Booking details show all information
```

**9. Owner Confirms Booking**
```
1. In pro portal, click "Confirm" on pending booking
2. Expected: Status changes to "Confirmed"
3. Expected: Customer receives confirmation email
4. Check email for customer+scenario1@test.kreno.ch
5. Expected: Email subject "Your Appointment is Confirmed"
```

**10. Test Reschedule**
```
1. In pro portal, click on confirmed booking
2. Look for "Reschedule" option
3. Click to reschedule
4. Select new time slot (e.g., 30 min later)
5. Expected: Reschedule submitted
6. Expected: Customer receives rescheduling notification
7. Check customer email for reschedule confirmation
```

**11. Test Cancel**
```
1. From customer perspective, check "My Bookings" (if customer portal exists)
2. Or in pro portal, open booking and click "Cancel"
3. Expected: Status changes to "Cancelled"
4. Expected: Customer receives cancellation email
5. Check email for cancellation confirmation
```

### Pass Criteria
- OTP email received within 2 minutes
- Confirmation email contains all appointment details
- Booking appears in pro portal
- Owner can confirm/reject/reschedule
- No console errors

---

## Scenario 2: Pro Portal Management (20 min)

**Objective:** Verify salon owner management features

### Setup
- Owner email: owner@test.kreno.ch
- Owner password: TestPass123!
- Test salon slug: test-salon-kreno
- 2-3 pending bookings created (from Scenario 1 or manually)

### Steps

**1. Owner Login**
```
1. Open: https://pro.kreno.ch
2. Enter email: owner@test.kreno.ch
3. Enter password: TestPass123!
4. Click "Login"
5. Expected: Redirects to dashboard
6. Expected: Dashboard shows current date and bookings for today
```

**2. View Dashboard**
```
1. On dashboard, verify visible:
   - Today's bookings (list or calendar view)
   - Key metrics: Revenue today, bookings this month, staff count
   - Quick actions: "Add Booking", "Manage Staff", etc.
2. Expected: Page loads in < 3 seconds
3. Open browser console (F12)
4. Expected: No errors (red messages)
```

**3. Manage Bookings**
```
1. Look for "Bookings" section
2. Expected: List shows pending bookings
3. Click on first pending booking
4. Expected: Detail view shows:
   - Customer name
   - Appointment date/time
   - Service
   - Status: "Pending"
5. Click "Confirm" button
6. Expected: Status changes to "Confirmed"
7. Click "Back"
```

**4. Add New Staff Member**
```
1. Navigate to "Staff" or "Team" section
2. Click "Add Staff Member" or "+" button
3. Fill form:
   - Full Name: "Test Staff 2"
   - Email: staff2@test.kreno.ch
   - Phone: +33698765432
   - Role: Barber (or available role)
   - Password: TempPass123!
4. Click "Save"
5. Expected: Success message
6. Expected: New staff appears in staff list
7. Verify staff can login with provided credentials
```

**5. Edit Staff Member**
```
1. Find "Test Staff 2" in staff list
2. Click "Edit"
3. Change phone to: +33612345999
4. Click "Save"
5. Expected: Success message, phone updated in list
```

**6. Add New Service**
```
1. Navigate to "Services" section
2. Click "Add Service"
3. Fill form:
   - Service Name: "Premium Haircut"
   - Duration: 45 minutes
   - Price: $35
   - Description: "Includes beard trim"
4. Click "Save"
5. Expected: Service appears in list
6. Expected: Service available in future bookings
```

**7. Edit Service**
```
1. Find "Premium Haircut" in services list
2. Click "Edit"
3. Change price to: $40
4. Click "Save"
5. Expected: Price updated in list and bookings
```

**8. Color Palette Picker - Primary Color**
```
1. Navigate to "Settings" > "Branding" or look for color picker
2. Expected: See label "Primary Color" with 16 color swatches
3. Expected: Current primary color highlighted (has border/checkmark)
4. Click on blue color swatch
5. Expected: Blue is now highlighted with border
6. Expected: Hex field below updates to blue hex value (e.g., #2563EB)
7. Expected: Small preview circle next to label shows blue
```

**9. Color Palette Picker - Accent Color**
```
1. Find "Accent Color" palette
2. Expected: 16 color swatches visible
3. Click on orange color swatch
4. Expected: Orange highlighted with border and checkmark
5. Expected: Hex field updates to orange hex (e.g., #F97316)
6. Expected: Preview circle updates to orange
```

**10. Manual Hex Input - Override Palette**
```
1. In Hex field under Primary Color, clear and type: #FF00FF (magenta)
2. Press Enter or Tab
3. Expected: Palette selection updates to nearest match or custom
4. Expected: Preview circle shows magenta
5. Repeat for Accent Color with: #00FF00 (lime green)
```

**11. Save and Verify Branding**
```
1. Click "Save Branding" or auto-saved
2. Expected: Success message or checkmark
3. Reload page (Ctrl+R)
4. Expected: Colors persist
5. Navigate to public booking page (kreno.ch/book)
6. Expected: Salon page shows new primary (blue) and accent (orange) colors
```

**12. View SMS Credits**
```
1. Navigate to "SMS" or "Communication" section
2. Expected: Display shows remaining SMS credits (e.g., "50 SMS remaining")
3. Expected: Shows SMS usage history if available
```

**13. Purchase SMS Credits**
```
1. Click "Buy SMS Credits"
2. Expected: Stripe payment form opens
3. Select SMS package (e.g., "100 SMS for $5")
4. Expected: Total shows correct amount
5. Note: Do NOT actually charge card, close form or use test card: 4242 4242 4242 4242, exp: 12/25, CVC: 123
6. If test card used:
   - Expected: Payment processed
   - Expected: SMS credits updated in dashboard
```

**14. Logout**
```
1. Click avatar or "Logout"
2. Expected: Redirects to login page
3. Expected: Cannot access dashboard without logging in again
```

### Pass Criteria
- Dashboard loads and shows today's bookings
- Can confirm/reject bookings
- Can add/edit/delete staff
- Can add/edit services
- Color palette picker works (click selects, hex field syncs)
- Colors persist after reload
- SMS credits visible and purchasable

---

## Scenario 3: Admin Dashboard (20 min)

**Objective:** Verify platform administration features

### Setup
- Admin password: (from ADMIN_PASSWORD env var)
- Browser with admin access

### Steps

**1. Admin Login**
```
1. Open: https://admin.kreno.ch
2. Expected: Login page with "Admin Password" field
3. Enter admin password
4. Click "Login"
5. Expected: Redirects to admin dashboard
6. Expected: Page title shows "Admin Dashboard" or "Platform Analytics"
```

**2. View All Salons**
```
1. Look for "Salons" section or sidebar menu
2. Expected: List of all salons on platform
3. Expected: Each row shows:
   - Salon name
   - Owner name
   - Location/city
   - Subscription status (Active, Trial, Suspended)
   - Total bookings or revenue
4. Expected: Table has pagination if > 20 salons
```

**3. Search for Salon**
```
1. Find search box in salons section
2. Type "Test Salon Kreno"
3. Expected: List filters to matching salons
4. Expected: No lag or delay (< 500ms)
```

**4. Create New Salon**
```
1. Click "Create New Salon" or "+" button
2. Fill form:
   - Salon Name: "Test Salon Beta"
   - Owner Email: owner-beta@test.kreno.ch
   - Owner Name: "Beta Owner"
   - Location: "Zurich, Switzerland"
   - Phone: +41761234567
   - Subscription: Trial (30 days)
3. Click "Create"
4. Expected: Success message
5. Expected: New salon appears in list
6. Expected: Salon receives activation email
```

**5. Edit Salon Details**
```
1. Find "Test Salon Beta" in list
2. Click "Edit" or salon name
3. Change location to: "Bern, Switzerland"
4. Change subscription to: "Professional Plan"
5. Click "Save"
6. Expected: Success message
7. Expected: Changes reflected in list
```

**6. View Salon Subscription**
```
1. In salon detail, look for "Subscription" section
2. Expected: Shows:
   - Plan type (e.g., "Professional")
   - Monthly cost
   - Renewal date
   - Auto-renew: enabled/disabled
3. Click "View Details"
4. Expected: Detailed billing history visible
```

**7. Manage Subscription**
```
1. In subscription section, click "Upgrade" or "Change Plan"
2. Expected: Plan comparison shown
3. Select different plan (e.g., "Enterprise")
4. Click "Confirm Upgrade"
5. Expected: Confirmation message
6. Expected: Plan shows as "Enterprise" with new renewal date
```

**8. Suspend Salon**
```
1. In salon detail, look for "Status" or "Actions"
2. Click "Suspend" or "Deactivate"
3. Expected: Confirmation dialog: "Are you sure?"
4. Confirm suspension
5. Expected: Status changes to "Suspended"
6. Expected: Owner receives notification email
7. Expected: Salon no longer bookable on public site
```

**9. Resume Salon**
```
1. Find suspended salon in list
2. Status shows "Suspended"
3. Click "Resume" or "Activate"
4. Expected: Confirmation dialog
5. Confirm
6. Expected: Status returns to "Active"
7. Expected: Salon is bookable again
```

**10. View SMS Credits**
```
1. Look for "SMS Management" section or menu
2. Expected: Shows:
   - Total SMS pool available
   - Per-salon SMS usage
   - Credits remaining per salon
```

**11. Allocate SMS Credits**
```
1. In SMS management, find "Test Salon Kreno"
2. Click "Add Credits"
3. Enter amount: 50
4. Click "Allocate"
5. Expected: Success message
6. Expected: Credit count increases for that salon
```

**12. View Platform Analytics**
```
1. Navigate to "Analytics" or "Reports"
2. Expected: Dashboard shows:
   - Total revenue this month
   - Active salons count
   - Total bookings (all time, this month)
   - Popular services
   - Growth trends (if available)
3. Expected: All numbers visible and > 0
```

**13. Export Analytics**
```
1. On analytics page, look for "Export" or "Download"
2. Click "Export as CSV" or "Download PDF"
3. Expected: File downloads
4. Verify file contents (open file)
5. Expected: Contains analytics data
```

**14. View Activity Log**
```
1. Navigate to "Activity Log" or "Audit Log"
2. Expected: Shows recent admin actions:
   - Login times
   - Salon created/edited
   - Subscription changes
   - User actions
3. Each entry shows: Date, Time, Action, User
```

**15. Logout**
```
1. Click "Logout"
2. Expected: Redirects to login page
3. Expected: Session cleared
```

### Pass Criteria
- Can login with admin password
- Can view all salons
- Can create new salon
- Can edit salon and subscription
- Can suspend/resume salon
- Can manage SMS credits
- Analytics dashboard shows data
- No console errors

---

## Scenario 4: Mobile App Staff Flow (15 min)

**Objective:** Verify Flutter mobile app for staff members

### Setup
- Mobile device (iOS or Android)
- App installed: "Kreno"
- Staff login: staff@test.kreno.ch / TestPass123!

### Steps

**1. Launch App**
```
1. Tap app icon "Kreno"
2. Expected: Splash screen shows
3. Expected: App loads within 2 seconds
4. Expected: No crash or error screen
```

**2. Navigate to Login (if not auto-logged in)**
```
1. Expected: Login screen visible
2. Fields present: Email, Password
3. Button: "Login"
4. Text: "Don't have an account?" → Sign up (optional)
```

**3. Staff Login**
```
1. Enter email: staff@test.kreno.ch
2. Enter password: TestPass123!
3. Tap "Login" button
4. Expected: Loading indicator briefly
5. Expected: Redirects to home/dashboard
6. Expected: No error messages
```

**4. View Daily Dashboard**
```
1. On home screen, expected to see:
   - Today's date at top
   - List of appointments for today
   - Each appointment shows:
     * Customer name
     * Appointment time
     * Service
     * Status (e.g., "Upcoming", "In Progress")
2. Expected: Appointments in chronological order
3. Expected: At least 1 appointment visible (from previous scenarios)
```

**5. View Appointment Details**
```
1. Tap on first appointment
2. Expected: Detail screen opens
3. Expected: Shows:
   - Customer name
   - Time: HH:MM format
   - Service name
   - Duration (e.g., "30 min")
   - Special notes (if any)
   - Status buttons: "Mark Complete", "Edit", "Cancel"
4. Scroll down to see all info
```

**6. Add Notes to Appointment**
```
1. On detail screen, look for "Notes" or "Add Notes" field
2. Tap field
3. Type: "Customer prefers not to cut above ears"
4. Tap "Save" or auto-save (swipe back)
5. Expected: Notes saved
6. Navigate back to this appointment
7. Expected: Notes still visible
```

**7. Edit Notes**
```
1. Find notes field
2. Tap to edit
3. Change to: "Customer noted bald spot on crown, discussed trimming around"
4. Save
5. Expected: Changes persist
```

**8. Mark Appointment Complete**
```
1. On appointment detail, tap "Mark Complete"
2. Expected: Confirmation dialog (optional)
3. Confirm
4. Expected: Status changes to "Completed"
5. Expected: Appointment moves to "Completed" section or greys out
6. Time entry field appears (optional) for end time
```

**9. Navigate App Sections**
```
1. Look at bottom navigation (if present) or menu
2. Expected: Tabs/sections like "Home", "Schedule", "Settings", "Profile"
3. Tap "Settings"
4. Expected: Settings screen loads
5. Expected: Shows:
   - App version
   - Language (should be "French" or "Français")
   - Logout button
6. Tap "Home" to return
```

**10. Color Branding (if in Settings)**
```
1. In Settings, find "Appearance" or "Branding"
2. Expected: 16 color swatches for primary color
3. Expected: 16 color swatches for accent color
4. Tap blue color swatch
5. Expected: Blue selected (border/checkmark visible)
6. Expected: App theme updates immediately (buttons, headers turn blue)
7. Tap orange color for accent
8. Expected: Accent color changes
9. Navigate back to home
10. Expected: Colors persist and app theme reflects changes
```

**11. Stress Test - Navigation**
```
1. Rapidly tap through screens:
   - Home → Appointment → Home → Settings → Home
   - Repeat 5 times
2. Expected: No freezing, stuttering, or crashes
3. Expected: Smooth transitions between screens
4. Open browser console on connected device (or Android Studio logcat)
5. Expected: No crash logs or red errors
```

**12. Low Network Test (optional)**
```
1. Enable WiFi but throttle to 3G or slow connection
2. On home screen, pull down to refresh
3. Expected: Loading indicator visible
4. Expected: Data loads (may take longer but no crash)
5. Expected: No error dialogs after 10 seconds
```

**13. Logout**
```
1. In Settings, tap "Logout"
2. Expected: Confirmation: "Are you sure?"
3. Confirm
4. Expected: Redirects to login screen
5. Expected: Credentials cleared
6. Try to go back (back button)
7. Expected: Cannot access dashboard (back button disabled)
```

### Pass Criteria
- App launches without crash
- Staff can login
- Daily appointments visible
- Can mark complete and add notes
- Can change branding colors
- Colors persist after navigation
- No app freezes or crashes
- Logout clears session

---

## Scenario 5: Security & Rate Limiting (10 min)

**Objective:** Verify security controls are working

### Setup
- Browser with Network tab open (DevTools → Network)
- Test client email: test-security@kreno.ch

### Steps

**1. Test Unauthorized Access**
```
1. Open browser console (F12)
2. Try to access protected API:
   fetch('https://api.kreno.ch/api/pro/salon/123/bookings', {
     method: 'GET'
   })
3. Expected: Response status 401 Unauthorized
4. Expected: Message: "Missing or invalid token"
```

**2. Test with Invalid JWT**
```
1. In console, try with fake token:
   fetch('https://api.kreno.ch/api/pro/salon/123/bookings', {
     method: 'GET',
     headers: { 'Authorization': 'Bearer invalid.token.here' }
   })
2. Expected: Response status 401 Unauthorized
```

**3. Test IDOR (Accessing Other Salon's Data)**
```
1. Owner logs into pro.kreno.ch
2. In console, find their JWT token:
   localStorage.getItem('token')
3. Note their salonId: X
4. Try to access different salon (salonId: Y):
   fetch('https://api.kreno.ch/api/pro/salon/Y/bookings', {
     method: 'GET',
     headers: { 'Authorization': 'Bearer <your-token>' }
   })
5. Expected: Response 403 Forbidden OR empty list
6. Expected: Cannot modify other salon's data
```

**4. Test XSS Protection**
```
1. Go to booking form
2. In "Name" field, enter: <script>alert('xss')</script>
3. Submit booking
4. Expected: Script does NOT execute
5. Expected: Check page source or database - script is escaped
6. Result should show: &lt;script&gt;alert...&lt;/script&gt; (escaped)
```

**5. Test SQL Injection Protection**
```
1. Go to salon search
2. Search for: '; DROP TABLE salons; --
3. Expected: No error, treated as literal string
4. Expected: No results found (safe)
5. Expected: Table still exists (verify in admin)
```

**6. Test Rate Limiting on Login**
```
1. Go to login page (pro.kreno.ch)
2. Enter wrong password 5 times rapidly
3. After 5th attempt, expected:
   - Error message: "Too many attempts, please try again later"
   OR
   - Request returns 429 Too Many Requests
4. Wait 15 minutes (or check if limit resets)
5. Expected: Can login again after timeout
```

**7. Test Rate Limiting on OTP**
```
1. Create a booking (triggers OTP email)
2. Try to verify with wrong OTP 5 times
3. Expected: After 5 attempts, blocked
4. Expected: Error: "Too many attempts"
5. Wait for timeout
6. Expected: Can try again after timeout
```

**8. Test API Rate Limiting**
```
1. In console, make 10 rapid requests:
   for(let i=0; i<10; i++) {
     fetch('https://api.kreno.ch/api/health')
   }
2. Expected: First requests 200 OK
3. Expected: Later requests 429 Too Many Requests (if rate limit active)
4. OR: All succeed (rate limit may be generous for health checks)
```

**9. CSRF Protection (if form-based)**
```
1. In pro portal, view page source (Ctrl+U)
2. Look for CSRF token in forms (hidden field like _csrf or csrf_token)
3. If token present:
   - Try to submit form without token (modify form)
   - Expected: Request rejected OR token validated server-side
```

**10. Password Strength Check**
```
1. Try to set password "123" (too weak)
2. Expected: Error message requiring stronger password
3. Try "WeakPass" (8+ chars but common)
4. Expected: May be rejected or accepted depending on policy
5. Try "Kreno@2024!Random" (strong)
6. Expected: Accepted
```

### Pass Criteria
- Unauthorized access returns 401
- Invalid JWT returns 401
- Cannot access other salon data (403)
- XSS payloads are escaped
- SQL injection treated as literal string
- Rate limiting blocks repeated failed attempts
- Cannot bypass CSRF protection

---

## Scenario 6: Email Verification (10 min)

**Objective:** Verify all transactional emails send and render correctly

### Setup
- Test email inbox: customer+test@kreno.ch
- Gmail or equivalent email service
- Booking created from Scenario 1

### Steps

**1. Booking Confirmation Email**
```
1. Create booking as customer
2. Check email inbox within 2 minutes
3. Expected: Email from "Kreno <noreply@kreno.ch>"
4. Expected: Subject line contains appointment date/time
5. Expected: Email content includes:
   - Customer name: "Test Customer"
   - Salon name: "Test Salon Kreno"
   - Service: "Haircut"
   - Date and time
   - Staff member name
   - Cancellation link
6. Expected: Email renders correctly in Gmail mobile view
7. Check if links are clickable
```

**2. OTP Email**
```
1. During booking, verify OTP email sent
2. Expected: Subject: "Your Booking Verification Code"
3. Expected: Email body contains:
   - 6-digit OTP code (large, easy to copy)
   - Message: "Enter this code to confirm your booking"
   - Expiration time (e.g., "Valid for 10 minutes")
4. Expected: Email renders correctly (no broken layout)
5. Copy OTP and paste into app
```

**3. Owner Confirmation Email**
```
1. When owner confirms booking in pro portal
2. Check customer email inbox
3. Expected: Email from "Kreno"
4. Expected: Subject: "Your Appointment Confirmed"
5. Expected: Content includes:
   - Confirmation message
   - Appointment details
   - Salon contact info
   - Cancellation/reschedule link
```

**4. Cancellation Email**
```
1. Cancel booking from pro portal
2. Check customer email
3. Expected: Email subject: "Your Appointment Cancelled"
4. Expected: Content includes:
   - Cancellation confirmation
   - Original appointment details
   - Rebooking link
5. Expected: Professional tone and format
```

**5. 24-Hour Reminder (if enabled)**
```
1. Create booking for tomorrow at specific time
2. Wait for cron job to run (runs at scheduled time)
3. Expected: Reminder email sent ~24h before appointment
4. Expected: Subject: "Reminder: Your appointment tomorrow"
5. Expected: Content includes:
   - Appointment time
   - Salon location
   - Cancellation link
```

**6. Review Request Email (if enabled)**
```
1. Complete booking (mark as done in pro)
2. Wait for review request email
3. Expected: Email asking for review
4. Expected: Subject: "How was your appointment?"
5. Expected: Link to review page
6. Click link
7. Expected: Review form opens
8. Submit 5-star review
9. Expected: Confirmation message
```

**7. Owner Onboarding Email (if applies)**
```
1. Create new salon in admin portal
2. Check owner email (specified during creation)
3. Expected: Email from "Kreno Team"
4. Expected: Subject: "Welcome to Kreno"
5. Expected: Content includes:
   - Account details
   - Setup instructions
   - Login link
   - Support contact info
6. Click setup link
7. Expected: Magic link works (setup page loads)
```

**8. Email Styling in Different Clients**
```
1. Check confirmation email in:
   - Gmail (Web)
   - Gmail (Mobile)
   - Outlook (if available)
   - Apple Mail (if on Mac)
2. For each, verify:
   - Text readable
   - No broken images
   - Buttons clickable
   - Colors correct (Kreno branding)
```

**9. Unsubscribe Link**
```
1. Open any email from Kreno
2. Scroll to bottom
3. Expected: "Unsubscribe" or "Email Preferences" link
4. Click link
5. Expected: Preference page or unsubscribe confirmation
6. Click "Unsubscribe from all"
7. Expected: Confirmation message
```

**10. Email Headers (Advanced)**
```
1. Open email in Gmail
2. Click three dots → "Show original"
3. Expected: Valid SPF, DKIM, DMARC headers
4. Expected: From address: noreply@kreno.ch
5. Expected: No spoofing warnings
```

### Pass Criteria
- All emails arrive within 2 minutes
- Emails contain correct appointment details
- OTP emails have code prominently displayed
- Emails render correctly on mobile
- Links in emails are clickable and work
- Professional design and tone

---

## Scenario 7: Performance Baseline (10 min)

**Objective:** Verify API and page load times meet targets

### Setup
- Browser DevTools open (Network tab)
- Throttle: No throttling (measure real performance)

### Steps

**1. Health Check Endpoint**
```
1. Open DevTools → Network
2. In console:
   fetch('https://api.kreno.ch/api/health')
     .then(r => r.json())
     .then(d => console.log(d))
3. Check Network tab for timing
4. Expected: Response time < 100ms
5. Expected: Status 200 OK
```

**2. Salon Search API**
```
1. Network tab → XHR filter
2. On booking page, type "Test" in search
3. Watch network request
4. Expected: Request to /api/salons?search=Test
5. Expected: Response time < 500ms
6. Expected: Returns JSON with matching salons
```

**3. Landing Page Load**
```
1. Open https://saas.kreno.ch
2. Network tab shows all resources
3. Expected: DOMContentLoaded < 2 seconds
4. Expected: Full page load < 3 seconds
5. Check Performance tab (tab in DevTools)
6. Expected: First Contentful Paint < 1.5 seconds
7. Expected: Largest Contentful Paint < 2.5 seconds
```

**4. Booking Page Load**
```
1. Open https://kreno.ch/book
2. Measure page load time
3. Expected: < 3 seconds to interactive
4. Expected: Can search immediately
5. No lag when typing
```

**5. Pro Portal Dashboard Load**
```
1. Login to pro.kreno.ch
2. Measure time to dashboard visible
3. Expected: < 3 seconds
4. Expected: Bookings list loads
5. Expected: Charts/stats render
```

**6. Admin Dashboard Load**
```
1. Login to admin.kreno.ch
2. Measure dashboard load
3. Expected: < 3 seconds
4. Expected: All salon data visible
```

**7. API Response - Booking Create**
```
1. Network tab, XHR filter
2. Create booking on website
3. Capture POST /api/booking request
4. Expected: Response time < 500ms
5. Expected: Status 201 Created
6. Verify response contains booking ID
```

**8. API Response - List Bookings**
```
1. Pro portal logged in
2. Network tab
3. Refresh bookings or navigate
4. Look for GET /api/pro/salon/:id/bookings
5. Expected: Response < 500ms
6. Expected: Returns JSON array of bookings
```

**9. Mobile App Startup**
```
1. On mobile device, clear app from memory
2. Tap app icon
3. Use device stopwatch to measure time to:
   - Splash screen: < 500ms
   - Login screen visible: < 1.5 seconds
   - Dashboard loads: < 2.5 seconds (after login)
```

**10. Database Query Performance**
```
1. In admin, view analytics or large salon list
2. Network tab should show API call
3. Expected: Response time < 500ms even with 1000+ records
4. Expected: Page remains responsive
5. No freezing or lag when scrolling
```

### Pass Criteria
- API responses < 500ms (most endpoints)
- Health check < 100ms
- Page loads < 3 seconds
- Mobile app startup < 2 seconds
- DOMContentLoaded < 2 seconds
- No lag in UI responsiveness

---

## Testing Checklist

Use this checklist while executing scenarios:

```
Scenario 1: Complete Booking Flow
- [ ] Salon search works
- [ ] Time slot selection works
- [ ] OTP email received < 2 min
- [ ] OTP verified successfully
- [ ] Confirmation email received
- [ ] Booking appears in pro portal
- [ ] Owner can confirm/reject

Scenario 2: Pro Portal
- [ ] Owner login successful
- [ ] Dashboard loads in < 3 sec
- [ ] Can manage bookings
- [ ] Can add/edit staff
- [ ] Can add/edit services
- [ ] Color palette picker works
- [ ] Colors persist after reload
- [ ] SMS credits visible

Scenario 3: Admin
- [ ] Admin login successful
- [ ] Can view all salons
- [ ] Can create salon
- [ ] Can manage subscriptions
- [ ] Can suspend/resume
- [ ] Analytics dashboard works

Scenario 4: Mobile App
- [ ] App launches < 2 sec
- [ ] Login works
- [ ] Appointments visible
- [ ] Can mark complete
- [ ] Can add notes
- [ ] Color picker works
- [ ] No crashes

Scenario 5: Security
- [ ] Unauthorized returns 401
- [ ] Invalid JWT returns 401
- [ ] Cannot access other salon data
- [ ] XSS payloads escaped
- [ ] Rate limiting enforced
- [ ] CSRF protected (if applicable)

Scenario 6: Email
- [ ] Confirmation email sent
- [ ] OTP email sent
- [ ] Reminder email sent
- [ ] All emails render correctly
- [ ] Links in emails work

Scenario 7: Performance
- [ ] Health check < 100ms
- [ ] API responses < 500ms
- [ ] Page loads < 3 sec
- [ ] Mobile app startup < 2 sec
```

---

## Notes & Issues Template

```
Date: ___________
Scenario: ___________
Test Step: ___________
Issue Description: ___________
Severity: [Critical / High / Medium / Low]
Steps to Reproduce: ___________
Expected: ___________
Actual: ___________
Screenshots: [Attached: Y/N]
Status: [Open / Resolved / Deferred]
Assigned to: ___________
```
