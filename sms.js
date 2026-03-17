/* ============================================
   SalonPro — SMS Module (Twilio)
   Système de crédits prépayés
   ============================================ */

let twilioClient = null;

function getTwilioClient() {
    if (twilioClient) return twilioClient;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const twilio = require('twilio');
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('📱 Twilio SMS configuré');
    }
    return twilioClient;
}

const FROM = process.env.TWILIO_PHONE_NUMBER || '';

// ---- Packs de crédits SMS ----
const SMS_PACKS = {
    starter:  { credits: 50,  priceChf: 5,  label: 'Pack Starter' },
    pro:      { credits: 100, priceChf: 9,  label: 'Pack Pro' },
    max:      { credits: 250, priceChf: 19, label: 'Pack Max' },
};

// ---- Base send function ----
async function sendSMS(to, body) {
    const client = getTwilioClient();
    if (!client) {
        console.warn(`  ⚠️ SMS non envoyé (Twilio non configuré): ${to}`);
        return { success: false, reason: 'not_configured' };
    }
    if (!FROM) {
        console.warn('  ⚠️ TWILIO_PHONE_NUMBER manquant');
        return { success: false, reason: 'no_from' };
    }

    // Clean phone number — ensure international format
    const phone = to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`;

    try {
        const msg = await client.messages.create({ from: FROM, to: phone, body });
        console.log(`  📱 SMS envoyé à ${phone} (SID: ${msg.sid})`);
        return { success: true, sid: msg.sid };
    } catch (e) {
        console.error(`  ❌ SMS error: ${e.message}`);
        return { success: false, error: e.message };
    }
}

// ---- Format date FR ----
function formatDateFR(dateStr) {
    try {
        const d = new Date(dateStr + 'T12:00:00');
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
    } catch { return dateStr; }
}

// ---- SMS Confirmation de RDV ----
async function sendSMSConfirmation(booking, salon) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const salonName = salon.name || 'SalonPro';
    const body =
        `✅ RDV confirmé chez ${salonName}\n` +
        `📅 ${formatDateFR(booking.date)} à ${booking.time}\n` +
        `✂️ ${booking.serviceName}` +
        (salon.address ? `\n📍 ${salon.address}` : '') +
        `\nÀ bientôt !`;
    return sendSMS(booking.clientPhone, body);
}

// ---- SMS Rappel J-1 ----
async function sendSMSReminder(booking, salon) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const salonName = salon.name || 'SalonPro';
    const body =
        `⏰ Rappel — Votre RDV demain chez ${salonName}\n` +
        `🕐 ${booking.time} · ${booking.serviceName}` +
        (salon.address ? `\n📍 ${salon.address}` : '') +
        `\nÀ demain !`;
    return sendSMS(booking.clientPhone, body);
}

// ---- SMS Annulation ----
async function sendSMSCancellation(booking, salon) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const salonName = salon.name || 'SalonPro';
    const body =
        `❌ Votre RDV du ${formatDateFR(booking.date)} à ${booking.time} ` +
        `chez ${salonName} a été annulé.\n` +
        `Contactez-nous pour re-planifier.`;
    return sendSMS(booking.clientPhone, body);
}

// ---- SMS Notification propriétaire nouveau RDV ----
async function sendSMSOwnerNotification(booking, salon, ownerPhone) {
    if (!ownerPhone) return { success: false, reason: 'no_phone' };
    const body =
        `📅 Nouveau RDV — ${salon.name || 'SalonPro'}\n` +
        `👤 ${booking.clientName}\n` +
        `✂️ ${booking.serviceName} · ${formatDateFR(booking.date)} à ${booking.time}` +
        (booking.clientPhone ? `\n📞 ${booking.clientPhone}` : '');
    return sendSMS(ownerPhone, body);
}

module.exports = { sendSMSConfirmation, sendSMSReminder, sendSMSCancellation, sendSMSOwnerNotification, SMS_PACKS };
