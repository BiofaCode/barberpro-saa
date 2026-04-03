/* ============================================
   EMAIL - Booking Confirmation Module
   Uses Resend API for transactional emails
   ============================================ */

const { Resend } = require('resend');

// Initialize Resend with the provided API key (from env)
const resend = new Resend(process.env.RESEND_API_KEY);

console.log(`📧 Email configuré via API Resend`);

// Beautiful HTML email template
function buildConfirmationEmail(booking, salon, cancelUrl, receiptUrl) {
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:${primaryColor};padding:32px 28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">✅ Rendez-vous confirmé</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">${salonName}</p>
    </div>

    <!-- Body -->
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 20px">
        Bonjour <strong>${booking.clientName}</strong>,<br>
        Votre rendez-vous a bien été enregistré. Voici les détails :
      </p>

      <!-- Recap Card -->
      <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e4e4e7">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3f46">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:120px">Service</td>
            <td style="padding:8px 0;font-weight:600">${booking.serviceIcon || '✂️'} ${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Date</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">📅 ${formatDateFR(booking.date)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Heure</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">🕐 ${booking.time}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Durée</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">⏱ ${booking.duration} min</td>
          </tr>
          ${booking.employeeName ? `<tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Avec</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">👤 ${booking.employeeName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:10px 0;color:#71717a;border-top:2px solid #e4e4e7;font-weight:600">Total</td>
            <td style="padding:10px 0;font-weight:700;font-size:16px;border-top:2px solid #e4e4e7;color:${primaryColor}">${booking.price} CHF</td>
          </tr>
        </table>
      </div>

      <!-- Info -->
      ${salon.address || salon.phone ? `
      <div style="margin-top:20px;padding:16px;background:#f0f0ff;border-radius:12px;font-size:13px;color:#3f3f46">
        <strong style="display:block;margin-bottom:8px">📍 Informations pratiques</strong>
        ${salon.address ? `<div style="margin-bottom:4px">${salon.address}</div>` : ''}
        ${salon.phone ? `<div>📞 ${salon.phone}</div>` : ''}
      </div>
      ` : ''}

      <!-- Note -->
      <p style="font-size:13px;color:#71717a;margin:20px 0 0;line-height:1.6">
        Si vous devez modifier votre rendez-vous, veuillez contacter le salon directement.
      </p>

      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
        ${receiptUrl ? `<a href="${receiptUrl}" style="flex:1;min-width:130px;text-align:center;background:${primaryColor};color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600">🧾 Voir le reçu</a>` : ''}
        ${cancelUrl ? `<a href="${cancelUrl}" style="flex:1;min-width:130px;text-align:center;background:#fef2f2;color:#ef4444;padding:12px 16px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #fecaca">Annuler le RDV</a>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par Kreno</p>
    </div>
  </div>
</body>
</html>`;
}

// Format date: 2026-03-15 → "Samedi 15 mars 2026"
function formatDateFR(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
}

// Send confirmation email (non-blocking)
async function sendBookingConfirmation(booking, salon, cancelUrl, receiptUrl) {
  const clientEmail = booking.clientEmail;
  if (!clientEmail || !clientEmail.includes('@')) {
    console.log('  ⚠️ Pas d\'email client, confirmation non envoyée');
    return;
  }

  const salonName = salon.name || 'Kreno';
  const fromName = process.env.SMTP_FROM_NAME || salonName;
  // Resend requires verified domains or the default testing domain for "from"
  // For testing without a verified domain, we can use onboarding@resend.dev
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail], // Resend expects an array for multiple recipients, or string for one. Array is safer.
      subject: `✅ RDV confirmé — ${booking.serviceName} le ${formatDateFR(booking.date)} à ${booking.time}`,
      html: buildConfirmationEmail(booking, salon, cancelUrl, receiptUrl),
    });

    if (error) {
      console.error(`  ❌ Erreur Resend: ${error.message}`);
      return;
    }

    console.log(`  📧 Email de confirmation envoyé à ${clientEmail} (ID: ${data.id})`);
  } catch (err) {
    console.error(`  ❌ Erreur critique email: ${err.message}`);
  }
}

// Send OTP Email for "Mes RDV" access
async function sendOTPEmail(email, code, salonName = 'Kreno') {
  const fromName = process.env.SMTP_FROM_NAME || salonName;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `🔐 Votre code d'accès — ${salonName}`,
      html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eaeaea;border-radius:10px;">
                <h2 style="color:#333;text-align:center;">Code d'Accès</h2>
                <p style="color:#555;font-size:16px;">Voici votre code sécurisé pour accéder à vos rendez-vous sur <strong>${salonName}</strong> :</p>
                <div style="background:#f4f4f5;padding:15px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:4px;border-radius:8px;color:#111;margin:20px 0;">
                    ${code}
                </div>
                <p style="color:#777;font-size:12px;text-align:center;">Ce code expirera dans 10 minutes.<br>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
            </div>
            `,
    });

    if (error) {
      console.error(`  ❌ Erreur Resend (OTP): ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`  📧 OTP envoyé à ${email} (ID: ${data.id})`);
    return { success: true, data };
  } catch (err) {
    console.error(`  ❌ Erreur critique email (OTP): ${err.message}`);
    return { success: false, error: err.message };
  }
}
// Send welcome email after signup
async function sendWelcomeEmail(email, ownerName, salonName, plan, baseUrl) {
  baseUrl = baseUrl || process.env.BASE_URL || 'https://barberpro-saa.onrender.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const planLabel = { starter: 'Starter', pro: 'Pro ⭐', premium: 'Premium 🚀' }[plan] || plan;
  const trialDays = plan === 'starter' ? null : 14;

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `Bienvenue sur Kreno, ${ownerName} — votre espace est prêt`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Kreno</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;padding:0 12px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366F1 0%,#4F46E5 100%);border-radius:16px 16px 0 0;padding:36px 32px;text-align:center">
      <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:12px;padding:8px 16px;margin-bottom:16px">
        <span style="color:#fff;font-size:13px;font-weight:600;letter-spacing:.5px">KRENO</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;line-height:1.3">Votre salon est en ligne 🎉</h1>
      <p style="color:rgba(255,255,255,.8);margin:10px 0 0;font-size:15px">Bienvenue dans la famille Kreno, ${ownerName} !</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">

      <p style="font-size:15px;color:#27272a;margin:0 0 24px;line-height:1.7">
        Bonjour <strong>${ownerName}</strong>,<br>
        <strong>${salonName}</strong> est désormais sur Kreno avec le plan <strong>${planLabel}</strong>${trialDays ? ` — vous bénéficiez de <strong>${trialDays} jours d'essai gratuit</strong>` : ''}.
        Voici tout ce dont vous avez besoin pour démarrer.
      </p>

      <!-- CTA principal -->
      <div style="text-align:center;margin:0 0 32px">
        <a href="${baseUrl}/pro" style="display:inline-block;background:#6366F1;color:#fff;padding:15px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:.2px">
          Accéder à mon espace pro →
        </a>
      </div>

      <!-- Séparateur -->
      <div style="border-top:1px solid #e4e4e7;margin:0 0 24px"></div>

      <!-- Étapes -->
      <p style="font-size:13px;font-weight:700;color:#71717a;letter-spacing:.8px;text-transform:uppercase;margin:0 0 16px">3 étapes pour démarrer</p>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;padding:12px 0;border-bottom:1px solid #f4f4f5;width:40px">
            <div style="width:32px;height:32px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:32px;font-weight:700;color:#6366F1;font-size:14px">1</div>
          </td>
          <td style="vertical-align:top;padding:12px 0 12px 14px;border-bottom:1px solid #f4f4f5">
            <strong style="color:#18181b;font-size:14px;display:block;margin-bottom:3px">Personnalisez votre profil</strong>
            <span style="color:#71717a;font-size:13px">Ajoutez votre logo, couleurs, adresse et horaires d'ouverture.</span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding:12px 0;border-bottom:1px solid #f4f4f5;width:40px">
            <div style="width:32px;height:32px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:32px;font-weight:700;color:#6366F1;font-size:14px">2</div>
          </td>
          <td style="vertical-align:top;padding:12px 0 12px 14px;border-bottom:1px solid #f4f4f5">
            <strong style="color:#18181b;font-size:14px;display:block;margin-bottom:3px">Ajoutez vos services</strong>
            <span style="color:#71717a;font-size:13px">Définissez prix, durées et options de paiement en ligne si souhaité.</span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding:12px 0;width:40px">
            <div style="width:32px;height:32px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:32px;font-weight:700;color:#6366F1;font-size:14px">3</div>
          </td>
          <td style="vertical-align:top;padding:12px 0 12px 14px">
            <strong style="color:#18181b;font-size:14px;display:block;margin-bottom:3px">Partagez votre lien de réservation</strong>
            <span style="color:#71717a;font-size:13px">Copiez votre URL personnalisée et partagez-la sur Instagram, WhatsApp ou votre site.</span>
          </td>
        </tr>
      </table>

      <!-- Séparateur -->
      <div style="border-top:1px solid #e4e4e7;margin:24px 0"></div>

      <!-- Infos accès -->
      <p style="font-size:13px;font-weight:700;color:#71717a;letter-spacing:.8px;text-transform:uppercase;margin:0 0 12px">Vos accès</p>
      <div style="background:#fafafa;border-radius:10px;padding:16px 20px;border:1px solid #e4e4e7;font-size:14px;color:#3f3f46">
        <div style="margin-bottom:8px"><span style="color:#71717a;min-width:80px;display:inline-block">Email</span> <strong>${email}</strong></div>
        <div style="margin-bottom:8px"><span style="color:#71717a;min-width:80px;display:inline-block">Plan</span> <strong>${planLabel}</strong></div>
        <div><span style="color:#71717a;min-width:80px;display:inline-block">Salon</span> <strong>${salonName}</strong></div>
      </div>

      ${trialDays ? `
      <!-- Trial notice -->
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin-top:20px;font-size:13px;color:#92400E">
        <strong>⏳ Essai gratuit de ${trialDays} jours</strong> — aucun paiement requis maintenant.<br>
        Vous pourrez gérer votre abonnement depuis votre espace pro avant la fin de l'essai.
      </div>` : ''}

      <p style="font-size:13px;color:#71717a;margin:24px 0 0;line-height:1.6;text-align:center">
        Une question ? Répondez directement à cet email, nous sommes là pour vous aider.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#fafafa;border-radius:0 0 16px 16px;padding:18px 32px;text-align:center;border:1px solid #e4e4e7;border-top:none">
      <p style="font-size:12px;color:#a1a1aa;margin:0">
        Kreno — La solution de réservation pour les professionnels de la beauté<br>
        <a href="${baseUrl}/saas/cgu.html" style="color:#a1a1aa">CGU</a> · <a href="${baseUrl}/saas/index.html" style="color:#a1a1aa">Site</a>
      </p>
    </div>

  </div>
</body>
</html>`
    });

    if (error) {
      console.error(`  ❌ Erreur Resend (Welcome): ${error.message}`);
      return;
    }
    console.log(`  📧 Email de bienvenue envoyé à ${email} (ID: ${data.id})`);
  } catch (err) {
    console.error(`  ❌ Erreur critique email (Welcome): ${err.message}`);
  }
}

// Send password reset email
async function sendPasswordResetEmail(email, ownerName, resetUrl) {
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `🔐 Réinitialisation de votre mot de passe — Kreno`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#6366F1;padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">🔐 Réinitialisation du mot de passe</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:13px">Kreno — Espace Pro</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 16px">
        Bonjour <strong>${ownerName || 'cher utilisateur'}</strong>,
      </p>
      <p style="font-size:14px;color:#52525b;margin:0 0 24px;line-height:1.7">
        Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte Kreno.<br>
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
          Réinitialiser mon mot de passe →
        </a>
      </div>
      <p style="font-size:12px;color:#a1a1aa;margin:20px 0 0;line-height:1.6;text-align:center">
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.<br>
        Votre mot de passe actuel reste inchangé.
      </p>
      <p style="font-size:11px;color:#d4d4d8;margin:12px 0 0;text-align:center;word-break:break-all">
        Lien : ${resetUrl}
      </p>
    </div>
    <div style="background:#fafafa;padding:14px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">Kreno — Propulsé par Osmo Digital</p>
    </div>
  </div>
</body>
</html>`
    });

    if (error) { console.error(`  ❌ Erreur Resend (reset): ${error.message}`); return { success: false }; }
    console.log(`  📧 Email reset envoyé à ${email} (ID: ${data.id})`);
    return { success: true };
  } catch (err) {
    console.error(`  ❌ Erreur critique email (reset): ${err.message}`);
    return { success: false };
  }
}

