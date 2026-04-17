# Email Templates Reference

This document lists all email templates used in Kreno, their triggers, variables, and customization options.

---

## Template Summary Table

| # | Template | Trigger | Recipient | Function | Variables |
|---|----------|---------|-----------|----------|-----------|
| 1 | Booking Confirmation | Customer books | Customer | `sendBookingConfirmation()` | booking, salon, URLs |
| 2 | OTP Code | Customer requests access | Customer | `sendOTPEmail()` | email, code, salonName |
| 3 | Welcome (Owner) | New salon signs up | Owner | `sendWelcomeEmail()` | owner, salon, plan, baseUrl |
| 4 | Password Reset | Owner requests reset | Owner | `sendPasswordResetEmail()` | email, ownerName, resetUrl |
| 5 | Appointment Reminder | 24h before appointment | Customer | `sendReminderEmail()` | booking, salon |
| 6 | Cancellation Confirm | Customer cancels booking | Customer | `sendCancellationConfirmation()` | booking, salon |
| 7 | Cancellation Alert | Customer cancels booking | Owner | `sendCancellationAlertToOwner()` | booking, salon, ownerEmail |
| 8 | Admin Subscription Alert | New paid subscription | Admin | `sendAdminNewSubscriptionEmail()` | adminEmail, salon info |
| 9 | Employee Booking Alert | Booking created for staff | Staff | `sendEmployeeBookingNotification()` | booking, salon, employeeEmail |
| 10 | Review Request | ~2h after appointment | Customer | `sendReviewRequestEmail()` | booking, salon, reviewUrl |
| 11 | Referral Reward | Referred salon pays | Referrer | `sendReferralRewardEmail()` | email, name, filleulName |
| 12 | Payment Failed | Stripe charge fails | Owner | `sendPaymentFailedEmail()` | ownerEmail, owner, salon, proUrl |

---

## Template Details

### 1. Booking Confirmation Email

**When it's sent:** Immediately after successful booking

**Recipients:** `booking.clientEmail`

**Subject:** `✅ RDV confirmé — {serviceName} le {date} à {time}`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  clientEmail: "john@example.com",
  serviceName: "Coupe de cheveux",
  serviceIcon: "✂️",
  date: "2026-05-15",     // YYYY-MM-DD
  time: "14:30",          // HH:MM
  duration: 30,           // minutes
  price: 35,              // CHF
  employeeName: "Marie",  // optional
  salon: {
    name: "Studio Hair",
    branding: {
      primaryColor: "#6366F1"
    },
    address: "123 Rue de Paix, 1200 Geneva",  // optional
    phone: "+41 22 123 4567"                  // optional
  }
}
```

**Optional Variables:**
- `employeeName` — If specified, shows "Avec: Marie" in the recap
- `salon.address` — Shows in "Informations pratiques"
- `salon.phone` — Shows in "Informations pratiques"

**Links in Email:**
- **View Receipt:** `{receiptUrl}` (green button)
- **Cancel Appointment:** `{cancelUrl}` (red button)

**Customization Options:**
- Salon branding color is used for header and buttons
- Salon name appears in header
- Emojis for service icon and field labels

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Rendez-vous confirmé
  Studio Hair
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour John Doe,
Votre rendez-vous a bien été enregistré. Voici les détails:

  ✂️ Coupe de cheveux
  📅 Samedi 15 mai 2026
  🕐 14:30
  ⏱ 30 min
  👤 Marie
  Total: 35 CHF

📍 Informations pratiques
123 Rue de Paix, 1200 Geneva
📞 +41 22 123 4567

[🧾 Voir le reçu] [Annuler le RDV]
```

---

### 2. OTP (One-Time Password) Email

**When it's sent:** When customer enters email in "My Appointments" portal

**Recipients:** `email`

**Subject:** `🔐 Votre code d'accès — {salonName}`

**Required Variables:**
```javascript
{
  email: "customer@example.com",
  code: "123456",           // 6-digit code
  salonName: "Studio Hair"
}
```

**Security:**
- Code expires in 10 minutes
- Single use only
- New code can be requested if expired

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━
  Code d'Accès
━━━━━━━━━━━━━━━━━━━━━━━

Voici votre code sécurisé pour accéder à vos rendez-vous sur Studio Hair:

  123456

