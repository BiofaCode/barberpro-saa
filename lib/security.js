/**
 * Security utilities for Kreno platform
 * - CORS configuration
 * - Security headers
 * - Rate limiting helpers
 */

// Allowed origins for CORS (set from env or defaults)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://kreno.ch,https://www.kreno.ch,https://admin.kreno.ch,https://pro.kreno.ch,http://localhost:3000,http://localhost:3001').split(',').map(o => o.trim());

/**
 * Get CORS headers for a given origin
 */
function getCORSHeaders(origin) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
    };
}

/**
 * Security headers for all responses
 */
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com"
};

/**
 * Apply security headers to response
 */
function applySecurityHeaders(res) {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
}

/**
 * In-memory rate limiting map
 */
const rateLimitMap = new Map();

/**
 * Rate limiting helper
 * @param {string} ip - Client IP address
 * @param {string} key - Rate limit key (e.g., 'login', 'otp', 'booking')
 * @param {number} maxRequests - Max requests in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} true if rate limited, false if request allowed
 */
function rateLimit(ip, key, maxRequests, windowMs) {
    const now = Date.now();
    const mapKey = `${ip}:${key}`;
    let entry = rateLimitMap.get(mapKey);

    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count++;
    rateLimitMap.set(mapKey, entry);

    return entry.count > maxRequests;
}

/**
 * Cleanup old rate limit entries (run periodically)
 */
function cleanupRateLimitMap() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) {
            rateLimitMap.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired rate limit entries`);
    }
}

/**
 * Get client IP from request
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress ||
           '127.0.0.1';
}

// Cleanup rate limit map every 10 minutes
setInterval(cleanupRateLimitMap, 10 * 60 * 1000);

module.exports = {
    ALLOWED_ORIGINS,
    getCORSHeaders,
    SECURITY_HEADERS,
    applySecurityHeaders,
    rateLimit,
    getClientIP,
    cleanupRateLimitMap
};