async function sendReminderEmail(booking, salon) {
  const fromName = process.env.SMTP_FROM_NAME || salon.name || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';
  const cancelUrl = booking.cancelToken ? `${process.env.BASE_URL || 'https://barberpro-saa.onrender.com'}/cancel/${booking.cancelToken}` : null;
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [booking.clientEmail],
      subject: `⏰ Rappel RDV demain — ${booking.serviceName} à ${booking.time}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:${primaryColor};padding:32px 28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">⏰ Rappel de rendez-vous</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">${salonName}</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 20px">
        Bonjour <strong>${booking.clientName}</strong>,<br>
        Nous vous rappelons votre rendez-vous de <strong>demain</strong> :
      </p>
      <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e4e4e7">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3f46">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:120px">Service</td>
            <td style="padding:8px 0;font-weight:600">${booking.serviceIcon || '✂️'} ${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Date</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">📅 ${formatDateFR(booking.date)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Heure</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">🕐 ${booking.time}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Durée</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">⏱ ${booking.duration} min</td>
          </tr>
          ${booking.employeeName ? `<tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Avec</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">👤 ${booking.employeeName}</td>
          </tr>` : ''}
        </table>
      </div>
      <p style="font-size:13px;color:#71717a;margin:20px 0 0;line-height:1.6">
        Nous vous attendons demain. À bientôt !
      </p>
      ${cancelUrl ? `
      <div style="text-align:center;margin:20px 0 0">
        <a href="${cancelUrl}" style="color:#ef4444;font-size:12px;text-decoration:underline">Annuler ce rendez-vous</a>
      </div>` : ''}
    </div>
    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par Kreno</p>
    </div>
  </div>
</body>
</html>`
    });
    if (error) { console.error('Reminder email error:', error.message); return; }
    console.log(`  📧 Rappel J-1 envoyé à ${booking.clientEmail}`);
  } catch(e) { console.error('Reminder email critical:', e.message); }
}