Ce code expirera dans 10 minutes.
Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
```

---

### 3. Welcome Email (Salon Owner)

**When it's sent:** Immediately after new salon signup

**Recipients:** `email` (salon owner email)

**Subject:** `Bienvenue sur Kreno, {ownerName} — votre espace est prêt`

**Required Variables:**
```javascript
{
  email: "owner@example.com",
  ownerName: "Alice Martin",
  salonName: "Studio Hair",
  plan: "pro",              // starter | pro | premium
  baseUrl: "https://kreno.ch"
}
```

**Dynamic Content:**
- Trial period: 14 days for pro/premium, none for starter
- CTA button changes based on plan
- Plan label: "Starter", "Pro ⭐", "Premium 🚀"

**Key Sections:**
1. **Header:** "Votre salon est en ligne 🎉"
2. **Main CTA:** "Accéder à mon espace pro"
3. **3-Step Setup Guide:**
   - Personnalisez votre profil
   - Ajoutez vos services
   - Partagez votre lien de réservation
4. **Account Info:** Email, Plan, Salon name

**Example Output (Pro Plan):**
```
╔════════════════════════════════════════╗
║   🎉 Votre salon est en ligne!         ║
║   Studio Hair — Plan Pro ⭐            ║
║                                        ║
║   [Accéder à mon espace pro →]        ║
╚════════════════════════════════════════╝

Bonjour Alice Martin,
Studio Hair est désormais sur Kreno avec le plan Pro ⭐
vous bénéficiez de 14 jours d'essai gratuit.

3 étapes pour démarrer:
① Personnalisez votre profil
② Ajoutez vos services
③ Partagez votre lien de réservation

Vos accès:
  Email: owner@example.com
  Plan: Pro ⭐
  Salon: Studio Hair
```

---

### 4. Password Reset Email

**When it's sent:** When owner clicks "Forgot Password"

**Recipients:** `email` (owner email)

**Subject:** `🔐 Réinitialisation de votre mot de passe — Kreno`

**Required Variables:**
```javascript
{
  email: "owner@example.com",
  ownerName: "Alice Martin",
  resetUrl: "https://kreno.ch/reset/token123..."
}
```

**Security:**
- Reset link expires in 1 hour
- Link is unique and single-use
- If not used within 1 hour, customer must request new reset

**Example Output:**
```
╔════════════════════════════════════════╗
║   🔐 Réinitialisation du mot de passe  ║
║   Kreno — Espace Pro                   ║
╚════════════════════════════════════════╝

Bonjour Alice Martin,

Nous avons reçu une demande de réinitialisation du mot de passe
pour votre compte Kreno. Cliquez sur le bouton ci-dessous pour
choisir un nouveau mot de passe. Ce lien est valable 1 heure.

[Réinitialiser mon mot de passe →]

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
Votre mot de passe actuel reste inchangé.
```

---

### 5. Appointment Reminder Email

**When it's sent:** 24 hours before scheduled appointment

**Recipients:** `booking.clientEmail`

**Subject:** `⏰ Rappel RDV demain — {serviceName} à {time}`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  clientEmail: "john@example.com",
  serviceName: "Coupe de cheveux",
  serviceIcon: "✂️",
  date: "2026-05-15",
  time: "14:30",
  duration: 30,
  employeeName: "Marie",        // optional
  salon: {
    name: "Studio Hair",
    branding: {
      primaryColor: "#6366F1"
    }
  }
}
```

**Trigger Setup:**
- Background job checks appointments daily
- Finds appointments where `date = tomorrow`
- Sends reminder if not already sent
- Prevents duplicate reminders

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⏰ Rappel de rendez-vous
  Studio Hair
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour John Doe,
Nous vous rappelons votre rendez-vous de demain:

  ✂️ Coupe de cheveux
  📅 Samedi 15 mai 2026
  🕐 14:30
  ⏱ 30 min
  👤 Marie

Nous vous attendons demain. À bientôt!

[Annuler ce rendez-vous]
```

---

### 6. Cancellation Confirmation Email

**When it's sent:** When customer cancels via email cancellation link

**Recipients:** `booking.clientEmail`

**Subject:** `❌ RDV annulé — {serviceName} le {date}`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  serviceName: "Coupe de cheveux",
  serviceIcon: "✂️",
  date: "2026-05-15",
  time: "14:30"
}
```

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❌ Rendez-vous annulé
  Studio Hair
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour John Doe,
Votre rendez-vous a bien été annulé.

  ✂️ Coupe de cheveux
  📅 Samedi 15 mai 2026
  🕐 14:30

Pour prendre un nouveau rendez-vous, contactez directement Studio Hair.
```

---

### 7. Cancellation Alert (Salon Owner)

**When it's sent:** When customer cancels via email cancellation link

**Recipients:** `ownerEmail` (salon owner)

**Subject:** `⚠️ Annulation RDV — {clientName} ({date} {time})`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  clientEmail: "john@example.com",
  clientPhone: "+41 78 123 4567",    // optional
  serviceName: "Coupe de cheveux",
  serviceIcon: "✂️",
  date: "2026-05-15",
  time: "14:30"
}
```

