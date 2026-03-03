/* ============================================
   EMAIL - Booking Confirmation Module
   Uses Nodemailer with configurable SMTP
   ============================================ */

const nodemailer = require('nodemailer');

// Create transporter from environment variables
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.log('⚠️  Email non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS manquants)');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    console.log(`📧 Email configuré: ${user} via ${host}:${port}`);
    return transporter;
}

// Beautiful HTML email template
function buildConfirmationEmail(booking, salon) {
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
        Si vous devez annuler ou modifier votre rendez-vous, veuillez contacter le salon directement.
      </p>
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
async function sendBookingConfirmation(booking, salon) {
    const t = getTransporter();
    if (!t) return; // Email not configured, skip silently

    const clientEmail = booking.clientEmail;
    if (!clientEmail || !clientEmail.includes('@')) {
        console.log('  ⚠️ Pas d\'email client, confirmation non envoyée');
        return;
    }

    const salonName = salon.name || 'SalonPro';
    const fromName = process.env.SMTP_FROM_NAME || salonName;
    const fromEmail = process.env.SMTP_USER;

    try {
        await t.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: clientEmail,
            subject: `✅ RDV confirmé — ${booking.serviceName} le ${formatDateFR(booking.date)} à ${booking.time}`,
            html: buildConfirmationEmail(booking, salon),
        });
        console.log(`  📧 Email de confirmation envoyé à ${clientEmail}`);
    } catch (err) {
        console.error(`  ❌ Erreur email: ${err.message}`);
    }
}

module.exports = { sendBookingConfirmation };