async function sendCancellationConfirmation(booking, salon) {
  const fromName = process.env.SMTP_FROM_NAME || salon.name || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';
  if (!booking.clientEmail) return;
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [booking.clientEmail],
      subject: `❌ RDV annulé — ${booking.serviceName} le ${formatDateFR(booking.date)}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#ef4444;padding:32px 28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">❌ Rendez-vous annulé</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">${salonName}</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 20px">
        Bonjour <strong>${booking.clientName}</strong>,<br>
        Votre rendez-vous a bien été annulé.
      </p>
      <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e4e4e7">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3f46">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:120px">Service</td>
            <td style="padding:8px 0;font-weight:600">${booking.serviceIcon || '✂️'} ${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Date</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">📅 ${formatDateFR(booking.date)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Heure</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">🕐 ${booking.time}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#71717a;margin:20px 0 0;line-height:1.6">
        Pour prendre un nouveau rendez-vous, contactez directement ${salonName}.
      </p>
    </div>
    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par Kreno</p>
    </div>
  </div>
</body>
</html>`
    });
    if (error) { console.error('Cancellation confirmation email error:', error.message); return; }
    console.log(`  📧 Confirmation annulation envoyée à ${booking.clientEmail}`);
  } catch(e) { console.error('Cancellation confirmation email critical:', e.message); }
}