**Purpose:** Notify salon owner so they can rebook the slot

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Annulation de rendez-vous
  Studio Hair
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un client vient d'annuler son rendez-vous via le lien email.

  Client: John Doe
  Email: john@example.com
  Téléphone: +41 78 123 4567
  Service: ✂️ Coupe de cheveux
  Date: Samedi 15 mai 2026
  Heure: 14:30

Ce créneau est maintenant disponible dans votre agenda.
```

---

### 8. Admin Subscription Alert

**When it's sent:** When new paying salon subscription is created

**Recipients:** `adminEmail` (platform admin)

**Subject:** `💰 Nouveau salon payant — {salonName} ({plan})`

**Required Variables:**
```javascript
{
  adminEmail: "admin@kreno.ch",
  salonName: "Studio Hair",
  ownerEmail: "owner@example.com",
  plan: "pro",                 // starter | pro | premium
  salonId: "507f1f77bcf86cd799439011",
  baseUrl: "https://kreno.ch"
}
```

**Purpose:** Alert admin to new revenue

**Includes:**
- Salon details
- Payment plan
- Link to admin dashboard

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💰 Nouvelle inscription payante!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Salon: Studio Hair
  Email: owner@example.com
  Plan: Pro ⭐
  ID: 507f1f77bcf86cd799439011
  Date: 16/04/2026 10:30

[Voir le dashboard admin →]
```

---

### 9. Employee Booking Notification

**When it's sent:** Immediately when booking is assigned to staff member

**Recipients:** `employeeEmail` (staff member email)

**Subject:** `📅 Nouveau RDV — {clientName} · {serviceName} le {date} à {time}`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  serviceName: "Coupe de cheveux",
  date: "2026-05-15",
  time: "14:30",
  duration: 30,
  clientPhone: "+41 78 123 4567",  // optional
  notes: "Wants fade haircut",      // optional
  salon: {
    name: "Studio Hair",
    branding: {
      primaryColor: "#6366F1"
    }
  }
}
```

**Purpose:** Notify staff member of their bookings

**Includes:**
- Customer name and phone
- Service type and duration
- Special requests/notes
- Link to staff panel

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📅 Nouveau rendez-vous
  Studio Hair
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Client: John Doe
  Prestation: Coupe de cheveux
  Date: Samedi 15 mai 2026 à 14:30
  Durée: 30 min
  Téléphone: +41 78 123 4567
  Notes: Wants fade haircut

[Voir dans le panel →]
```

---

### 10. Review Request Email

**When it's sent:** ~2 hours after appointment end time

**Recipients:** `booking.clientEmail`

**Subject:** `⭐ Comment s'est passé votre visite chez {salonName}?`

**Required Variables:**
```javascript
{
  clientName: "John Doe",
  clientEmail: "john@example.com",
  serviceName: "Coupe de cheveux",
  date: "2026-05-15",
  salon: {
    name: "Studio Hair",
    branding: {
      primaryColor: "#6366F1"
    }
  },
  reviewUrl: "https://kreno.ch/reviews/token123..."
}
```

**Purpose:** Encourage customer to leave review

**Includes:**
- Simple review link
- Service and date reminder
- Call to action: "⭐ Laisser mon avis"

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⭐ Comment s'est passé votre visite?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour John,

Nous espérons que votre rendez-vous chez Studio Hair s'est bien passé.
Votre avis nous aide à améliorer notre service.

  Coupe de cheveux · Samedi 15 mai 2026
  ★★★★★

[⭐ Laisser mon avis]

Cela prend moins de 30 secondes. Merci pour votre confiance!
```

**Known Issue:** See EMAIL_CONFIGURATION.md, section "Known Issues" for sender domain bug

---

### 11. Referral Reward Email

**When it's sent:** When referred salon makes first payment

**Recipients:** `parrainEmail` (referrer email)

**Subject:** `🎁 Votre mois offert est arrivé — Parrainage Kreno`

**Required Variables:**
```javascript
{
  parrainEmail: "referrer@example.com",
  parrainName: "Pierre Dupont",
  filleulSalonName: "Studio Hair"
}
```

**Reward:** 1 month free subscription credit

**Example Output:**
```
╔════════════════════════════════════════╗
║   🎁 Votre mois offert est arrivé!     ║
║   Récompense de parrainage Kreno       ║
╚════════════════════════════════════════╝

