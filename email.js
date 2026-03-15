/* ============================================
   EMAIL - Booking Confirmation Module
   Uses Resend API for transactional emails
   ============================================ */

const { Resend } = require('resend');

// Initialize Resend with the provided API key (from env)
const resend = new Resend(process.env.RESEND_API_KEY);

console.log(`📧 Email configuré via API Resend`);

// Beautiful HTML email template
function buildConfirmationEmail(booking, salon, cancelUrl) {
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'SalonPro';

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

      ${cancelUrl ? `
      <div style="text-align:center;margin:20px 0 0">
        <a href="${cancelUrl}" style="color:#ef4444;font-size:12px;text-decoration:underline">Annuler ce rendez-vous</a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par SalonPro</p>
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
async function sendBookingConfirmation(booking, salon, cancelUrl) {
  const clientEmail = booking.clientEmail;
  if (!clientEmail || !clientEmail.includes('@')) {
    console.log('  ⚠️ Pas d\'email client, confirmation non envoyée');
    return;
  }

  const salonName = salon.name || 'SalonPro';
  const fromName = process.env.SMTP_FROM_NAME || salonName;
  // Resend requires verified domains or the default testing domain for "from"
  // For testing without a verified domain, we can use onboarding@resend.dev
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail], // Resend expects an array for multiple recipients, or string for one. Array is safer.
      subject: `✅ RDV confirmé — ${booking.serviceName} le ${formatDateFR(booking.date)} à ${booking.time}`,
      html: buildConfirmationEmail(booking, salon, cancelUrl),
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
async function sendOTPEmail(email, code, salonName = 'SalonPro') {
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
  const fromName = process.env.SMTP_FROM_NAME || 'SalonPro';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const planNames = { starter: 'Starter', pro: 'Pro', premium: 'Premium' };

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `🎉 Bienvenue sur SalonPro, ${ownerName} !`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <div style="background:#6366F1;padding:32px 28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">✨ Bienvenue sur SalonPro !</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">Votre espace est prêt</p>
    </div>

    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 20px">
        Bonjour <strong>${ownerName}</strong>,<br>
        Votre salon <strong>${salonName}</strong> a été créé avec succès sur le pack <strong>${planNames[plan] || plan}</strong>.
      </p>

      <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e4e4e7;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3f46">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:100px">Email</td>
            <td style="padding:8px 0;font-weight:600">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Mot de passe</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">Celui que vous avez choisi lors de l'inscription</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;border-top:1px solid #e4e4e7">Pack</td>
            <td style="padding:8px 0;font-weight:600;border-top:1px solid #e4e4e7">${planNames[plan] || plan} (essai 14 jours)</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="${baseUrl}/pro" style="display:inline-block;background:#6366F1;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">Accéder à mon Espace Pro →</a>
      </div>

      <p style="font-size:13px;color:#71717a;margin:20px 0 0;line-height:1.6">
        Personnalisez votre salon, ajoutez vos services et commencez à recevoir des réservations en ligne dès aujourd'hui !
      </p>
    </div>

    <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #e4e4e7">
      <p style="font-size:12px;color:#a1a1aa;margin:0">SalonPro — Propulsé par Osmo Digital</p>
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
  const fromName = process.env.SMTP_FROM_NAME || 'SalonPro';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `🔐 Réinitialisation de votre mot de passe — SalonPro`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#6366F1;padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">🔐 Réinitialisation du mot de passe</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:13px">SalonPro — Espace Pro</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#27272a;margin:0 0 16px">
        Bonjour <strong>${ownerName || 'cher utilisateur'}</strong>,
      </p>
      <p style="font-size:14px;color:#52525b;margin:0 0 24px;line-height:1.7">
        Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte SalonPro.<br>
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
      <p style="font-size:12px;color:#a1a1aa;margin:0">SalonPro — Propulsé par Osmo Digital</p>
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
  const fromName = process.env.SMTP_FROM_NAME || salon.name || 'SalonPro';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'SalonPro';
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
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par SalonPro</p>
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
  const fromName = process.env.SMTP_FROM_NAME || salon.name || 'SalonPro';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'SalonPro';
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
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par SalonPro</p>
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
  const fromName = process.env.SMTP_FROM_NAME || 'SalonPro';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const primaryColor = salon.branding?.primaryColor || '#6366F1';
  const salonName = salon.name || 'SalonPro';
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
      <p style="font-size:12px;color:#a1a1aa;margin:0">${salonName} — Propulsé par SalonPro</p>
    </div>
  </div>
</body>
</html>`
    });
    if (error) { console.error('Cancellation alert owner email error:', error.message); return; }
    console.log(`  📧 Alerte annulation envoyée au propriétaire ${ownerEmail}`);
  } catch(e) { console.error('Cancellation alert owner email critical:', e.message); }
}

module.exports = { sendBookingConfirmation, sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail, sendReminderEmail, sendCancellationConfirmation, sendCancellationAlertToOwner };