async function sendCancellationAlertToOwner(booking, salon, ownerEmail) {
  if (!ownerEmail) return;
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [ownerEmail],
      subject: `⚠️ Annulation RDV — ${booking.clientName} (${booking.date} ${booking.time})`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:${primaryColor};padding:32px 28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">⚠️ Annulation de rendez-vous</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">${salonName}</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 20px">
        Un client vient d'annuler son rendez-vous via le lien email.
      </p>
      <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e4e4e7">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3f46">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:120px">Client</td>
            <td style="padding:8px 0;font-weight:600">${booking.clientName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Email</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">${booking.clientEmail}</td>
          </tr>
          ${booking.clientPhone ? `<tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Téléphone</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">${booking.clientPhone}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Service</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">${booking.serviceIcon || '✂️'} ${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Date</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">📅 ${formatDateFR(booking.date)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Heure</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">🕐 ${booking.time}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#71717a;margin:20px 0 0;line-height:1.6">
        Ce créneau est maintenant disponible dans votre agenda.
      </p>
    </div>
    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par Kreno</p>
    </div>
  </div>
</body>
</html>`
    });
    if (error) { console.error('Cancellation alert owner email error:', error.message); return; }
    console.log(`  📧 Alerte annulation envoyée au propriétaire ${ownerEmail}`);
  } catch(e) { console.error('Cancellation alert owner email critical:', e.message); }
}

