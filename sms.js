/* ============================================
   Kreno — SMS Module (Twilio)
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

// ---- Sender ----
// With TWILIO_ALPHA_SENDER=true the client sees the salon's name instead of a
// phone number (alphanumeric sender ID: Switzerland supports it without
// registration, same price, but the client cannot reply). Only used for Swiss
// and Liechtenstein numbers; other countries keep TWILIO_PHONE_NUMBER.
// Twilio rules: 1-11 chars, A-Z a-z 0-9 and space, at least one letter.
const SENDER_MAX = 11;
function smsSenderName(name) {
    const clean = String(name || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/['’‘`]/g, '')
        .replace(/[^A-Za-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
    let out = clean;
    if (out.length > SENDER_MAX) {
        const cut = out.slice(0, SENDER_MAX + 1).lastIndexOf(' ');
        out = (cut > 0 ? out.slice(0, cut) : out.slice(0, SENDER_MAX)).trim();
    }
    return /[A-Za-z]/.test(out) ? out : '';
}
function senderFor(phone, salon) {
    const number = process.env.TWILIO_PHONE_NUMBER || '';
    const alphaOk = process.env.TWILIO_ALPHA_SENDER === 'true' && /^\+(41|423)/.test(phone);
    if (!alphaOk) return { from: number, fallback: '' };
    const name = salon ? (smsSenderName(salon.smsSettings?.senderName) || smsSenderName(salon.name)) : '';
    return { from: name || 'Kreno', fallback: number };
}

// ---- Packs de crédits SMS ----
// Twilio CH ≈ 0.0725 USD (~0.07 CHF) per SMS + Stripe ~2.9% + 0.30 CHF per
// purchase: >= 0.10 CHF/SMS keeps a margin even if the USD rises ~30%.
// 1 credit = 1 SMS, and every template fits in one GSM-7 segment.
const SMS_PACKS = {
    starter:  { credits: 100, priceChf: 12, label: 'Pack 100 SMS' },
    pro:      { credits: 300, priceChf: 33, label: 'Pack 300 SMS' },
    max:      { credits: 600, priceChf: 60, label: 'Pack 600 SMS' },
};

// ---- GSM-7 ----
// One emoji or one character outside the GSM-7 alphabet (â, ê, ô, û, ç, À,
// curly quotes...) switches the whole SMS to UCS-2: 70 chars per segment
// instead of 160, so a ~130-char reminder is billed as 2 SMS by Twilio while
// only 1 credit is charged to the salon. Keep every SMS GSM-7 and <= 160.
const GSM7 = new Set(('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà').split(''));
const GSM7_REPLACE = { '’': "'", '‘': "'", '“': '"', '”': '"', '«': '"', '»': '"', '–': '-', '—': '-', '·': '-', '…': '...', 'ç': 'c', 'À': 'A', '\u00a0': ' ' };
function toGSM7(text) {
    return [...String(text)].map(c => {
        if (GSM7.has(c)) return c;
        if (GSM7_REPLACE[c] !== undefined) return GSM7_REPLACE[c];
        const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return [...base].every(b => GSM7.has(b)) ? base : '';   // emojis & co. are dropped
    }).join('').replace(/ {2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}
const SMS_MAX = 160;
// Optional lines (address...) are only kept while the SMS fits in one segment.
function buildSMS(required, optional = []) {
    let body = toGSM7(required.filter(Boolean).join('\n'));
    for (const line of optional.filter(Boolean)) {
        const withLine = toGSM7(body + '\n' + line);
        if (withLine.length <= SMS_MAX) body = withLine;
    }
    return body;
}

// ---- Base send function ----
// `salon` sets the sender name (null = "Kreno", e.g. for the owner's alert).
async function sendSMS(to, body, salon = null) {
    if (process.env.TWILIO_TEST_MODE === 'true') {
        console.log(`  [TEST] SMS skipped → ${to}: ${body.substring(0, 60)}`);
        return { success: true, test: true };
    }
    const client = getTwilioClient();
    if (!client) {
        console.warn(`  ⚠️ SMS non envoyé (Twilio non configuré): ${to}`);
        return { success: false, reason: 'not_configured' };
    }

    // Clean phone number — ensure international format
    let phone = to.replace(/\s/g, '');
    if (phone.startsWith('00')) phone = '+' + phone.slice(2);
    else if (phone.startsWith('0')) phone = '+41' + phone.slice(1); // Swiss local format
    else if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

    const { from, fallback } = senderFor(phone, salon);
    if (!from) {
        console.warn('  ⚠️ TWILIO_PHONE_NUMBER manquant');
        return { success: false, reason: 'no_from' };
    }

    const text = toGSM7(body);
    try {
        let msg;
        try {
            msg = await client.messages.create({ from, to: phone, body: text });
        } catch (e) {
            // Alphanumeric sender refused (not enabled on the account, carrier
            // rule...): send it from the Twilio number instead of losing the SMS.
            if (!fallback) throw e;
            console.warn(`  ⚠️ Expéditeur "${from}" refusé (${e.code || e.message}), envoi depuis le numéro`);
            msg = await client.messages.create({ from: fallback, to: phone, body: text });
        }
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
    const body = buildSMS([
        `RDV confirmé chez ${salon.name || 'Kreno'}`,
        `${formatDateFR(booking.date)} à ${booking.time} - ${booking.serviceName}`,
    ], [salon.address, 'À bientôt !']);
    return sendSMS(booking.clientPhone, body, salon);
}

// ---- SMS Rappel J-1 ----
async function sendSMSReminder(booking, salon, { sameDay = false } = {}) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const body = buildSMS([
        `Rappel : RDV ${sameDay ? "aujourd'hui" : 'demain'} chez ${salon.name || 'Kreno'}`,
        `${booking.time} - ${booking.serviceName}`,
    ], [salon.address, sameDay ? 'À tout à l\'heure !' : 'À demain !']);
    return sendSMS(booking.clientPhone, body, salon);
}

// ---- SMS Annulation ----
async function sendSMSCancellation(booking, salon) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const body = buildSMS([
        `Votre RDV du ${formatDateFR(booking.date)} à ${booking.time} chez ${salon.name || 'Kreno'} a été annulé.`,
    ], [salon.phone ? `Pour re-planifier : ${salon.phone}` : 'Contactez-nous pour re-planifier.']);
    return sendSMS(booking.clientPhone, body, salon);
}

// ---- SMS Reprogrammation (booking porte la NOUVELLE date/heure) ----
async function sendSMSReschedule(booking, salon) {
    if (!booking.clientPhone) return { success: false, reason: 'no_phone' };
    const body = buildSMS([
        `RDV déplacé chez ${salon.name || 'Kreno'}`,
        `Nouvelle date : ${formatDateFR(booking.date)} à ${booking.time} - ${booking.serviceName}`,
    ], [salon.address, 'À bientôt !']);
    return sendSMS(booking.clientPhone, body, salon);
}

// ---- SMS Notification propriétaire nouveau RDV ----
async function sendSMSOwnerNotification(booking, salon, ownerPhone) {
    if (!ownerPhone) return { success: false, reason: 'no_phone' };
    const body = buildSMS([
        `Nouveau RDV - ${booking.clientName}`,
        `${booking.serviceName} - ${formatDateFR(booking.date)} à ${booking.time}`,
    ], [booking.clientPhone]);
    return sendSMS(ownerPhone, body);
}

module.exports = { toGSM7, buildSMS, smsSenderName, sendSMSConfirmation, sendSMSReminder, sendSMSCancellation, sendSMSReschedule, sendSMSOwnerNotification, SMS_PACKS };