Bonjour Pierre,

Excellente nouvelle! Studio Hair vient de souscrire à un
abonnement Kreno grâce à votre code de parrainage.

┌────────────────────────────────────────┐
│   VOTRE RÉCOMPENSE                     │
│   1 mois offert                        │
│   Crédit automatiquement appliqué      │
└────────────────────────────────────────┘

Le crédit a été ajouté directement à votre compte Kreno et sera
déduit automatiquement de votre prochaine facturation.

💡 Continuez à parrainer! Partagez votre code depuis votre
espace Pro → Paramètres → Parrainage.
Chaque filleul qui souscrit vous rapporte 1 mois offert.
```

---

### 12. Payment Failed Email

**When it's sent:** When Stripe payment fails

**Recipients:** `ownerEmail` (salon owner)

**Subject:** `⚠️ Échec de paiement — votre abonnement {salonName}`

**Required Variables:**
```javascript
{
  ownerEmail: "owner@example.com",
  ownerName: "Alice Martin",
  salonName: "Studio Hair",
  proUrl: "https://kreno.ch/pro"
}
```

**Purpose:** Alert owner to payment failure

**Includes:**
- Clear explanation of issue
- Reassurance service is still active
- CTA to update payment method

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Échec du paiement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour Alice,

Nous n'avons pas pu prélever votre abonnement Studio Hair sur Stripe.
Votre compte reste actif pour le moment, mais merci de mettre à jour
votre moyen de paiement pour éviter toute interruption de service.

┌────────────────────────────────────────┐
│ ⏳ Stripe retentera automatiquement     │
│ Sans mise à jour, votre abonnement     │
│ sera suspendu.                         │
└────────────────────────────────────────┘

[Mettre à jour mon paiement →]

Si vous avez des questions, répondez à cet email.
```

---

## Template Customization

### Branding Colors

Most templates use `salon.branding.primaryColor` for:
- Email header background
- CTA button color
- Accent elements

Default: `#6366F1` (Indigo)

**Customization:**
- Owners can set custom color in Pro Portal → Branding
- Color is stored in database as hex value
- Email template automatically uses custom color

### Salon Name

All templates include `salon.name` which can be customized:
- Appears in headers
- Appears in subject lines
- Fallback: "Kreno" if not set

### Domain & URLs

All URLs should use `BASE_URL` environment variable:
```javascript
const baseUrl = process.env.BASE_URL || 'https://kreno.ch';
```

Currently set to: `https://kreno.ch`

---

## Email Localization

All templates are currently in **French** (as per app locale):

- Subject lines: French
- Body copy: French
- Date format: French (e.g., "Samedi 15 mai 2026")
- Day names: French (lundi, mardi, etc.)
- Month names: French (janvier, février, etc.)

**Future Localization:**
If multi-language support is needed:
1. Create separate template functions for each language
2. Store locale preference in `salons.preferences.locale`
3. Route email generation based on locale

---

## Email Sending Flow

### Booking Confirmation
```
Customer books → Validation → sendBookingConfirmation()
→ Email queued (non-blocking) → Response sent to customer
```

### Reminder Email
```
Background job (daily) → Find appointments tomorrow
→ sendReminderEmail() → Email sent at specific time
```

### Other Transactional Emails
```
Trigger event → Validation → sendXxxEmail()
→ Email sent immediately (non-blocking)
```

**Note:** All email sends are async (non-blocking) to prevent request timeout.

---

## Testing Emails Locally

To test email templates locally:

1. **Install Resend CLI:**
   ```bash
   npm install -g resend-cli
   ```

2. **Use test domain:**
   ```javascript
   // In development, emails send to:
   // onboarding@resend.dev (test domain)
   ```

3. **Check test inbox:**
   - Log into Resend dashboard
   - Go to Logs
   - View test emails sent

---

## Troubleshooting Template Issues

### Email content is cut off
- Check email width: should be max-width 560px
- Verify all inline styles are closed properly
- Test in multiple email clients

### Images not loading
- Use absolute URLs (https://example.com/image.png)
- Avoid data URIs (can be too large)
- Compress images before embedding

### Date formatting wrong
- Check `formatDateFR()` function (line 101-108 in email.js)
- Verify date format is YYYY-MM-DD input
- Test with multiple date ranges

### Links not working
- Verify full URLs (https://kreno.ch/...)
- Check URL encoding for special characters
- Test link in actual email client

---

**Last Updated:** 2026-04-16
**Status:** Production Ready
**Translations:** French only (for future expansion)