// Send admin notification when a new paying salon subscribes
async function sendAdminNewSubscriptionEmail(adminEmail, { salonName, ownerEmail, plan, salonId, baseUrl }) {
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const planLabel = { starter: 'Starter', pro: 'Pro ⭐', premium: 'Premium 🚀' }[plan] || plan;
  const adminUrl = (baseUrl || process.env.BASE_URL || 'https://barberpro-saa.onrender.com') + '/admin';
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [adminEmail],
      subject: `💰 Nouveau salon payant — ${salonName} (${planLabel})`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;padding:0 12px">
    <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px 16px 0 0;padding:28px 28px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">💰</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Nouvelle inscription payante !</h1>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e4e4e7;border-top:none">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px;width:120px">Salon</td><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-weight:600;font-size:14px">${salonName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px">Email</td><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px">${ownerEmail}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px">Plan</td><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px"><strong>${planLabel}</strong></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px">ID Salon</td><td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:12px;font-family:monospace">${salonId}</td></tr>
        <tr><td style="padding:10px 0;color:#71717a;font-size:13px">Date</td><td style="padding:10px 0;font-size:14px">${now}</td></tr>
      </table>
      <div style="text-align:center;margin-top:24px">
        <a href="${adminUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Voir le dashboard admin →</a>
      </div>
    </div>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">Kreno — Notification automatique</p>
    </div>
  </div>
</body>
</html>`,
    });
    console.log(`  📧 Notification admin envoyée à ${adminEmail} pour nouveau salon: ${salonName}`);
  } catch (e) {
    console.error('Admin new subscription email error:', e.message);
  }
}

// Notify the assigned employee when a booking is created
async function sendEmployeeBookingNotification(booking, salon, employeeEmail) {
  if (!employeeEmail || !employeeEmail.includes('@')) return;
  const fromName = process.env.SMTP_FROM_NAME || salon.name || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';
  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [employeeEmail],
      subject: `📅 Nouveau RDV — ${booking.clientName} · ${booking.serviceName} le ${formatDateFR(booking.date)} à ${booking.time}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:${primaryColor};padding:28px;text-align:center">
      <div style="font-size:40px;margin-bottom:6px">📅</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Nouveau rendez-vous</h1>
      <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:.9rem">${salonName}</p>
    </div>
    <div style="padding:28px">
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tr><td style="padding:8px 0;color:#6b7280;width:110px">Client</td><td style="padding:8px 0;font-weight:600">${booking.clientName}</td></tr>
        <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Prestation</td><td style="padding:8px 0;font-weight:600">${booking.serviceName || '—'}</td></tr>
        <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Date</td><td style="padding:8px 0;font-weight:600">${formatDateFR(booking.date)} à ${booking.time}</td></tr>
        ${booking.duration ? `<tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Durée</td><td style="padding:8px 0">${booking.duration} min</td></tr>` : ''}
        ${booking.clientPhone ? `<tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Téléphone</td><td style="padding:8px 0">${booking.clientPhone}</td></tr>` : ''}
        ${booking.notes ? `<tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Notes</td><td style="padding:8px 0">${booking.notes}</td></tr>` : ''}
      </table>
      <p style="margin:20px 0 0;text-align:center"><a href="${process.env.BASE_URL || 'https://barberpro-saa.onrender.com'}/pro" style="background:${primaryColor};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">Voir dans le panel</a></p>
    </div>
  </div>
</body></html>`,
    });
    console.log(`  📧 Notification employé envoyée à ${employeeEmail}`);
  } catch (e) {
    console.error('Employee booking notification error:', e.message);
  }
}

// Generic email sender — used for transactional/internal emails (e.g. contact form)
async function sendEmail({ to, subject, html }) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@kreno.ch';
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  try {
    await resend.emails.send({ from: `${fromName} <${fromEmail}>`, to, subject, html });
  } catch (e) {
    console.error('sendEmail error:', e.message);
    throw e;
  }
}

module.exports = { sendBookingConfirmation, sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail, sendReminderEmail, sendCancellationConfirmation, sendCancellationAlertToOwner, sendAdminNewSubscriptionEmail, sendReviewRequestEmail, sendEmployeeBookingNotification, sendReferralRewardEmail, sendPaymentFailedEmail, sendEmail };

// ---- Referral reward email (sent to parrain when filleul pays first month) ----
async function sendReferralRewardEmail(parrainEmail, parrainName, filleulSalonName) {
  const firstName = parrainName?.split(' ')[0] || 'cher partenaire';
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bonne nouvelle — Kreno</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:36px 32px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🎁</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Votre mois offert est arrivé !</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">Récompense de parrainage Kreno</p>
    </div>
    <div style="padding:32px 28px">
      <p style="margin:0 0 16px;font-size:16px;color:#374151">Bonjour <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6">
        Excellente nouvelle ! <strong>${filleulSalonName}</strong> vient de souscrire à un abonnement Kreno grâce à votre code de parrainage.
      </p>
      <div style="background:linear-gradient(135deg,rgba(79,70,229,.08),rgba(124,58,237,.08));border:1px solid rgba(79,70,229,.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
        <div style="font-size:13px;color:#6b7280;margin-bottom:4px;font-weight:500">VOTRE RÉCOMPENSE</div>
        <div style="font-size:28px;font-weight:700;color:#4F46E5">1 mois offert</div>
        <div style="font-size:13px;color:#9ca3af;margin-top:4px">Crédit automatiquement appliqué à votre prochaine facture</div>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Le crédit a été ajouté directement à votre compte Kreno et sera déduit automatiquement de votre prochaine facturation. Aucune action de votre part n'est nécessaire.
      </p>
      <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
          💡 <strong>Continuez à parrainer !</strong> Partagez votre code de parrainage depuis votre espace Pro → Paramètres → Parrainage. Chaque filleul qui souscrit vous rapporte 1 mois offert.
        </p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#9ca3af;font-size:12px">Kreno — Notification automatique</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: `${fromName} <noreply@kreno.ch>`,
      to: parrainEmail,
      subject: `🎁 Votre mois offert est arrivé — Parrainage Kreno`,
      html,
    });
    console.log(`  🎁 Email récompense parrainage envoyé à ${parrainEmail}`);
  } catch (e) {
    console.error('Referral reward email error:', e.message);
  }
}

// ---- Payment failed email (sent to owner when Stripe can't charge) ----
async function sendPaymentFailedEmail(ownerEmail, ownerName, salonName, proUrl) {
  const firstName = ownerName?.split(' ')[0] || 'cher client';
  const fromName = process.env.SMTP_FROM_NAME || 'Kreno';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;padding:0 12px">
    <div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:16px 16px 0 0;padding:28px 28px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">⚠️</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Échec du paiement</h1>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e4e4e7;border-top:none">
      <p style="margin:0 0 16px;font-size:16px;color:#374151">Bonjour <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6">
        Nous n'avons pas pu prélever votre abonnement <strong>${salonName}</strong> sur Stripe.
        Votre compte reste actif pour le moment, mais merci de mettre à jour votre moyen de paiement
        pour éviter toute interruption de service.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600">
          ⏳ Stripe retentera automatiquement le prélèvement dans les prochains jours.
          Sans mise à jour, votre abonnement sera suspendu.
        </p>
      </div>
      <div style="text-align:center">
        <a href="${proUrl}/settings" style="display:inline-block;background:#6366F1;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Mettre à jour mon paiement →
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">Kreno — Si vous avez des questions, répondez à cet email.</p>
    </div>
  </div>
</body>
</html>`;
  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [ownerEmail],
      subject: `⚠️ Échec de paiement — votre abonnement ${salonName}`,
      html,
    });
    console.log(`  ⚠️ Email échec paiement envoyé à ${ownerEmail} pour ${salonName}`);
  } catch (e) {
    console.error('Payment failed email error:', e.message);
  }
}

