/**
 * Input validation utilities for Kreno platform
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const URL_REGEX = /^https?:\/\/.+/;

function validateEmail(email) {
    if (!email || typeof email !== 'string') return { valid: false, error: 'Email requis' };
    if (!EMAIL_REGEX.test(email)) return { valid: false, error: 'Email invalide' };
    return { valid: true };
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return { valid: false, error: 'Mot de passe requis' };
    if (password.length < PASSWORD_MIN_LENGTH) return { valid: false, error: `Mot de passe minimum ${PASSWORD_MIN_LENGTH} caractères` };
    return { valid: true };
}

function validateSalonName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: 'Nom du salon requis' };
    if (name.length < 2) return { valid: false, error: 'Nom du salon minimum 2 caractères' };
    if (name.length > 100) return { valid: false, error: 'Nom du salon maximum 100 caractères' };
    return { valid: true };
}

function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return { valid: false, error: 'Numéro de téléphone requis' };
    // Basic validation: at least 5 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 5) return { valid: false, error: 'Numéro de téléphone invalide' };
    return { valid: true };
}

function validateURL(url) {
    if (!url || typeof url !== 'string') return { valid: false, error: 'URL requise' };
    if (!URL_REGEX.test(url)) return { valid: false, error: 'URL invalide' };
    try {
        new URL(url);
        return { valid: true };
    } catch {
        return { valid: false, error: 'URL invalide' };
    }
}

function validateServiceName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: 'Nom du service requis' };
    if (name.length < 2) return { valid: false, error: 'Nom du service minimum 2 caractères' };
    if (name.length > 100) return { valid: false, error: 'Nom du service maximum 100 caractères' };
    return { valid: true };
}

function validateDuration(duration) {
    const num = Number(duration);
    if (!num || num < 5 || num > 480) return { valid: false, error: 'Durée 5-480 minutes' };
    return { valid: true };
}

function validatePrice(price) {
    const num = Number(price);
    if (isNaN(num) || num < 0 || num > 9999) return { valid: false, error: 'Prix invalide (0-9999)' };
    return { valid: true };
}

function validateWebhookURL(url) {
    if (!validateURL(url).valid) return { valid: false, error: 'URL webhook invalide' };

    // Block private IP ranges
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return { valid: false, error: 'Webhooks locaux non autorisés' };
        }

        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
            return { valid: false, error: 'Webhooks IP privées non autorisés' };
        }

        if (!urlObj.protocol.startsWith('https')) {
            return { valid: false, error: 'Webhooks HTTPS requis' };
        }

        return { valid: true };
    } catch (e) {
        return { valid: false, error: 'URL webhook invalide' };
    }
}

function validateHexColor(color) {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return { valid: false, error: 'Couleur HEX invalide' };
    return { valid: true };
}

module.exports = {
    validateEmail,
    validatePassword,
    validateSalonName,
    validatePhoneNumber,
    validateURL,
    validateServiceName,
    validateDuration,
    validatePrice,
    validateWebhookURL,
    validateHexColor
};
