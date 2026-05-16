/* ============================================
   Push Notifications - Firebase Cloud Messaging
   ============================================
   Sends push notifications to the Kreno mobile app via FCM.

   Configuration:
   - FIREBASE_SERVICE_ACCOUNT_JSON env var = full JSON content of the service
     account key downloaded from Firebase Console → Project Settings →
     Service Accounts → Generate new private key.
   - If the env var is unset/invalid, this module no-ops (useful for local dev
     without Firebase configured).
*/

const db = require('./db');

let admin = null;
let messaging = null;
let initialized = false;
let initFailed = false;

function init() {
    if (initialized || initFailed) return;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        console.log('📵 Push notifications disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)');
        initFailed = true;
        return;
    }
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(raw);
    } catch (err) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err.message);
        initFailed = true;
        return;
    }
    try {
        admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        messaging = admin.messaging();
        initialized = true;
        console.log('🔔 Firebase Cloud Messaging initialized');
    } catch (err) {
        console.error('❌ Firebase Admin SDK init failed:', err.message);
        initFailed = true;
    }
}

// Send a push to a list of FCM tokens. No-op if FCM unconfigured.
// Cleans up invalid tokens (UNREGISTERED, INVALID_ARGUMENT) from the DB.
async function sendPush(tokens, { title, body, data = {} }) {
    init();
    if (!initialized || !messaging) return { sent: 0, removed: 0 };
    if (!tokens || !tokens.length) return { sent: 0, removed: 0 };

    // FCM HTTP v1 sendEach handles up to 500 tokens per call.
    const messages = tokens.map(t => ({
        token: t,
        notification: { title, body },
        // Always stringify data — FCM requires string values.
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
        },
        android: {
            priority: 'high',
            notification: { sound: 'default' },
        },
    }));

    let response;
    try {
        response = await messaging.sendEach(messages);
    } catch (err) {
        console.error('❌ FCM sendEach failed:', err.message);
        return { sent: 0, removed: 0 };
    }

    const invalid = [];
    response.responses.forEach((r, i) => {
        if (!r.success && r.error) {
            const code = r.error.code || '';
            // These error codes mean the token is no longer valid — drop it.
            if (code.includes('registration-token-not-registered') ||
                code.includes('invalid-argument') ||
                code.includes('invalid-registration-token')) {
                invalid.push(tokens[i]);
            }
        }
    });
    if (invalid.length) {
        await db.removePushTokensByValues(invalid);
        console.log(`🧹 Removed ${invalid.length} invalid push tokens`);
    }
    return { sent: response.successCount, removed: invalid.length };
}

// Convenience: send to all owners + employees of a salon.
async function sendToSalon(salonId, payload) {
    const docs = await db.findPushTokensBySalon(salonId);
    const tokens = docs.map(d => d.token);
    return sendPush(tokens, payload);
}

module.exports = { init, sendPush, sendToSalon };