// ---- Review request email (sent ~2h after appointment) ----
async function sendReviewRequestEmail(booking, salon, reviewUrl) {
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'Kreno';
  const clientName = booking.clientName?.split(' ')[0] || 'cher client';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:${primaryColor};padding:32px 28px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">⭐</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Comment s'est passé votre visite ?</h1>
    </div>
    <div style="padding:32px 28px">
      <p style="margin:0 0 16px;font-size:16px;color:#374151">Bonjour <strong>${clientName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6">
        Nous espérons que votre rendez-vous chez <strong>${salonName}</strong> s'est bien passé.<br>
        Votre avis nous aide à améliorer notre service et à aider d'autres clients à nous trouver.
      </p>
      <div style="background:#fafafa;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
        <div style="font-size:13px;color:#9ca3af;margin-bottom:4px">${booking.serviceName || 'Prestation'} · ${booking.date || ''}</div>
        <div style="font-size:32px;letter-spacing:4px;color:#f59e0b">★★★★★</div>
      </div>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${reviewUrl}" style="display:inline-block;background:${primaryColor};color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700">
          ⭐ Laisser mon avis
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">
        Cela prend moins de 30 secondes. Merci pour votre confiance !
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">${salonName}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || `${salonName} <noreply@barberpro.ch>`,
      to: booking.clientEmail,
      subject: `⭐ Comment s'est passé votre visite chez ${salonName} ?`,
      html,
    });
    console.log(`  ⭐ Email avis envoyé à ${booking.clientEmail}`);
  } catch (e) {
    console.error('Review request email error:', e.message);
  }
}
