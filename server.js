/* ============================================
   BARBER PRO - SaaS Platform Server v2.0
   JSON DB (dev) → MongoDB (prod)
   ============================================ */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { sendBookingConfirmation, sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail, sendReminderEmail, sendCancellationConfirmation, sendCancellationAlertToOwner, sendAdminNewSubscriptionEmail, sendReviewRequestEmail, sendEmployeeBookingNotification } = require('./email');
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');
const { sendSMSConfirmation, sendSMSReminder, sendSMSCancellation, sendSMSOwnerNotification, SMS_PACKS } = require('./sms');

// Configure Web Push (VAPID)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL || 'info@osmodigital.ch'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('🔔 Web Push (VAPID) configuré');
} else {
    console.warn('⚠️ VAPID keys manquantes — push notifications désactivées');
}

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
    console.log('☁️ Cloudinary configuré via CLOUDINARY_URL');
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log(`☁️ Cloudinary configuré pour le cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
    console.log('⚠️ Cloudinary non configuré (les images seront stockées localement et perdues au redémarrage)');
}

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'barberpro_dev_secret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'barberpro_dev_secret') {
    console.error('🚨 CRITICAL: JWT_SECRET is using the default dev value in production! Set JWT_SECRET env variable.');
    process.exit(1);
}
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- Helpers ----
function slugify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'salon';
}

async function makeUniqueSlug(name) {
    const base = slugify(name);
    let slug = base;
    let i = 2;
    while (await db.findSalonBySlug(slug)) {
        slug = `${base}-${i}`;
        i++;
    }
    return slug;
}

function json(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(JSON.stringify(data));
}

const MAX_BODY_SIZE = 512 * 1024; // 512 KB
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', c => {
            size += c.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                return reject(new Error('Request body too large'));
            }
            body += c;
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return resolve({ fields: {}, fileBuffer: null, fileExt: null });

        const boundary = boundaryMatch[1];
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const parts = buffer.toString('binary').split('--' + boundary).slice(1, -1);
                const fields = {};
                let fileBuffer = null;
                let fileExt = null;

                for (const part of parts) {
                    const headerEnd = part.indexOf('\r\n\r\n');
                    if (headerEnd === -1) continue;
                    const headers = part.substring(0, headerEnd);
                    const body = part.substring(headerEnd + 4).replace(/\r\n$/, '');

                    const nameMatch = headers.match(/name="([^"]+)"/);
                    const filenameMatch = headers.match(/filename="([^"]+)"/);

                    if (filenameMatch && nameMatch) {
                        fileExt = (path.extname(filenameMatch[1]) || '.jpg').toLowerCase();
                        fileBuffer = Buffer.from(body, 'binary');
                    } else if (nameMatch) {
                        fields[nameMatch[1]] = body.trim();
                    }
                }
                resolve({ fields, fileBuffer, fileExt });
            } catch (e) {
                console.error('Multipart parse error:', e.message);
                resolve({ fields: {}, fileBuffer: null, fileExt: null });
            }
        });
        req.on('error', () => resolve({ fields: {}, fileBuffer: null, fileExt: null }));
    });
}

// Upload buffer to Cloudinary (or fallback to local if not configured)
async function uploadImageBuffer(buffer, ext, folder = 'barbershop') {
    return new Promise((resolve, reject) => {
        if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
            // Local fallback
            const fileName = `${folder}_${crypto.randomBytes(8).toString('hex')}${ext}`;
            const dest = path.join(UPLOAD_DIR, fileName);
            fs.writeFileSync(dest, buffer);
            return resolve(`/uploads/${fileName}`);
        }

        // Cloudinary upload
        try {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: `salonpro/${folder}` },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return reject(error);
                    }
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        } catch (err) {
            console.error('Cloudinary stream error:', err);
            reject(err);
        }
    });
}

function createToken(payload, expiresInDays = 30) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: Date.now(),
        exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

// Check that the authenticated user owns (or has access to) the given salon
function verifySalonAccess(req, salonId) {
    const user = verifyToken(req);
    if (!user) return null;
    // Superadmin has access to all salons
    if (user.role === 'superadmin') return user;
    // Owners and employees must belong to the same salon
    if (String(user.salonId) === String(salonId)) return user;
    return null;
}

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        // Verify signature
        const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
        if (sig !== parts[2]) return null;
        // Check expiration (only enforced if exp is present — legacy tokens without exp still work)
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch { return null; }
}

// ---- Rate Limiter (in-memory) ----
const rateLimitMap = new Map();
function rateLimit(ip, key, maxRequests, windowMs) {
    const now = Date.now();
    const mapKey = `${ip}:${key}`;
    const entry = rateLimitMap.get(mapKey) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count++;
    rateLimitMap.set(mapKey, entry);
    return entry.count > maxRequests;
}
// Clean up old rate limit entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitMap) { if (now > v.resetAt) rateLimitMap.delete(k); }
}, 10 * 60 * 1000);

// ---- Password Reset Tokens (in-memory, 1h TTL) ----
const resetTokens = new Map(); // token → { ownerId, email, expiry }
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of resetTokens) { if (now > v.expiry) resetTokens.delete(k); }
}, 30 * 60 * 1000);

// ---- Pending payment cleanup: cancel stale bookings after 30 min ----
async function cancelStalePendingPayments() {
    try {
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const stale = await db.findBookings({ status: 'pending', paymentStatus: 'pending_payment' });
        let count = 0;
        for (const b of stale) {
            if (b.createdAt && b.createdAt < cutoff) {
                await db.updateBooking(b._id, { status: 'cancelled', paymentStatus: 'failed' });
                count++;
            }
        }
        if (count > 0) console.log(`🗑 ${count} RDV en attente de paiement annulés (timeout 30 min)`);
    } catch (e) { console.error('Pending cleanup error:', e.message); }
}
setInterval(cancelStalePendingPayments, 10 * 60 * 1000); // every 10 min
setTimeout(cancelStalePendingPayments, 60000); // once at startup after 1 min

// ---- Reminder Cron: run every hour ----
async function sendPendingReminders() {
    // Only send reminders between 08:00 and 20:00 to avoid waking clients at night
    const currentHour = new Date().getHours();
    if (currentHour < 8 || currentHour >= 20) return;

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const bookings = await db.findBookings({ date: tomorrowStr, status: 'confirmed', reminderSent: { $ne: true } });
        for (const booking of bookings) {
            const salon = await db.findSalonById(booking.salon);
            if (!salon) continue;
            // Email reminder
            if (booking.clientEmail) sendReminderEmail(booking, salon);
            // SMS reminder (if phone + credits + toggle on)
            const smsOk = salon.smsSettings?.clientReminder !== false;
            if (smsOk && booking.clientPhone && (salon.smsCredits || 0) > 0) {
                sendSMSReminder(booking, salon).then(result => {
                    if (result.success) db.updateSalon(salon._id, { smsCredits: Math.max(0, (salon.smsCredits || 0) - 1) });
                });
            }
            await db.updateBooking(booking._id, { reminderSent: true });
        }
        if (bookings.length > 0) console.log(`⏰ Rappels J-1 envoyés: ${bookings.length} RDV (email + SMS si crédits)`);
    } catch(e) { console.error('Reminder cron error:', e.message); }
}
setInterval(sendPendingReminders, 60 * 60 * 1000);
// Run once at startup after a short delay
setTimeout(sendPendingReminders, 30000);

// ---- Review request cron: send ~2h after appointment ends ----
async function sendPendingReviewRequests() {
    const currentHour = new Date().getHours();
    if (currentHour < 10 || currentHour >= 21) return; // only during reasonable hours
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now - 86400000).toISOString().split('T')[0];
        // Check today + yesterday to catch late evening appointments
        const bookings = await db.findBookings({
            date: { $in: [todayStr, yesterdayStr] },
            status: 'confirmed',
            reviewed: { $ne: true },
            reviewEmailSent: { $ne: true },
        });
        const baseUrl = `${process.env.BASE_URL || 'https://barberpro-saa.onrender.com'}`;
        let sent = 0;
        for (const booking of bookings) {
            if (!booking.clientEmail || !booking.time) continue;
            // Parse appointment datetime
            const [hh, mm] = (booking.time || '00:00').split(':').map(Number);
            const apptStart = new Date(`${booking.date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`);
            const apptEnd = new Date(apptStart.getTime() + (booking.duration || 30) * 60000);
            const twoHoursAfter = new Date(apptEnd.getTime() + 2 * 3600000);
            if (now < twoHoursAfter) continue; // appointment not done + 2h yet
            const salon = await db.findSalonById(booking.salon);
            if (!salon) continue;
            const reviewUrl = `${baseUrl}/review/${booking._id}`;
            await sendReviewRequestEmail(booking, salon, reviewUrl);
            await db.updateBooking(booking._id, { reviewEmailSent: true });
            sent++;
        }
        if (sent > 0) console.log(`⭐ Emails demande d'avis envoyés: ${sent}`);
    } catch (e) { console.error('Review request cron error:', e.message); }
}
setInterval(sendPendingReviewRequests, 60 * 60 * 1000); // every hour
setTimeout(sendPendingReviewRequests, 90000); // startup check after 1.5 min

// ---- Booking conflict helpers ----
function timeToMinutes(t) {
    if (!t || typeof t !== 'string') return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

async function hasConflict(salonId, employeeId, date, time, duration, excludeId = null) {
    if (!date || !time) return false;
    const existing = await db.findBookings({ salon: salonId, date, status: { $in: ['confirmed', 'pending'] } });
    const start = timeToMinutes(time);
    const end = start + (duration || 30);
    for (const b of existing) {
        if (excludeId && b._id === excludeId) continue;
        // Skip if both have different specific employees assigned
        if (employeeId && b.employeeId && String(employeeId) !== String(b.employeeId)) continue;
        const bStart = timeToMinutes(b.time);
        const bEnd = bStart + (b.duration || 30);
        if (start < bEnd && end > bStart) return true;
    }
    // Also check blocks
    const blocks = await db.findBlocks({ salonId, date });
    for (const bl of blocks) {
        if (employeeId && bl.employeeId && String(employeeId) !== String(bl.employeeId)) continue;
        const bStart = timeToMinutes(bl.startTime);
        const bEnd = timeToMinutes(bl.endTime);
        if (start < bEnd && end > bStart) return true;
    }
    return false;
}

// ---- Routing ----
const routes = [];
function route(method, pattern, handler) {
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    routes.push({ method, regex, handler });
}

// ==========================
//  SUPER ADMIN API
// ==========================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminPro2026';
if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'adminPro2026') {
    console.warn('⚠️  WARNING: ADMIN_PASSWORD is using the default value in production! Set ADMIN_PASSWORD env variable.');
}

route('POST', '/api/admin/login', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimit(ip, 'admin_login', 10, 15 * 60 * 1000)) { // 10 attempts per 15 min per IP
        return json(res, 429, { success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
    }
    const body = await parseBody(req);
    if (!body.password || body.password !== ADMIN_PASSWORD) {
        return json(res, 401, { success: false, error: 'Mot de passe incorrect' });
    }
    const token = createToken({ role: 'superadmin' });
    json(res, 200, { success: true, token });
});

route('GET', '/api/health', async (req, res) => {
    json(res, 200, { status: 'ok', ts: Date.now() });
});

route('GET', '/robots.txt', async (req, res) => {
    const file = path.join(__dirname, 'robots.txt');
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(data);
    });
});

// Dynamic sitemap.xml — generated from active salons in DB
route('GET', '/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
        const salons = await db.findSalons({ active: true });
        const now = new Date().toISOString().split('T')[0];

        const staticUrls = [
            `<url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
            `<url><loc>${baseUrl}/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
        ];

        const salonUrls = salons.map(s =>
            `<url><loc>${baseUrl}/s/${s.slug}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        );

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...salonUrls].join('\n')}
</urlset>`;

        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
        res.end(xml);
    } catch (err) {
        res.writeHead(500); res.end('Error generating sitemap');
    }
});

route('GET', '/api/admin/stats', async (req, res) => {
    const totalSalons = await db.countSalons();
    const totalOwners = await db.countOwners();
    const totalEmployees = await db.countEmployees();
    const totalBookings = await db.countAllBookings();
    const totalClients = await db.countAllClients();
    const salons = await db.findSalons();
    // Pricing: Flat 49.90 CHF per salon
    const revenueEstimate = salons.reduce((sum, s) => sum + (s.subscription?.price || 49.90), 0);
    json(res, 200, { success: true, data: { totalSalons, totalOwners, totalEmployees, totalBookings, totalClients, revenueEstimate: revenueEstimate.toFixed(2) } });
});

route('GET', '/api/admin/salons', async (req, res) => {
    const salons = await db.findSalons();
    const result = [];
    for (const salon of salons) {
        const owner = await db.findOwnerBySalon(salon._id);
        const empCount = await db.countEmployees({ salon: salon._id });
        const bookCount = await db.countBookings({ salon: salon._id });
        const clientCount = await db.countClients({ salon: salon._id });
        result.push({
            ...salon,
            owner: owner ? db.ownerToJSON(owner) : null,
            stats: { employees: empCount, bookings: bookCount, clients: clientCount }
        });
    }
    json(res, 200, { success: true, data: result });
});

route('POST', '/api/admin/salons', async (req, res) => {
    const body = await parseBody(req);
    const slug = await makeUniqueSlug(body.name || 'salon');

    const salon = await db.createSalon({
        slug,
        name: body.name,
        description: body.description || '',
        address: body.address || '',
        phone: body.phone || '',
        email: body.email || '',
        logo: '',
        branding: {
            primaryColor: body.branding?.primaryColor || '#6366F1',
            accentColor: body.branding?.accentColor || '#818CF8',
            heroTitle: body.branding?.heroTitle || `Bienvenue chez ${body.name}`,
            heroSubtitle: body.branding?.heroSubtitle || 'Votre salon de coiffure premium',
        },
        services: [
            { _id: crypto.randomBytes(12).toString('hex'), name: 'Coupe Classique', icon: '✂️', price: 25, duration: 30, description: 'Coupe sur-mesure', active: true },
            { _id: crypto.randomBytes(12).toString('hex'), name: 'Taille de Barbe', icon: '🪒', price: 15, duration: 20, description: 'Barbe soignée', active: true },
            { _id: crypto.randomBytes(12).toString('hex'), name: 'Pack Premium', icon: '💎', price: 55, duration: 60, description: 'Coupe + barbe + soin', active: true },
        ],
        hours: {
            lundi: { open: '09:00', close: '19:00' },
            mardi: { open: '09:00', close: '19:00' },
            mercredi: { open: '09:00', close: '19:00' },
            jeudi: { open: '09:00', close: '19:00' },
            vendredi: { open: '09:00', close: '19:00' },
            samedi: { open: '09:00', close: '18:00' },
        },
        subscription: { plan: body.subscription?.plan || 'pro', status: 'active', price: 49.90 },
        smsReminders: { enabled: false, status: 'En développement' },
        rating: 0,
        reviewCount: 0,
        active: true,
    });

    const owner = await db.createOwner({
        salon: salon._id,
        name: body.ownerName || 'Propriétaire',
        email: body.ownerEmail || '',
        password: body.ownerPassword || 'salon123',
        phone: body.ownerPhone || '',
        role: 'owner',
    });

    console.log(`\n🏪 Nouveau salon créé: ${salon.name} (${salon.slug})`);
    console.log(`   👤 Propriétaire: ${owner.name} (${owner.email})`);
    console.log(`   🌐 Site: http://localhost:${PORT}/s/${salon.slug}`);
    await db.addSalonLog(salon._id, 'salon_created', { name: salon.name, slug: salon.slug, plan: body.plan || 'pro', ownerEmail: body.ownerEmail });

    json(res, 201, { success: true, data: { salon, owner: db.ownerToJSON(owner) } });
});

route('DELETE', '/api/admin/salons/:id', async (req, res, params) => {
    await db.deleteSalon(params.id);
    json(res, 200, { success: true, message: 'Salon supprimé' });
});

route('PUT', '/api/admin/salons/:id', async (req, res, params) => {
    const body = await parseBody(req);
    const salon = await db.findSalonById(params.id);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const updates = {};
    if (body.name) updates.name = body.name;
    if (body.slug) {
        // Validate and deduplicate slug
        const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
        if (cleanSlug && cleanSlug !== salon.slug) {
            const existing = await db.findSalonBySlug(cleanSlug);
            if (existing) return json(res, 409, { success: false, error: 'Ce slug est déjà utilisé par un autre salon' });
            updates.slug = cleanSlug;
        }
    }
    if (body.address !== undefined) updates.address = body.address;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.description !== undefined) updates.description = body.description;
    if (Object.keys(updates).length > 0) {
        await db.updateSalon(params.id, updates);
    }
    json(res, 200, { success: true, message: 'Salon mis à jour' });
});

route('PUT', '/api/admin/salons/:id/plan', async (req, res, params) => {
    const body = await parseBody(req);
    const salon = await db.findSalonById(params.id);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    if (!['starter', 'pro', 'premium'].includes(body.plan)) {
        return json(res, 400, { success: false, error: 'Plan invalide' });
    }

    const oldPlan = salon.subscription?.plan || 'starter';
    const subscription = { ...(salon.subscription || {}), plan: body.plan };
    await db.updateSalon(params.id, { subscription });
    await db.addSalonLog(params.id, 'plan_change', { from: oldPlan, to: body.plan });
    json(res, 200, { success: true, message: 'Plan mis à jour', data: subscription });
});

// Admin: get salon change logs
route('GET', '/api/admin/salons/:id/logs', async (req, res, params) => {
    const logs = await db.getSalonLogs(params.id, 100);
    json(res, 200, { success: true, data: logs });
});

// Admin: save/update internal notes for a salon
route('PUT', '/api/admin/salons/:id/notes', async (req, res, params) => {
    const body = await parseBody(req);
    await db.updateSalon(params.id, { adminNotes: body.notes || '' });
    json(res, 200, { success: true, message: 'Notes enregistrées' });
});

// Admin: export salons as CSV
route('GET', '/api/admin/salons/export-csv', async (req, res) => {
    const salons = await db.findSalons({});
    const rows = [['Nom', 'Email', 'Slug', 'Plan', 'Statut', 'Date création', 'MRR estimé (CHF)']];
    const MRR = { starter: 29.9, pro: 49.9, premium: 89.9 };
    for (const s of salons) {
        const plan = s.subscription?.plan || 'starter';
        const status = s.subscription?.status || 'unknown';
        const mrr = (status === 'active' || status === 'trial') ? (MRR[plan] || 0) : 0;
        const ownerEmail = s.owner?.email || '';
        const created = s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : '';
        rows.push([
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${ownerEmail.replace(/"/g, '""')}"`,
            s.slug || '',
            plan,
            status,
            created,
            mrr,
        ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="salons-${new Date().toISOString().split('T')[0]}.csv"`,
        'Access-Control-Allow-Origin': '*',
    });
    res.end('\uFEFF' + csv); // BOM for Excel UTF-8
});

route('PUT', '/api/admin/salons/:salonId/owners/:ownerId/password', async (req, res, params) => {
    const body = await parseBody(req);
    if (!body.password) return json(res, 400, { success: false, error: 'nouveau mot de passe requis' });

    await db.updateOwner(params.ownerId, { password: body.password });
    json(res, 200, { success: true, message: 'Mot de passe modifié' });
});

route('GET', '/api/admin/salons/:id/magic-link', async (req, res, params) => {
    const salon = await db.findSalonById(params.id);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const owner = await db.findOwnerBySalon(params.id);
    if (!owner) return json(res, 404, { success: false, error: 'Aucun propriétaire trouvé' });

    const token = createToken({ ownerId: owner._id, salonId: owner.salon, role: 'owner' });
    json(res, 200, {
        success: true,
        data: {
            token,
            user: { id: owner._id, salonId: owner.salon, name: owner.name, email: owner.email, role: 'owner' },
            salon
        }
    });
});


// ==========================
//  BARBER (OWNER) API
// ==========================

route('POST', '/api/pro/login', async (req, res) => {
    const body = await parseBody(req);
    console.log(`\n🔑 Login attempt for email: "${body.email}"`);

    if (!body.email || !body.password) {
        console.log(`❌ Login failed: Missing email or password`);
        return json(res, 400, { success: false, error: 'Email et mot de passe requis' });
    }

    // Check Owner First
    const owner = await db.findOwnerByEmail(body.email);
    if (owner) {
        console.log(`👤 Found owner with email: ${owner.email}`);
        const match = await db.comparePassword(owner, body.password);
        if (match) {
            console.log(`✅ Password match for owner`);
            const salon = await db.findSalonById(owner.salon);
            const token = createToken({ ownerId: owner._id, salonId: owner.salon, role: 'owner' });
            return json(res, 200, {
                success: true,
                token,
                user: { id: owner._id, salonId: owner.salon, name: owner.name, email: owner.email, role: 'owner' },
                salon: salon || null,
                subscription: salon?.subscription || null
            });
        } else {
            console.log(`❌ Password mismatch for owner`);
        }
    } else {
        console.log(`❓ No owner found for email: ${body.email}`);
    }

    // Check Employee Second
    const employee = await db.findEmployeeByEmail(body.email);
    if (employee) {
        console.log(`✂️ Found employee with email: ${employee.email}`);
        if (!employee.active) {
            console.log(`❌ Login failed: Employee inactive`);
            return json(res, 403, { success: false, error: 'Accès désactivé pour cet employé' });
        }
        const match = await db.compareEmployeePassword(employee, body.password);
        if (match) {
            console.log(`✅ Password match for employee`);
            const salon = await db.findSalonById(employee.salon);
            // Verify if salon active
            if (!salon || !salon.active) {
                console.log(`❌ Login failed: Salon inactive`);
                return json(res, 403, { success: false, error: 'Le salon associé est inactif' });
            }
            const token = createToken({ employeeId: employee._id, salonId: employee.salon, role: 'employee' });
            return json(res, 200, {
                success: true,
                token,
                user: { id: employee._id, salonId: employee.salon, name: employee.name, email: employee.email, role: 'employee' },
                salon: salon || null
            });
        } else {
            console.log(`❌ Password mismatch for employee`);
        }
    } else {
        console.log(`❓ No employee found for email: ${body.email}`);
    }

    // If neither matched
    console.log(`❌ Login failed: No matching credentials found`);
    json(res, 401, { success: false, error: 'Email ou mot de passe incorrect' });
});

// Forgot password — always returns 200 to avoid email enumeration
route('POST', '/api/pro/forgot-password', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimit(ip, 'forgot', 5, 15 * 60 * 1000)) {
        return json(res, 429, { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return json(res, 200, { success: true }); // silent fail

    const owner = await db.findOwnerByEmail(email);
    if (owner) {
        const token = crypto.randomBytes(32).toString('hex');
        resetTokens.set(token, { ownerId: owner._id, email, expiry: Date.now() + 60 * 60 * 1000 });
        const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
        const resetUrl = `${baseUrl}/pro?reset_token=${token}`;
        sendPasswordResetEmail(email, owner.name, resetUrl); // non-blocking
        console.log(`🔑 Password reset token generated for ${email}`);
    }

    json(res, 200, { success: true }); // always success to avoid email enumeration
});

// Reset password — validates token and sets new password
route('POST', '/api/pro/reset-password', async (req, res) => {
    const body = await parseBody(req);
    const { token, password } = body;

    if (!token || !password || password.length < 6) {
        return json(res, 400, { success: false, error: 'Token et mot de passe (min. 6 caractères) requis.' });
    }

    const entry = resetTokens.get(token);
    if (!entry || Date.now() > entry.expiry) {
        return json(res, 400, { success: false, error: 'Lien expiré ou invalide. Veuillez refaire une demande.' });
    }

    await db.updateOwner(entry.ownerId, { password });
    resetTokens.delete(token); // single-use
    console.log(`✅ Password reset for owner ${entry.email}`);
    json(res, 200, { success: true });
});

route('GET', '/api/pro/salon/:salonId', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const employees = await db.findEmployees({ salon: params.salonId });
    const owner = await db.findOwnerBySalon(params.salonId);
    json(res, 200, { success: true, data: { ...salon, employees, owner: owner ? db.ownerToJSON(owner) : null } });
});

route('PUT', '/api/pro/salon/:salonId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const body = await parseBody(req);
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const updates = {};
    if (body.name) updates.name = body.name;
    if (body.address) updates.address = body.address;
    if (body.phone) updates.phone = body.phone;
    if (body.email) updates.email = body.email;
    if (body.description) updates.description = body.description;
    if (body.branding) updates.branding = { ...salon.branding, ...body.branding };
    if (body.hours) updates.hours = body.hours;
    if (body.closedDates !== undefined) updates.closedDates = body.closedDates;

    const updated = await db.updateSalon(params.salonId, updates);
    json(res, 200, { success: true, data: updated });
});

// Upload logo
route('POST', '/api/pro/salon/:salonId/logo', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return json(res, 400, { success: false, error: 'Content-Type doit être multipart/form-data' });
    }

    const { fileBuffer, fileExt } = await parseMultipart(req);
    if (!fileBuffer) return json(res, 400, { success: false, error: 'Image requise' });

    try {
        const logoUrl = await uploadImageBuffer(fileBuffer, fileExt, 'logos');

        // Delete old local logo if exists (we don't delete from Cloudinary to keep it simple, or we could)
        if (salon.logo && salon.logo.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, salon.logo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await db.updateSalon(params.salonId, { logo: logoUrl });
        return json(res, 200, { success: true, data: { logo: logoUrl } });
    } catch (err) {
        return json(res, 500, { success: false, error: 'Erreur pendant upload' });
    }
});

route('DELETE', '/api/pro/salon/:salonId/logo', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    if (salon.logo && salon.logo.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, salon.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.updateSalon(params.salonId, { logo: '' });
    json(res, 200, { success: true, message: 'Logo supprimé' });
});

// Upload hero background image
route('POST', '/api/pro/salon/:salonId/hero-image', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return json(res, 400, { success: false, error: 'Content-Type doit être multipart/form-data' });
    }

    const { fileBuffer, fileExt } = await parseMultipart(req);
    if (!fileBuffer) return json(res, 400, { success: false, error: 'Image requise' });

    try {
        const heroImageUrl = await uploadImageBuffer(fileBuffer, fileExt, 'hero-images');
        const oldHeroImage = salon.branding?.heroImage;
        if (oldHeroImage && oldHeroImage.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, oldHeroImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await db.updateSalon(params.salonId, { 'branding.heroImage': heroImageUrl });
        return json(res, 200, { success: true, data: { heroImage: heroImageUrl } });
    } catch (err) {
        return json(res, 500, { success: false, error: 'Erreur pendant upload' });
    }
});

route('DELETE', '/api/pro/salon/:salonId/hero-image', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const oldHeroImage = salon.branding?.heroImage;
    if (oldHeroImage && oldHeroImage.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, oldHeroImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.updateSalon(params.salonId, { 'branding.heroImage': '' });
    json(res, 200, { success: true, message: 'Photo de fond supprimée' });
});

// Stats
route('GET', '/api/pro/salon/:salonId/stats', async (req, res, params) => {
    const user = verifyToken(req);
    const isEmployee = user?.role === 'employee';

    const today = new Date().toISOString().split('T')[0];
    const queryToday = { salon: params.salonId, date: today };
    const queryAll = { salon: params.salonId };

    if (isEmployee) {
        queryToday.employeeId = user.employeeId;
        queryAll.employeeId = user.employeeId;
    }

    const todayBookings = await db.findBookings(queryToday);
    const allBookings = await db.findBookings(queryAll);

    // Pour un employé, on filtre ses propres clients (uniques)
    let totalClientsCount = 0;
    if (isEmployee) {
        const uniqueClients = new Set(allBookings.map(b => b.client));
        totalClientsCount = uniqueClients.size;
    } else {
        totalClientsCount = await db.countClients({ salon: params.salonId });
    }

    const totalRevenue = allBookings.reduce((s, b) => s + (b.price || 0), 0);
    const todayRevenue = todayBookings.reduce((s, b) => s + (b.price || 0), 0);

    json(res, 200, { success: true, data: { todayBookings: todayBookings.length, todayRevenue, totalBookings: allBookings.length, totalClients: totalClientsCount, totalRevenue } });
});

// Analytics (last 6 months)
route('GET', '/api/pro/salon/:salonId/analytics', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });

    const query = { salon: params.salonId };
    if (user.role === 'employee') query.employeeId = user.employeeId;

    const allBookings = await db.findBookings(query);

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = String(d.getFullYear());
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });
        const monthBookings = allBookings.filter(b => {
            if (!b.date) return false;
            const [y, mo] = b.date.split('-');
            return y === year && mo === month;
        });
        const revenue = monthBookings.reduce((s, b) => s + (b.price || 0), 0);
        const completed = monthBookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length;
        months.push({ label, bookings: monthBookings.length, completed, revenue });
    }

    // Top services
    const svcMap = {};
    allBookings.forEach(b => {
        if (!b.serviceName) return;
        if (!svcMap[b.serviceName]) svcMap[b.serviceName] = { name: b.serviceName, icon: b.serviceIcon || '✂️', count: 0, revenue: 0 };
        svcMap[b.serviceName].count++;
        svcMap[b.serviceName].revenue += b.price || 0;
    });
    const topServices = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5);

    json(res, 200, { success: true, data: { months, topServices } });
});

// Services
route('GET', '/api/pro/salon/:salonId/services', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    json(res, 200, { success: true, data: salon.services || [] });
});

route('POST', '/api/pro/salon/:salonId/services', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const body = await parseBody(req);
    const svc = {
        _id: crypto.randomBytes(12).toString('hex'),
        name: body.name,
        icon: body.icon || '✂️',
        price: body.price || 0,
        duration: body.duration || 30,
        description: body.description || '',
        active: true,
        assignedEmployees: body.assignedEmployees || []
    };
    const services = [...(salon.services || []), svc];
    await db.updateSalon(params.salonId, { services });
    json(res, 201, { success: true, data: svc });
});

route('PUT', '/api/pro/salon/:salonId/services/:svcId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    const body = await parseBody(req);
    const services = (salon.services || []).map(s => s._id === params.svcId ? { ...s, ...body } : s);
    await db.updateSalon(params.salonId, { services });
    json(res, 200, { success: true, data: services.find(s => s._id === params.svcId) });
});

route('DELETE', '/api/pro/salon/:salonId/services/:svcId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    const services = (salon.services || []).filter(s => s._id !== params.svcId);
    await db.updateSalon(params.salonId, { services });
    json(res, 200, { success: true, message: 'Service supprimé' });
});

// Branding & Hours
route('PUT', '/api/pro/salon/:salonId/branding', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const body = await parseBody(req);

    const branding = {
        icon: body.icon !== undefined ? body.icon : (salon.branding?.icon || '✂️'),
        primaryColor: body.primaryColor || salon.branding?.primaryColor || '#6366F1',
        accentColor: body.accentColor || salon.branding?.accentColor || '#818CF8',
        heroTitle: body.heroTitle || salon.branding?.heroTitle || `Bienvenue chez ${salon.name}`,
        heroSubtitle: body.heroSubtitle || salon.branding?.heroSubtitle || 'Votre salon de coiffure premium',
        textColor: body.textColor || salon.branding?.textColor || '#F5F0E8',
        instagram: body.instagram !== undefined ? body.instagram : (salon.branding?.instagram || ''),
        facebook: body.facebook !== undefined ? body.facebook : (salon.branding?.facebook || ''),
        tiktok: body.tiktok !== undefined ? body.tiktok : (salon.branding?.tiktok || ''),
        youtube: body.youtube !== undefined ? body.youtube : (salon.branding?.youtube || ''),
        heroStats: body.heroStats !== undefined ? body.heroStats : (salon.branding?.heroStats || null),
        backgroundColor: body.backgroundColor || salon.branding?.backgroundColor || '#0a0a0f',
    };

    const updated = await db.updateSalon(params.salonId, { branding });
    json(res, 200, { success: true, data: updated });
});

// ---- Gallery ----
route('POST', '/api/pro/salon/:salonId/gallery', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });

    // Parse multipart for image upload
    const { fields, fileBuffer, fileExt } = await parseMultipart(req);
    if (!fileBuffer) return json(res, 400, { success: false, error: 'Image requise' });

    try {
        const photoUrl = await uploadImageBuffer(fileBuffer, fileExt, 'gallery');

        const gallery = salon.gallery || [];
        const photo = {
            _id: crypto.randomBytes(12).toString('hex'),
            url: photoUrl,
            title: fields.title || '',
            createdAt: new Date().toISOString(),
        };
        gallery.push(photo);
        await db.updateSalon(params.salonId, { gallery });
        json(res, 201, { success: true, data: photo });
    } catch (err) {
        return json(res, 500, { success: false, error: 'Erreur upload' });
    }
});

route('DELETE', '/api/pro/salon/:salonId/gallery/:photoId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });

    const gallery = (salon.gallery || []).filter(p => p._id !== params.photoId);
    await db.updateSalon(params.salonId, { gallery });
    json(res, 200, { success: true, message: 'Photo supprimée' });
});

// Retro-compatibility (old logo upload fallback just in case)
route('POST', '/api/pro/salon/:salonId/logo_old', async (req, res, params) => {
    json(res, 410, { success: false, error: 'Gone' });
});

route('DELETE', '/api/pro/salon/:salonId/logo_old', async (req, res, params) => {
    json(res, 410, { success: false, error: 'Gone' });
});

// ---- Testimonials ----
// ---- Reviews (client-submitted, with moderation) ----
route('GET', '/api/pro/salon/:salonId/reviews', async (req, res, params) => {
    const all = await db.findBookings({ salon: params.salonId, reviewed: true });
    const reviews = all.map(b => ({
        _id: b._id, clientName: b.clientName, serviceName: b.serviceName,
        date: b.date, reviewRating: b.reviewRating, reviewComment: b.reviewComment,
        reviewDate: b.reviewDate, reviewApproved: b.reviewApproved ?? null,
    })).sort((a, b) => (b.reviewDate || '').localeCompare(a.reviewDate || ''));
    json(res, 200, { success: true, data: reviews });
});

route('PUT', '/api/pro/salon/:salonId/reviews/:bookingId/moderate', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const body = await parseBody(req);
    const approved = body.approved === true || body.approved === 'true';
    await db.updateBooking(params.bookingId, { reviewApproved: approved });
    // Recalculate salon rating from approved reviews only
    const all = await db.findBookings({ salon: params.salonId, reviewed: true });
    const approvedRatings = all.filter(b => b.reviewApproved === true).map(b => b.reviewRating).filter(Boolean);
    if (approvedRatings.length) {
        const avg = parseFloat((approvedRatings.reduce((a, b) => a + b, 0) / approvedRatings.length).toFixed(1));
        await db.updateSalon(params.salonId, { rating: avg, reviewCount: approvedRatings.length });
    } else {
        await db.updateSalon(params.salonId, { rating: 0, reviewCount: 0 });
    }
    json(res, 200, { success: true });
});

route('GET', '/api/pro/salon/:salonId/testimonials', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    json(res, 200, { success: true, data: salon.testimonials || [] });
});

route('POST', '/api/pro/salon/:salonId/testimonials', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });
    const body = await parseBody(req);

    const testimonials = salon.testimonials || [];
    const testimonial = {
        _id: crypto.randomBytes(12).toString('hex'),
        name: body.name || 'Client',
        text: body.text || '',
        stars: Math.min(5, Math.max(1, parseInt(body.stars) || 5)),
        role: body.role || 'Client',
    };
    testimonials.push(testimonial);
    await db.updateSalon(params.salonId, { testimonials });
    json(res, 201, { success: true, data: testimonial });
});

route('PUT', '/api/pro/salon/:salonId/testimonials/:tid', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });
    const body = await parseBody(req);

    const testimonials = (salon.testimonials || []).map(t =>
        t._id === params.tid ? { ...t, ...body, stars: Math.min(5, Math.max(1, parseInt(body.stars) || t.stars)) } : t
    );
    await db.updateSalon(params.salonId, { testimonials });
    json(res, 200, { success: true, data: testimonials.find(t => t._id === params.tid) });
});

route('DELETE', '/api/pro/salon/:salonId/testimonials/:tid', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role === 'employee') return json(res, 403, { success: false, error: 'Accès refusé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });

    const testimonials = (salon.testimonials || []).filter(t => t._id !== params.tid);
    await db.updateSalon(params.salonId, { testimonials });
    json(res, 200, { success: true, message: 'Avis supprimé' });
});

// Employees and Team Management
route('GET', '/api/pro/salon/:salonId/employees', async (req, res, params) => {
    const employees = await db.findEmployees({ salon: params.salonId });
    const owners = await db.findOwners({ salon: params.salonId });

    const team = [
        ...owners.map(o => ({ ...db.ownerToJSON(o), role: 'owner' })),
        ...employees.map(e => ({ ...db.employeeToJSON(e), role: 'employee' }))
    ];
    json(res, 200, { success: true, data: team });
});

route('POST', '/api/pro/salon/:salonId/employees', async (req, res, params) => {
    const body = await parseBody(req);
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon introuvable' });

    const plan = salon.subscription?.plan || 'pro';
    const empCount = await db.countEmployees({ salon: params.salonId });

    if (body.role !== 'owner') {
        if (plan === 'starter' && empCount >= 2) {
            return json(res, 403, { success: false, error: 'Limite de 2 employés atteinte pour le pack Starter. Veuillez upgrader votre abonnement.' });
        }
        if (plan === 'pro' && empCount >= 5) {
            return json(res, 403, { success: false, error: 'Limite de 5 employés atteinte pour le pack Pro. Veuillez upgrader vers Premium.' });
        }
    }

    if (body.role === 'owner') {
        const owner = await db.createOwner({
            salon: params.salonId,
            name: body.name,
            email: body.email || '',
            password: body.password || 'salon123',
            phone: body.phone || '',
            role: 'owner'
        });
        return json(res, 201, { success: true, data: { ...db.ownerToJSON(owner), role: 'owner' } });
    } else {
        const emp = await db.createEmployee({
            salon: params.salonId,
            name: body.name,
            email: body.email || '',
            password: body.password || null,
            phone: body.phone || '',
            specialties: body.specialties || []
        });
        return json(res, 201, { success: true, data: { ...db.employeeToJSON(emp), role: 'employee' } });
    }
});

route('DELETE', '/api/pro/salon/:salonId/employees/:empId', async (req, res, params) => {
    const url = new URL(req.url, `http://localhost`);
    const role = url.searchParams.get('role');

    if (role === 'owner') {
        // Prevent deleting original owner maybe?
        const owners = await db.findOwners({ salon: params.salonId });
        if (owners.length <= 1) {
            return json(res, 400, { success: false, error: 'Impossible de supprimer le seul propriétaire' });
        }
        await db.deleteOwner(params.empId);
    } else {
        await db.deleteEmployee(params.empId);
    }
    json(res, 200, { success: true, message: 'Membre supprimé' });
});

route('PUT', '/api/pro/salon/:salonId/employees/:empId/password', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });
    if (user.role === 'employee' && user.employeeId !== params.empId) {
        return json(res, 403, { success: false, error: 'Non autorisé' });
    }
    const url = new URL(req.url, `http://localhost`);
    const role = url.searchParams.get('role');
    const body = await parseBody(req);
    if (!body.password || body.password.length < 6) {
        return json(res, 400, { success: false, error: 'Mot de passe trop court (min 6 caractères)' });
    }
    if (role === 'owner') {
        await db.updateOwner(params.empId, { password: body.password });
    } else {
        await db.updateEmployee(params.empId, { password: body.password });
    }
    json(res, 200, { success: true, message: 'Mot de passe mis à jour' });
});

route('PUT', '/api/pro/salon/:salonId/employees/:empId/hours', async (req, res, params) => {
    const body = await parseBody(req);
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    
    // Authorization
    const user = verifyToken(req);
    if (!user || (user.role !== 'owner' && user.employeeId !== params.empId)) {
        return json(res, 403, { success: false, error: 'Non autorisé' });
    }

    if (!body.hours) return json(res, 400, { success: false, error: 'Heures requises' });

    await db.updateEmployee(params.empId, { hours: body.hours });
    json(res, 200, { success: true, message: 'Horaires mis à jour' });
});

// Bookings
route('GET', '/api/pro/salon/:salonId/bookings', async (req, res, params) => {
    const user = verifyToken(req);
    const url = new URL(req.url, `http://localhost`);
    const dateFilter = url.searchParams.get('date');
    const fromFilter = url.searchParams.get('from');
    const toFilter = url.searchParams.get('to');
    const statusFilter = url.searchParams.get('status');
    const searchFilter = url.searchParams.get('search');
    const query = { salon: params.salonId };
    if (dateFilter) query.date = dateFilter;
    if (statusFilter) query.status = statusFilter;
    if (user?.role === 'employee') {
        query.employeeId = user.employeeId;
    }
    let bookings = await db.findBookings(query);
    if (fromFilter) bookings = bookings.filter(b => b.date >= fromFilter);
    if (toFilter) bookings = bookings.filter(b => b.date <= toFilter);
    if (searchFilter) {
        const s = searchFilter.toLowerCase();
        bookings = bookings.filter(b =>
            (b.clientName || '').toLowerCase().includes(s) ||
            (b.serviceName || '').toLowerCase().includes(s) ||
            (b.clientPhone || '').includes(s)
        );
    }
    json(res, 200, { success: true, data: bookings });
});

route('PUT', '/api/pro/salon/:salonId/bookings/:bookingId', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });
    const body = await parseBody(req);
    const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (body.status && !VALID_STATUSES.includes(body.status)) {
        return json(res, 400, { success: false, error: 'Statut invalide' });
    }
    const updates = {};
    if (body.status) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    const booking = await db.updateBooking(params.bookingId, updates);
    if (!booking) return json(res, 404, { success: false });
    json(res, 200, { success: true, data: booking });
});

// Manual booking creation (from pro panel)
route('POST', '/api/pro/salon/:salonId/bookings', async (req, res, params) => {
    const body = await parseBody(req);
    if (!body.clientName) return json(res, 400, { success: false, error: 'Nom du client requis' });

    const client = await db.findOrCreateClient(params.salonId, {
        name: body.clientName, email: body.clientEmail || '', phone: body.clientPhone || '', price: body.price || 0
    });

    const user = verifyToken(req);

    // Determine employee defaults if not provided in the payload and an employee creates it
    let employeeId = body.employeeId || null;
    let employeeName = body.employeeName || null;
    if (user?.role === 'employee') {
        employeeId = user.employeeId;
        const emp = await db.findEmployeeById(user.employeeId);
        if (emp) employeeName = emp.name;
    }

    if (body.date && body.time && await hasConflict(params.salonId, employeeId, body.date, body.time, body.duration || 30)) {
        return json(res, 409, { success: false, error: 'Ce créneau est déjà occupé.' });
    }

    const booking = await db.createBooking({
        salon: params.salonId, client: client._id,
        clientName: body.clientName, clientEmail: body.clientEmail || '', clientPhone: body.clientPhone || '',
        serviceName: body.serviceName || '', serviceIcon: body.serviceIcon || '✂️',
        price: body.price || 0, duration: body.duration || 30,
        date: body.date, time: body.time, notes: body.notes || '',
        employeeId, employeeName,
        status: 'confirmed', source: body.source || 'manual',
        cancelToken: crypto.randomBytes(16).toString('hex'),
    });

    console.log(`  📅 RDV manuel: ${body.clientName} - ${body.serviceName} @ ${body.date} ${body.time}`);
    json(res, 201, { success: true, data: booking });

    // Non-blocking: email + SMS
    const salon = await db.findSalonById(params.salonId);
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const cancelUrl = booking.cancelToken ? `${baseUrl}/cancel/${booking.cancelToken}` : null;
    const receiptUrl = booking.cancelToken ? `${baseUrl}/receipt/${booking._id}?token=${booking.cancelToken}` : null;
    if (salon && booking.clientEmail) sendBookingConfirmation(booking, salon, cancelUrl, receiptUrl);
    if (salon && booking.employeeId) {
        // Notify the assigned employee by email (non-blocking)
        (async () => {
            const emp = await db.findEmployeeById(booking.employeeId) || await db.findOwnerById(booking.employeeId);
            if (emp?.email) sendEmployeeBookingNotification(booking, salon, emp.email);
        })();
    }
    if (salon && salon.smsSettings?.clientConfirmation !== false && booking.clientPhone && (salon.smsCredits || 0) > 0) {
        sendSMSConfirmation(booking, salon).then(result => {
            if (result.success) db.updateSalon(salon._id, { smsCredits: Math.max(0, (salon.smsCredits || 0) - 1) });
        });
    }
    if (salon && salon.smsSettings?.ownerNotification && salon.smsSettings?.ownerPhone) {
        sendSMSOwnerNotification(booking, salon, salon.smsSettings.ownerPhone);
    }
});

// Blocks (indisponibilités pro)
route('GET', '/api/pro/salon/:salonId/blocks', async (req, res, params) => {
    const url = new URL(req.url, 'http://localhost');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let blocks = await db.findBlocks({ salonId: params.salonId });
    if (from) blocks = blocks.filter(b => b.date >= from);
    if (to) blocks = blocks.filter(b => b.date <= to);
    json(res, 200, { success: true, data: blocks });
});

route('POST', '/api/pro/salon/:salonId/blocks', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });
    const body = await parseBody(req);
    if (!body.date || !body.startTime || !body.endTime) return json(res, 400, { success: false, error: 'date, startTime et endTime requis' });
    if (body.startTime >= body.endTime) return json(res, 400, { success: false, error: 'L\'heure de fin doit être après l\'heure de début' });

    // Employees can only block their own schedule (forced to self)
    let employeeId = body.employeeId || null;
    let employeeName = body.employeeName || null;
    if (user.role === 'employee') {
        const emp = await db.findEmployeeById(user.employeeId);
        employeeId = user.employeeId;
        employeeName = emp?.name || null;
    }

    const block = await db.createBlock({
        salonId: params.salonId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        reason: body.reason || '',
        employeeId,
        employeeName,
        allDay: body.allDay || false,
    });
    json(res, 201, { success: true, data: block });
});

route('DELETE', '/api/pro/salon/:salonId/blocks/:blockId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });
    // Employees can only delete their own blocks
    if (user.role === 'employee') {
        const [target] = await db.findBlocks({ _id: params.blockId });
        if (!target || String(target.employeeId) !== String(user.employeeId)) {
            return json(res, 403, { success: false, error: 'Vous ne pouvez supprimer que vos propres bloquages' });
        }
    }
    await db.deleteBlock(params.blockId);
    json(res, 200, { success: true });
});

// Clients
route('GET', '/api/pro/salon/:salonId/clients', async (req, res, params) => {
    const clients = await db.findClients({ salon: params.salonId });
    json(res, 200, { success: true, data: clients });
});

// Client search autocomplete (must be before /:clientId route)
route('GET', '/api/pro/salon/:salonId/clients/search', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false });
    const url = new URL(req.url, 'http://localhost');
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    if (q.length < 2) return json(res, 200, { success: true, data: [] });
    const clients = await db.findClients({ salon: params.salonId });
    const filtered = clients.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    ).slice(0, 8);
    json(res, 200, { success: true, data: filtered });
});

// Single client + booking history
route('GET', '/api/pro/salon/:salonId/clients/:clientId', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false });
    const client = await db.findClientById(params.clientId);
    if (!client || String(client.salon) !== String(params.salonId)) return json(res, 404, { success: false });
    const bookings = await db.findBookings({ salon: params.salonId, client: params.clientId });
    json(res, 200, { success: true, data: { ...client, recentBookings: bookings.slice(0, 15) } });
});

// Update client notes
route('PUT', '/api/pro/salon/:salonId/clients/:clientId/notes', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false });
    const body = await parseBody(req);
    await db.updateClient(params.clientId, { notes: body.notes || '' });
    json(res, 200, { success: true });
});

// SMS Status
route('GET', '/api/pro/salon/:salonId/sms-status', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    json(res, 200, {
        success: true,
        data: {
            credits: salon.smsCredits || 0,
            packs: SMS_PACKS,
            configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
            settings: salon.smsSettings || { clientConfirmation: true, clientReminder: true, ownerNotification: false, ownerPhone: '' },
        }
    });
});

route('PUT', '/api/pro/salon/:salonId/sms-settings', async (req, res, params) => {
    const user = verifyToken(req);
    if (!user) return json(res, 401, { success: false });
    const body = await parseBody(req);
    const smsSettings = {
        clientConfirmation: body.clientConfirmation !== false,
        clientReminder: body.clientReminder !== false,
        ownerNotification: !!body.ownerNotification,
        ownerPhone: (body.ownerPhone || '').trim(),
    };
    await db.updateSalon(params.salonId, { smsSettings });
    json(res, 200, { success: true, data: smsSettings });
});

// Buy SMS credits via Stripe checkout
route('POST', '/api/pro/sms/buy', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role === 'employee') return json(res, 403, { success: false });

    const body = await parseBody(req);
    const pack = SMS_PACKS[body.pack];
    if (!pack) return json(res, 400, { success: false, error: 'Pack invalide (starter | pro | max)' });

    const salon = await db.findSalonById(user.salonId);
    if (!salon) return json(res, 404, { success: false });

    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'chf',
                unit_amount: pack.priceChf * 100,
                product_data: {
                    name: `SalonPro — ${pack.label} (${pack.credits} SMS)`,
                    description: `${pack.credits} crédits SMS pour ${salon.name}`,
                },
            },
            quantity: 1,
        }],
        metadata: {
            type: 'sms_credits',
            salonId: String(user.salonId),
            credits: String(pack.credits),
            packName: pack.label,
        },
        success_url: `${baseUrl}/pro?sms_success=1`,
        cancel_url: `${baseUrl}/pro?sms_cancel=1`,
    });

    console.log(`[SMS Credits] Session créée: ${session.id} — ${pack.label} pour salon ${user.salonId}`);
    json(res, 200, { success: true, url: session.url });
});

// ==========================
//  STRIPE CHECKOUT API
// ==========================

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const PLAN_PRICES = {
    starter: { amount: 3900, name: 'Pack Starter', employees: 2 },
    pro: { amount: 4900, name: 'Pack Pro', employees: 5 },
    premium: { amount: 8900, name: 'Pack Premium', employees: 999 }
};

route('POST', '/api/stripe/create-checkout', async (req, res) => {
    if (!stripe) return json(res, 500, { success: false, error: 'Stripe non configuré' });
    const body = await parseBody(req);
    const plan = body.plan || 'pro';
    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) return json(res, 400, { success: false, error: 'Plan invalide' });

    const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price_data: {
                    currency: 'chf',
                    product_data: { name: planInfo.name, description: `SalonPro ${planInfo.name} — jusqu'à ${planInfo.employees === 999 ? 'illimité' : planInfo.employees} employés` },
                    unit_amount: planInfo.amount,
                    recurring: { interval: 'month' }
                },
                quantity: 1
            }],
            metadata: { plan, salonName: body.salonName || '', ownerEmail: body.email || '' },
            customer_email: body.email || undefined,
            success_url: `${baseUrl}/saas/index.html?checkout=success&plan=${plan}`,
            cancel_url: `${baseUrl}/saas/index.html?checkout=cancel`
        });

        json(res, 200, { success: true, data: { url: session.url, sessionId: session.id } });
    } catch (err) {
        console.error('Stripe error:', err.message);
        json(res, 500, { success: false, error: err.message });
    }
});

route('GET', '/api/stripe/public-key', async (req, res) => {
    json(res, 200, { success: true, data: { publicKey: process.env.STRIPE_PUBLIC_KEY || '' } });
});

// Stripe Customer Portal Session
route('POST', '/api/stripe/portal/session', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Unauthorized' });

    const salon = await db.findSalonById(user.salonId);
    if (!salon || !salon.subscription?.stripeCustomerId) {
        return json(res, 400, { success: false, error: 'Ce salon n\'a pas de client Stripe actif' });
    }

    if (!stripe) {
        return json(res, 500, { success: false, error: 'Stripe API not configured' });
    }

    try {
        const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
        const session = await stripe.billingPortal.sessions.create({
            customer: salon.subscription.stripeCustomerId,
            return_url: `${baseUrl}/pro`,
        });
        return json(res, 200, { success: true, data: { url: session.url } });
    } catch (err) {
        console.error('Stripe Portal error:', err.message);
        return json(res, 500, { success: false, error: err.message });
    }
});

// Register + Checkout in one step
route('POST', '/api/stripe/register-and-checkout', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimit(ip, 'register', 5, 10 * 60 * 1000)) {
        return json(res, 429, { success: false, error: 'Trop de tentatives. Veuillez réessayer dans 10 minutes.' });
    }

    const body = await parseBody(req);
    const { salonName, ownerName, email, password, phone, plan } = body;

    // Validation
    if (!salonName || !ownerName || !email || !password) {
        return json(res, 400, { success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (password.length < 6) {
        return json(res, 400, { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const planInfo = PLAN_PRICES[plan || 'pro'];
    if (!planInfo) return json(res, 400, { success: false, error: 'Plan invalide.' });

    // Check if email already exists
    const existingOwner = await db.findOwnerByEmail(email);
    if (existingOwner) {
        return json(res, 400, { success: false, error: 'Un compte avec cet email existe déjà. Connectez-vous sur l\'Espace Pro.' });
    }

    // Generate slug from salon name (clean, with collision detection)
    const slug = await makeUniqueSlug(salonName);

    try {
        // Create salon
        const salon = await db.createSalon({
            slug,
            name: salonName,
            description: '',
            address: '',
            phone: phone || '',
            email: email,
            plan: plan || 'pro',
            logo: '',
            branding: {
                primaryColor: '#6366F1',
                accentColor: '#818CF8',
                heroTitle: `Bienvenue chez ${salonName}`,
                heroSubtitle: 'Excellence, style et précision',
            },
            services: [
                { _id: require('./db').genId ? require('crypto').randomBytes(12).toString('hex') : Date.now().toString(), name: 'Coupe', icon: '✂️', price: 30, duration: 30, description: 'Coupe classique', active: true },
                { _id: require('crypto').randomBytes(12).toString('hex'), name: 'Coupe & Brushing', icon: '💇‍♀️', price: 45, duration: 45, description: 'Coupe et brushing', active: true },
            ],
            hours: {
                lundi: { open: '09:00', close: '19:00' },
                mardi: { open: '09:00', close: '19:00' },
                mercredi: { open: '09:00', close: '19:00' },
                jeudi: { open: '09:00', close: '19:00' },
                vendredi: { open: '09:00', close: '19:00' },
                samedi: { open: '09:00', close: '18:00' },
            },
            subscription: { plan: plan || 'pro', status: 'pending_payment' },
            smsReminders: { enabled: false, status: 'En développement' },
            rating: 0,
            reviewCount: 0,
            active: false,
        });

        // Create owner
        const owner = await db.createOwner({
            salon: salon._id,
            name: ownerName,
            email: email.toLowerCase(),
            password: password,
            phone: phone || '',
            role: 'owner',
        });

        // Welcome email will be sent after Stripe payment confirmation (via webhook)

        console.log(`✅ Nouveau salon créé: ${salonName} (${plan}) par ${ownerName}`);

        const token = createToken({ ownerId: owner._id, salonId: salon._id, role: 'owner' });
        const sessionData = {
            token,
            user: { id: owner._id, salonId: salon._id, name: owner.name, email: owner.email, role: 'owner' },
            salon: salon
        };

        // Create Stripe Checkout Session
        if (stripe) {
            const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [{
                    price_data: {
                        currency: 'chf',
                        product_data: {
                            name: planInfo.name,
                            description: `SalonPro ${planInfo.name} — ${planInfo.employees === 999 ? 'employés illimités' : `jusqu'à ${planInfo.employees} employés`}`
                        },
                        unit_amount: planInfo.amount,
                        recurring: { interval: 'month' }
                    },
                    quantity: 1
                }],
                metadata: { plan: plan || 'pro', salonId: salon._id, salonName, ownerEmail: email, ownerName: ownerName || '' },
                customer_email: email,
                subscription_data: { trial_period_days: 14 },
                success_url: `${baseUrl}/saas/success.html?plan=${plan || 'pro'}&salon=${encodeURIComponent(salonName)}`,
                cancel_url: `${baseUrl}/saas/index.html?checkout=cancel`
            });

            console.log(`[API Stripe] Session créée: ${session.id}, URL: ${session.url}`);
            return json(res, 200, { success: true, data: { url: session.url, sessionId: session.id, salonSlug: slug, sessionData } });
        } else {
            // Stripe not configured, just return success
            console.warn('[API Stripe] Stripe non configuré, retour URL vide');
            return json(res, 200, { success: true, data: { salonSlug: slug, message: 'Salon créé (Stripe non configuré)', sessionData } });
        }
    } catch (err) {
        console.error('Register error:', err.message);
        json(res, 500, { success: false, error: 'Erreur lors de la création du salon.' });
    }
});

// Stripe Webhook - activate subscription after payment
route('POST', '/api/stripe/webhook', async (req, res) => {
    // Get raw body for Stripe signature verification
    const rawBody = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });

    let event;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (endpointSecret && stripe) {
        try {
            const sig = req.headers['stripe-signature'];
            event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
        } catch (err) {
            console.error('⚠️ Webhook signature verification failed:', err.message);
            return json(res, 400, { error: 'Webhook signature invalide' });
        }
    } else {
        // In dev/test without webhook secret, parse manually
        try {
            event = JSON.parse(rawBody);
        } catch (err) {
            return json(res, 400, { error: 'Invalid JSON' });
        }
    }

    console.log(`📩 Stripe Webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const salonId = session.metadata?.salonId;

        // ---- Booking payment ----
        if (session.metadata?.type === 'booking' && session.metadata?.bookingId) {
            const bookingId = session.metadata.bookingId;
            const amountPaid = parseFloat(session.metadata.amountPaid || '0');
            const paymentMode = session.metadata.paymentMode;
            const paymentStatus = paymentMode === 'full_online' ? 'fully_paid' : 'deposit_paid';
            await db.updateBooking(bookingId, {
                status: 'confirmed',
                paymentStatus,
                amountPaid,
                stripeSessionId: session.id,
            });
            console.log(`✅ Booking ${bookingId} confirmé via paiement (${paymentStatus}, ${amountPaid} CHF)`);

            // Envoie l'email de confirmation
            const booking = await db.findBookingById ? db.findBookingById(bookingId) : null;
            const salon2 = salonId ? await db.findSalonById(salonId) : null;
            if (booking && salon2 && booking.clientEmail) {
                const baseUrl2 = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
                const cancelUrl2 = booking.cancelToken ? `${baseUrl2}/cancel/${booking.cancelToken}` : null;
                const receiptUrl2 = booking.cancelToken ? `${baseUrl2}/receipt/${booking._id}?token=${booking.cancelToken}` : null;
                sendBookingConfirmation(booking, salon2, cancelUrl2, receiptUrl2);
            }
            json(res, 200, { received: true });
            return;
        }

        // ---- SMS Credits purchase ----
        if (session.metadata?.type === 'sms_credits' && salonId) {
            const credits = parseInt(session.metadata.credits || '0', 10);
            const salon = await db.findSalonById(salonId);
            if (salon && credits > 0) {
                const current = salon.smsCredits || 0;
                await db.updateSalon(salonId, { smsCredits: current + credits });
                console.log(`✅ +${credits} crédits SMS ajoutés au salon ${salonId} (total: ${current + credits})`);
            }
            json(res, 200, { received: true });
            return;
        }

        // ---- Subscription checkout ----
        const plan = session.metadata?.plan || 'pro';
        const ownerEmail = session.metadata?.ownerEmail;
        const salonName = session.metadata?.salonName;

        if (salonId) {
            const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            await db.updateSalon(salonId, {
                active: true,
                'subscription.status': 'trial',
                'subscription.trialEnd': trialEnd,
                'subscription.stripeCustomerId': session.customer,
                'subscription.stripeSubscriptionId': session.subscription,
            });
            console.log(`✅ Salon ${salonId} activé (plan: ${plan}, trial jusqu'au ${trialEnd})`);
            await db.addSalonLog(salonId, 'subscription_activated', { plan, trialEnd, stripeCustomerId: session.customer });

            // Send welcome email (non-blocking)
            const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
            if (ownerEmail) {
                const ownerNameMeta = session.metadata?.ownerName || '';
                sendWelcomeEmail(ownerEmail, ownerNameMeta || salonName, salonName || 'Votre salon', plan, baseUrl);
            }
            // Notify admin of new paying subscription
            if (process.env.ADMIN_EMAIL) {
                sendAdminNewSubscriptionEmail(process.env.ADMIN_EMAIL, {
                    salonName: salonName || 'Inconnu',
                    ownerEmail: ownerEmail || 'N/A',
                    plan,
                    salonId,
                    baseUrl,
                });
            }
        }
    } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        // Find salon by Stripe subscription ID and deactivate
        const salons = await db.findSalons({ 'subscription.stripeSubscriptionId': subscription.id });
        if (salons.length > 0) {
            await db.updateSalon(salons[0]._id, {
                active: false,
                'subscription.status': 'cancelled',
            });
            console.log(`⛔ Salon ${salons[0]._id} désactivé (abonnement annulé)`);
        }
    }

    // ---- Booking payment confirmed ----
    if (event.type === 'checkout.session.completed') {
        // (handled above, but also catch booking type here in case of duplicate handling)
    } else if (event.type === 'account.updated') {
        const account = event.data.object;
        const salons = await db.findSalons({ 'stripeConnect.accountId': account.id });
        if (salons.length > 0) {
            const upd = {
                'stripeConnect.chargesEnabled': account.charges_enabled,
                'stripeConnect.payoutsEnabled': account.payouts_enabled,
            };
            if (account.charges_enabled && account.payouts_enabled) upd['stripeConnect.status'] = 'connected';
            await db.updateSalon(salons[0]._id, upd);
            console.log(`🔗 Stripe Connect ${account.id} updated (charges: ${account.charges_enabled})`);
        }
    }

    json(res, 200, { received: true });
});

// ==========================
//  STRIPE CONNECT (paiements par salon)
// ==========================

// 1. Onboarding — crée un compte Connect Express et renvoie le lien
route('POST', '/api/pro/stripe/connect/onboard', async (req, res) => {
    if (!stripe) return json(res, 500, { success: false, error: 'Stripe non configuré' });
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(user.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    if (salon.subscription?.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité disponible sur les plans Pro et Premium uniquement' });

    try {
        let accountId = salon.stripeConnect?.accountId;
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'CH',
                default_currency: 'chf',
                email: salon.email || undefined,
                metadata: { salonId: salon._id, salonName: salon.name }
            });
            accountId = account.id;
            await db.updateSalon(salon._id, {
                'stripeConnect.accountId': accountId,
                'stripeConnect.status': 'pending'
            });
        }
        const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
        const link = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${baseUrl}/pro?stripe_connect=refresh`,
            return_url: `${baseUrl}/pro?stripe_connect=success`,
            type: 'account_onboarding',
        });
        json(res, 200, { success: true, data: { url: link.url } });
    } catch (err) {
        console.error('Stripe Connect onboard error:', err.message);
        json(res, 500, { success: false, error: err.message });
    }
});

// 2. Status — vérifie si le compte Connect est actif
route('GET', '/api/pro/stripe/connect/status', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(user.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const accountId = salon.stripeConnect?.accountId;
    if (!accountId || !stripe) return json(res, 200, { success: true, data: { connected: false } });

    try {
        const account = await stripe.accounts.retrieve(accountId);
        const connected = account.charges_enabled && account.payouts_enabled;
        if (connected && salon.stripeConnect?.status !== 'connected') {
            await db.updateSalon(salon._id, {
                'stripeConnect.status': 'connected',
                'stripeConnect.chargesEnabled': true,
                'stripeConnect.payoutsEnabled': true,
            });
        }
        json(res, 200, { success: true, data: {
            connected,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            accountId,
        }});
    } catch (err) {
        json(res, 200, { success: true, data: { connected: false } });
    }
});

// 3. Dashboard Express — génère un lien de connexion vers le dashboard Stripe
route('POST', '/api/pro/stripe/connect/dashboard-link', async (req, res) => {
    if (!stripe) return json(res, 500, { success: false, error: 'Stripe non configuré' });
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(user.salonId);
    if (!salon?.stripeConnect?.accountId) return json(res, 400, { success: false, error: 'Compte Stripe non connecté' });
    try {
        const loginLink = await stripe.accounts.createLoginLink(salon.stripeConnect.accountId);
        json(res, 200, { success: true, data: { url: loginLink.url } });
    } catch (err) {
        json(res, 500, { success: false, error: err.message });
    }
});

// ==========================
//  PREMIUM FEATURES
// ==========================

// ---- Webhook trigger (interne) ----
async function triggerWebhooks(salon, event, payload) {
    const webhooks = (salon.webhooks || []).filter(w => w.active && (w.events || []).includes(event));
    if (!webhooks.length) return;
    const body = JSON.stringify({ event, salon: salon.slug, timestamp: new Date().toISOString(), data: payload });
    for (const wh of webhooks) {
        try {
            await fetch(wh.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-SalonPro-Event': event },
                body,
                signal: AbortSignal.timeout(5000),
            });
        } catch (e) {
            console.warn(`⚠️ Webhook failed [${event}]: ${wh.url} — ${e.message}`);
        }
    }
}

// ---- Multi-établissements ----

// GET /api/pro/my-salons
route('GET', '/api/pro/my-salons', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const owner = await db.findOwnerById(user.ownerId);
    if (!owner) return json(res, 404, { success: false, error: 'Propriétaire introuvable' });

    const primarySalon = await db.findSalonById(owner.salon);
    const extras = await Promise.all((owner.extraSalons || []).map(id => db.findSalonById(id)));
    const allSalons = [primarySalon, ...extras].filter(Boolean).map(s => ({
        _id: s._id, name: s.name, slug: s.slug, logo: s.logo || '',
        subscription: s.subscription, active: s.active,
        isPrimary: String(s._id) === String(owner.salon),
    }));

    json(res, 200, { success: true, data: allSalons });
});

// POST /api/pro/my-salons — créer un nouvel établissement (Premium uniquement)
route('POST', '/api/pro/my-salons', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const owner = await db.findOwnerById(user.ownerId);
    if (!owner) return json(res, 404, { success: false, error: 'Propriétaire introuvable' });

    const primarySalon = await db.findSalonById(owner.salon);
    if (!primarySalon) return json(res, 404, { success: false, error: 'Salon principal introuvable' });
    if (primarySalon.subscription?.plan !== 'premium') {
        return json(res, 403, { success: false, error: 'Fonctionnalité réservée au plan Premium' });
    }
    const extraSalons = owner.extraSalons || [];
    if (extraSalons.length >= 4) {
        return json(res, 400, { success: false, error: 'Maximum 5 établissements atteint' });
    }

    const body = await parseBody(req);
    if (!body.name) return json(res, 400, { success: false, error: 'Nom du salon requis' });

    const slug = await makeUniqueSlug(body.name);
    const newSalon = await db.createSalon({
        slug, name: body.name,
        description: body.description || '', address: body.address || '',
        phone: body.phone || '', email: body.email || '',
        logo: '', services: [], gallery: [],
        hours: {
            lundi: { open: '09:00', close: '19:00' }, mardi: { open: '09:00', close: '19:00' },
            mercredi: { open: '09:00', close: '19:00' }, jeudi: { open: '09:00', close: '19:00' },
            vendredi: { open: '09:00', close: '19:00' }, samedi: { open: '09:00', close: '18:00' },
        },
        subscription: { plan: 'premium', status: primarySalon.subscription?.status || 'active', price: 0 },
        active: true,
    });

    await db.updateOwner(owner._id, { extraSalons: [...extraSalons, newSalon._id] });
    console.log(`🏪 Nouvel établissement créé: ${newSalon.name} (${newSalon.slug}) par ${owner.email}`);
    json(res, 201, { success: true, data: newSalon });
});

// POST /api/pro/switch-salon — switcher de salon, retourne un nouveau JWT
route('POST', '/api/pro/switch-salon', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const body = await parseBody(req);
    if (!body.salonId) return json(res, 400, { success: false, error: 'salonId requis' });

    const owner = await db.findOwnerById(user.ownerId);
    if (!owner) return json(res, 404, { success: false, error: 'Propriétaire introuvable' });

    const allIds = [String(owner.salon), ...(owner.extraSalons || []).map(String)];
    if (!allIds.includes(String(body.salonId))) {
        return json(res, 403, { success: false, error: 'Accès non autorisé à ce salon' });
    }

    const salon = await db.findSalonById(body.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const newToken = createToken({ ownerId: owner._id, salonId: body.salonId, role: 'owner' });
    json(res, 200, {
        success: true, token: newToken,
        user: { id: owner._id, salonId: body.salonId, name: owner.name, email: owner.email, role: 'owner' },
        salon,
    });
});

// ---- Marque blanche ----

// PUT /api/pro/salon/:salonId/white-label (Premium uniquement)
route('PUT', '/api/pro/salon/:salonId/white-label', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    if (salon.subscription?.plan !== 'premium') {
        return json(res, 403, { success: false, error: 'Fonctionnalité réservée au plan Premium' });
    }
    const body = await parseBody(req);
    const updated = await db.updateSalon(params.salonId, {
        'whiteLabel.enabled': !!body.enabled,
        'whiteLabel.customDomain': (body.customDomain || '').trim(),
    });
    json(res, 200, { success: true, data: updated });
});

// ---- Intégrations avancées : iCal export ----

// GET /api/pro/salon/:salonId/bookings/ical (Premium)
route('GET', '/api/pro/salon/:salonId/bookings/ical', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user) return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    if (salon.subscription?.plan !== 'premium') {
        return json(res, 403, { success: false, error: 'Fonctionnalité réservée au plan Premium' });
    }

    const bookings = await db.findBookings({ salon: salon._id, status: { $in: ['confirmed', 'completed'] } });
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0',
        'PRODID:-//SalonPro//SalonPro//FR',
        `X-WR-CALNAME:${salon.name} - Rendez-vous`,
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ];

    for (const b of bookings) {
        if (!b.date || !b.time) continue;
        const [yr, mo, dy] = b.date.split('-');
        const [hr, mn] = b.time.split(':');
        const startDt = `${yr}${mo}${dy}T${hr}${mn}00`;
        const endDate = new Date(+yr, +mo - 1, +dy, +hr, +mn + (b.duration || 30));
        const endDt = `${String(endDate.getFullYear())}${String(endDate.getMonth()+1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}T${String(endDate.getHours()).padStart(2,'0')}${String(endDate.getMinutes()).padStart(2,'0')}00`;
        lines.push(
            'BEGIN:VEVENT',
            `UID:booking-${b._id}@salonpro`,
            `DTSTAMP:${now}`,
            `DTSTART:${startDt}`,
            `DTEND:${endDt}`,
            `SUMMARY:${(b.serviceName || 'RDV').replace(/[,;\\]/g, '')} - ${(b.clientName || '').replace(/[,;\\]/g, '')}`,
            `DESCRIPTION:${(b.serviceName || '')} | ${b.price ? b.price + ' CHF' : ''}${b.notes ? ' | ' + b.notes : ''}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
        );
    }
    lines.push('END:VCALENDAR');

    res.writeHead(200, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${salon.slug}-rdv.ics"`,
        'Access-Control-Allow-Origin': '*',
    });
    res.end(lines.join('\r\n'));
});

// ---- Webhooks ----

// GET /api/pro/salon/:salonId/webhooks
route('GET', '/api/pro/salon/:salonId/webhooks', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    if (salon.subscription?.plan !== 'premium') {
        return json(res, 403, { success: false, error: 'Fonctionnalité réservée au plan Premium' });
    }
    json(res, 200, { success: true, data: salon.webhooks || [] });
});

// POST /api/pro/salon/:salonId/webhooks
route('POST', '/api/pro/salon/:salonId/webhooks', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    if (salon.subscription?.plan !== 'premium') {
        return json(res, 403, { success: false, error: 'Fonctionnalité réservée au plan Premium' });
    }
    const body = await parseBody(req);
    if (!body.url || !body.url.startsWith('https://')) {
        return json(res, 400, { success: false, error: 'URL HTTPS valide requise' });
    }
    const webhooks = salon.webhooks || [];
    if (webhooks.length >= 5) return json(res, 400, { success: false, error: 'Maximum 5 webhooks atteint' });

    const newHook = {
        _id: crypto.randomBytes(8).toString('hex'),
        url: body.url,
        events: Array.isArray(body.events) ? body.events : ['booking.created'],
        active: true,
        createdAt: new Date().toISOString(),
    };
    webhooks.push(newHook);
    await db.updateSalon(params.salonId, { webhooks });
    json(res, 201, { success: true, data: newHook });
});

// DELETE /api/pro/salon/:salonId/webhooks/:webhookId
route('DELETE', '/api/pro/salon/:salonId/webhooks/:webhookId', async (req, res, params) => {
    const user = verifySalonAccess(req, params.salonId);
    if (!user || user.role !== 'owner') return json(res, 401, { success: false, error: 'Non autorisé' });
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const webhooks = (salon.webhooks || []).filter(w => w._id !== params.webhookId);
    await db.updateSalon(params.salonId, { webhooks });
    json(res, 200, { success: true });
});

// ==========================
//  PUBLIC SALON API
// ==========================

route('GET', '/api/salon/:slug', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon || !salon.active) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const [allEmployees, owners] = await Promise.all([
        db.findEmployees({ salon: String(salon._id) }),
        db.findOwners({ salon: String(salon._id) })
    ]);
    const employees = allEmployees.filter(e => e.active !== false);
    // Build unified staff list: owners first (they are bookable staff too), then employees
    const staff = [
        ...owners.filter(o => o.active !== false).map(o => ({
            _id: o._id, name: o.name, specialties: o.specialties || [],
            hours: o.hours || salon.hours || null, isOwner: true
        })),
        ...employees.map(e => ({ _id: e._id, name: e.name, specialties: e.specialties, hours: e.hours }))
    ];
    // Fetch approved client reviews (most recent 10)
    const allBookings = await db.findBookings({ salon: salon._id, reviewed: true });
    const approvedReviews = allBookings
        .filter(b => b.reviewApproved === true && b.reviewRating && b.reviewComment)
        .map(b => ({ rating: b.reviewRating, comment: b.reviewComment, clientName: b.clientName, date: b.reviewDate, service: b.serviceName }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 10);
    json(res, 200, {
        success: true,
        data: {
            name: salon.name, slug: salon.slug, description: salon.description,
            address: salon.address, phone: salon.phone, email: salon.email,
            logo: salon.logo || '',
            branding: salon.branding,
            services: (salon.services || []).filter(s => s.active),
            hours: salon.hours,
            closedDates: salon.closedDates || [],
            testimonials: salon.testimonials || [],
            employees: staff,
            rating: salon.rating, reviewCount: salon.reviewCount,
            approvedReviews,
            subscription: { plan: salon.subscription?.plan || 'pro' },
            whiteLabel: salon.whiteLabel || {},
            gallery: (salon.gallery || []).filter(Boolean),
        }
    });
});

// Public: available time slots for a given date (used by booking page to grey out taken slots)
route('GET', '/api/salon/:slug/available-slots', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false });
    const url = new URL(req.url, 'http://localhost');
    const date = url.searchParams.get('date');
    const employeeId = url.searchParams.get('employeeId') || null;
    if (!date) return json(res, 400, { success: false, error: 'date requis' });

    const bookings = await db.findBookings({ salon: salon._id, date, status: { $in: ['confirmed', 'pending'] } });
    const taken = bookings
        .filter(b => !b.employeeId || (employeeId && String(b.employeeId) === employeeId))
        .map(b => ({ start: b.time, duration: b.duration || 30 }));

    const blocks = await db.findBlocks({ salonId: salon._id, date });
    const blocked = blocks
        .filter(bl => !bl.employeeId || (employeeId && String(bl.employeeId) === employeeId))
        .map(bl => ({ start: bl.startTime, duration: timeToMinutes(bl.endTime) - timeToMinutes(bl.startTime), reason: bl.reason || null }));

    json(res, 200, { success: true, data: { takenSlots: taken, blockedSlots: blocked } });
});

route('POST', '/api/salon/:slug/book', async (req, res, params) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimit(ip, 'book', 10, 60 * 60 * 1000)) { // 10 bookings/hour per IP
        return json(res, 429, { success: false, error: 'Trop de requêtes, veuillez réessayer plus tard.' });
    }
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const body = await parseBody(req);

    if (await hasConflict(salon._id, body.employeeId || null, body.date, body.time, body.duration || 30)) {
        return json(res, 409, { success: false, error: 'Ce créneau n\'est plus disponible. Veuillez choisir un autre horaire.' });
    }

    const client = await db.findOrCreateClient(salon._id, {
        name: body.clientName, email: body.clientEmail, phone: body.clientPhone, price: body.price || 0
    });

    const booking = await db.createBooking({
        salon: salon._id, client: client._id,
        clientName: body.clientName, clientEmail: body.clientEmail, clientPhone: body.clientPhone,
        serviceName: body.serviceName, serviceIcon: body.serviceIcon || '✂️',
        price: body.price || 0, duration: body.duration || 30,
        date: body.date, time: body.time, notes: body.notes || '',
        employeeId: body.employeeId || null, employeeName: body.employeeName || null,
        status: 'confirmed', source: 'website',
        cancelToken: crypto.randomBytes(16).toString('hex'),
    });

    console.log(`  📅 Nouveau RDV: ${body.clientName} - ${body.serviceName} @ ${salon.name} (${body.date} ${body.time})`);
    json(res, 201, { success: true, data: booking });

    // Non-blocking: webhooks
    triggerWebhooks(salon, 'booking.created', {
        bookingId: String(booking._id), clientName: body.clientName,
        service: body.serviceName, date: body.date, time: body.time, price: body.price || 0,
    });

    // Non-blocking: email + push + SMS
    const baseUrlBook = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const cancelUrlBook = booking.cancelToken ? `${baseUrlBook}/cancel/${booking.cancelToken}` : null;
    const receiptUrlBook = booking.cancelToken ? `${baseUrlBook}/receipt/${booking._id}?token=${booking.cancelToken}` : null;
    if (booking.clientEmail) sendBookingConfirmation(booking, salon, cancelUrlBook, receiptUrlBook);

    // Notify assigned employee by email (non-blocking)
    if (booking.employeeId) {
        (async () => {
            const emp = await db.findEmployeeById(booking.employeeId) || await db.findOwnerById(booking.employeeId);
            if (emp?.email) sendEmployeeBookingNotification(booking, salon, emp.email);
        })();
    }

    // Push notification to owner
    sendPushToSalon(salon._id, {
        title: `📅 Nouveau RDV — ${salon.name}`,
        body: `${body.clientName} · ${body.serviceName} · ${body.date} à ${body.time}`,
        url: '/pro', tag: 'new-booking'
    });

    // SMS to client (if toggle on + phone + credits)
    if (salon.smsSettings?.clientConfirmation !== false && booking.clientPhone && (salon.smsCredits || 0) > 0) {
        sendSMSConfirmation(booking, salon).then(result => {
            if (result.success) db.updateSalon(salon._id, { smsCredits: Math.max(0, (salon.smsCredits || 0) - 1) });
        });
    }
    // SMS notification to owner (if toggle on + ownerPhone configured)
    if (salon.smsSettings?.ownerNotification && salon.smsSettings?.ownerPhone) {
        sendSMSOwnerNotification(booking, salon, salon.smsSettings.ownerPhone);
    }
});

// Paiement en ligne avant réservation — crée booking pending + session Stripe
route('POST', '/api/salon/:slug/payment/checkout', async (req, res, params) => {
    if (!stripe) return json(res, 500, { success: false, error: 'Stripe non configuré' });
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const connectId = salon.stripeConnect?.accountId;
    if (!connectId || salon.stripeConnect?.status !== 'connected') {
        return json(res, 400, { success: false, error: 'Paiement en ligne non activé pour ce salon' });
    }

    const body = await parseBody(req);
    const service = (salon.services || []).find(s => s.name === body.serviceName && s.active !== false);
    if (!service) return json(res, 404, { success: false, error: 'Service non trouvé' });

    const paymentMode = service.paymentMode || 'none';
    if (paymentMode === 'none') return json(res, 400, { success: false, error: 'Pas de paiement en ligne pour ce service' });

    // Calcule le montant à encaisser
    let amountCHF = service.price;
    if (paymentMode === 'deposit') {
        amountCHF = service.depositType === 'percent'
            ? Math.ceil(service.price * (service.depositAmount || 30) / 100)
            : (service.depositAmount || 20);
    }
    const amountCents = Math.round(amountCHF * 100);

    // Frais plateforme SalonPro (2.5% du prix total du service)
    const platformFeeCents = Math.round(service.price * 100 * 2.5 / 100);

    // Crée le booking en statut pending_payment
    const client = await db.findOrCreateClient(salon._id, {
        name: body.clientName, email: body.clientEmail, phone: body.clientPhone, price: 0
    });
    const booking = await db.createBooking({
        salon: salon._id, client: client._id,
        clientName: body.clientName, clientEmail: body.clientEmail, clientPhone: body.clientPhone,
        serviceName: body.serviceName, serviceIcon: body.serviceIcon || '✂️',
        price: service.price, duration: body.duration || service.duration || 30,
        date: body.date, time: body.time, notes: body.notes || '',
        employeeId: body.employeeId || null, employeeName: body.employeeName || null,
        status: 'pending', source: 'website',
        paymentStatus: 'pending_payment',
        amountPaid: 0,
        cancelToken: crypto.randomBytes(16).toString('hex'),
    });

    const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const label = paymentMode === 'deposit'
        ? `Acompte — ${service.name}`
        : service.name;
    const desc = paymentMode === 'deposit'
        ? `Acompte pour votre RDV du ${body.date} à ${body.time} chez ${salon.name}. Reste à payer sur place.`
        : `Réservation du ${body.date} à ${body.time} chez ${salon.name}`;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{ price_data: { currency: 'chf', product_data: { name: label, description: desc }, unit_amount: amountCents }, quantity: 1 }],
            payment_intent_data: {
                application_fee_amount: platformFeeCents,
                transfer_data: { destination: connectId },
            },
            metadata: { type: 'booking', bookingId: booking._id, salonId: salon._id, paymentMode, amountPaid: String(amountCHF) },
            customer_email: body.clientEmail || undefined,
            success_url: `${baseUrl}/s/${salon.slug}?booking_success=true&booking_id=${booking._id}`,
            cancel_url: `${baseUrl}/s/${salon.slug}?booking_cancel=true&booking_id=${booking._id}`,
        });
        console.log(`  💳 Paiement créé: ${body.clientName} - ${service.name} @ ${salon.name} (${amountCHF} CHF)`);
        json(res, 200, { success: true, data: { checkoutUrl: session.url, bookingId: booking._id } });
    } catch (err) {
        // Annule le booking pending si Stripe échoue
        await db.updateBooking(booking._id, { status: 'cancelled', paymentStatus: 'failed' }).catch(() => {});
        console.error('Stripe checkout error:', err.message);
        json(res, 500, { success: false, error: err.message });
    }
});

// OTP Store (in memory) - email -> { code, expires }
const otpStore = new Map();

// Client: generate OTP for my bookings
route('POST', '/api/salon/:slug/my-bookings/otp', async (req, res, params) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimit(ip, 'otp', 5, 15 * 60 * 1000)) { // 5 OTP requests per 15 min per IP
        return json(res, 429, { success: false, error: 'Trop de requêtes, veuillez réessayer dans quelques minutes.' });
    }
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    if (!email) return json(res, 400, { success: false, error: 'Email requis' });

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes valid
    otpStore.set(email, { code, expires });

    // Send via email if SMTP is configured. 
    const emailResult = await sendOTPEmail(email, code, salon.name).catch(e => ({ success: false, error: e.message }));

    if (emailResult && !emailResult.success) {
        return json(res, 500, { success: false, error: "Erreur lors de l'envoi de l'email : " + emailResult.error });
    }

    // For now, we return it in the response so the user can test (in dev mode)
    json(res, 200, {
        success: true,
        message: 'Code envoyé',
        _devCode: process.env.NODE_ENV === 'production' ? null : code
    });
});

// Client: verify OTP and lookup my bookings
route('POST', '/api/salon/:slug/my-bookings', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    if (!email || !code) return json(res, 400, { success: false, error: 'Email et code requis' });

    // Verify OTP
    const stored = otpStore.get(email);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
        return json(res, 401, { success: false, error: 'Code invalide ou expiré' });
    }

    // Clear OTP after successful use
    otpStore.delete(email);

    const bookings = await db.findBookings({ salon: salon._id, clientEmail: email });
    bookings.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    json(res, 200, { success: true, data: bookings });
});

// Client: cancel a booking
route('PUT', '/api/salon/:slug/bookings/:bookingId/cancel', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const booking = await db.findBookingById(params.bookingId);
    if (!booking || booking.salon.toString() !== salon._id.toString()) {
        return json(res, 404, { success: false, error: 'RDV non trouvé' });
    }
    if (booking.status === 'cancelled') {
        return json(res, 400, { success: false, error: 'Ce RDV est déjà annulé' });
    }
    if (booking.status === 'completed') {
        return json(res, 400, { success: false, error: 'Ce RDV est déjà terminé' });
    }

    const updated = await db.updateBooking(params.bookingId, { status: 'cancelled' });
    console.log(`  ❌ RDV annulé par client: ${booking.clientName} - ${booking.serviceName} @ ${booking.date}`);
    json(res, 200, { success: true, data: updated });
});

// ---- Push Notifications ----

// Helper: send push to all subscriptions of a salon's owner
async function sendPushToSalon(salonId, payload) {
    if (!process.env.VAPID_PUBLIC_KEY) return;
    try {
        const owner = await db.findOwnerBySalon(salonId);
        if (!owner?.pushSubscriptions?.length) return;
        const message = JSON.stringify(payload);
        for (const sub of owner.pushSubscriptions) {
            webpush.sendNotification(sub, message).catch(err => {
                // 410 = subscription expired/invalid
                if (err.statusCode === 410) {
                    db.updateOwner(owner._id, {
                        pushSubscriptions: owner.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint)
                    }).catch(() => {});
                }
            });
        }
    } catch (e) { console.error('Push error:', e.message); }
}

// Save push subscription for the logged-in owner
route('POST', '/api/pro/push/subscribe', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role === 'employee') return json(res, 403, { success: false });
    const body = await parseBody(req);
    if (!body.endpoint) return json(res, 400, { success: false, error: 'Subscription invalide' });

    const owner = await db.findOwnerBySalon(user.salonId);
    if (!owner) return json(res, 404, { success: false });

    const existing = owner.pushSubscriptions || [];
    // Avoid duplicates
    const filtered = existing.filter(s => s.endpoint !== body.endpoint);
    await db.updateOwner(owner._id, { pushSubscriptions: [...filtered, body] });
    console.log(`🔔 Push subscription saved for salon ${user.salonId}`);
    json(res, 200, { success: true });
});

// Remove push subscription (logout / disable)
route('POST', '/api/pro/push/unsubscribe', async (req, res) => {
    const user = verifyToken(req);
    if (!user || user.role === 'employee') return json(res, 403, { success: false });
    const body = await parseBody(req);

    const owner = await db.findOwnerBySalon(user.salonId);
    if (!owner) return json(res, 200, { success: true });

    const filtered = (owner.pushSubscriptions || []).filter(s => s.endpoint !== body.endpoint);
    await db.updateOwner(owner._id, { pushSubscriptions: filtered });
    json(res, 200, { success: true });
});

// Serve VAPID public key to browser
route('GET', '/api/pro/push/vapid-key', async (req, res) => {
    json(res, 200, { key: process.env.VAPID_PUBLIC_KEY || '' });
});

// Cancel booking via token (GET: fetch booking info)
route('GET', '/api/cancel-token/:token', async (req, res, params) => {
    const results = await db.findBookings({ cancelToken: params.token });
    const booking = results && results[0];
    if (!booking) return json(res, 404, { success: false, error: 'Lien invalide ou expiré' });
    const salon = await db.findSalonById(booking.salon);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    json(res, 200, { success: true, data: { booking, salon } });
});

// Cancel booking via token (POST: confirm cancellation)
route('POST', '/api/cancel-token/:token', async (req, res, params) => {
    const results = await db.findBookings({ cancelToken: params.token });
    const booking = results && results[0];
    if (!booking) return json(res, 404, { success: false, error: 'Lien invalide ou expiré' });

    // Check if already cancelled
    if (booking.status === 'cancelled') {
        return json(res, 400, { success: false, error: 'Ce rendez-vous est déjà annulé' });
    }

    // Check if date is in the past
    const bookingDate = new Date(booking.date + 'T' + (booking.time || '00:00') + ':00');
    if (bookingDate < new Date()) {
        return json(res, 400, { success: false, error: 'Ce rendez-vous est déjà passé' });
    }

    await db.updateBooking(booking._id, { status: 'cancelled' });
    console.log(`  ❌ RDV annulé via lien email: ${booking.clientName} - ${booking.serviceName} @ ${booking.date}`);

    const salon = await db.findSalonById(booking.salon);

    // Send cancellation emails (non-blocking)
    if (booking.clientEmail) sendCancellationConfirmation(booking, salon || { name: 'SalonPro' });
    const owner = await db.findOwnerBySalon(booking.salon);
    if (owner && owner.email) sendCancellationAlertToOwner(booking, salon || { name: 'SalonPro' }, owner.email);

    json(res, 200, { success: true });
});

// ==========================
//  CLIENT REVIEWS (public)
// ==========================

route('GET', '/api/review/:bookingId', async (req, res, params) => {
    const booking = await db.findBookingById(params.bookingId);
    if (!booking) return json(res, 404, { success: false, error: 'Introuvable' });
    const salon = await db.findSalonById(booking.salon);
    json(res, 200, { success: true, data: {
        clientName: booking.clientName, serviceName: booking.serviceName,
        date: booking.date, salonName: salon?.name || 'Salon', reviewed: booking.reviewed || false
    }});
});

route('POST', '/api/review/:bookingId', async (req, res, params) => {
    const body = await parseBody(req);
    const booking = await db.findBookingById(params.bookingId);
    if (!booking) return json(res, 404, { success: false, error: 'Introuvable' });
    if (booking.reviewed) return json(res, 409, { success: false, error: 'Avis déjà soumis' });
    const rating = Math.min(5, Math.max(1, parseInt(body.rating) || 5));
    const comment = (body.comment || '').trim().slice(0, 500);
    // reviewApproved: null = pending moderation, true = approved, false = rejected
    await db.updateBooking(booking._id, { reviewed: true, reviewRating: rating, reviewComment: comment, reviewDate: new Date().toISOString(), reviewApproved: null });
    json(res, 200, { success: true });
});

// ==========================
//  HTTP SERVER
// ==========================

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // API
    if (pathname.startsWith('/api/')) {
        // Protect Admin routes
        if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
            const tokenPayload = verifyToken(req);
            if (!tokenPayload || tokenPayload.role !== 'superadmin') {
                return json(res, 401, { success: false, error: 'Accès non autorisé' });
            }
        }

        // Protect all /api/pro/salon/* routes — requires valid JWT
        // Public pro routes (login, register, forgot/reset password, vapid-key) are excluded
        const proPublicRoutes = ['/api/pro/login', '/api/pro/register', '/api/pro/forgot-password', '/api/pro/reset-password', '/api/pro/push/vapid-key'];
        if (pathname.startsWith('/api/pro/') && !proPublicRoutes.some(r => pathname.startsWith(r))) {
            const tokenPayload = verifyToken(req);
            if (!tokenPayload) {
                return json(res, 401, { success: false, error: 'Authentification requise' });
            }
        }

        const match = routes.find(r => r.method === req.method && r.regex.test(pathname));
        if (match) {
            const params = pathname.match(match.regex)?.groups || {};
            try { await match.handler(req, res, params); }
            catch (err) {
                if (err.message === 'Request body too large') {
                    return json(res, 413, { success: false, error: 'Corps de requête trop volumineux' });
                }
                console.error('API Error:', err);
                json(res, 500, { success: false, error: 'Erreur serveur' });
            }
        } else {
            json(res, 404, { success: false, error: 'Endpoint non trouvé' });
        }
        return;
    }

    // Uploaded files
    if (pathname.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, pathname);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
        return;
    }

    // Static files
    const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    let filePath;
    let salonSlug = null;

    if (pathname.startsWith('/admin')) {
        const adminPath = pathname === '/admin' || pathname === '/admin/' ? '/admin/index.html' : pathname;
        filePath = path.join(__dirname, adminPath);
    }
    else if (pathname.startsWith('/pro')) {
        const proPath = pathname === '/pro' || pathname === '/pro/' ? '/pro/index.html' : pathname;
        filePath = path.join(__dirname, proPath);
    }
    else if (pathname.startsWith('/review/')) {
        const bookingId = pathname.split('/review/')[1]?.split('?')[0] || '';
        const reviewHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre avis</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a14;color:#f0f0f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#13131f;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;max-width:420px;width:100%;text-align:center}.logo{font-size:40px;margin-bottom:16px}.title{font-size:22px;font-weight:700;margin-bottom:8px}.sub{color:#9ca3af;font-size:.9rem;margin-bottom:28px;line-height:1.5}.stars{display:flex;justify-content:center;gap:12px;margin-bottom:24px;font-size:36px;cursor:pointer}.star{opacity:.3;transition:all .15s;user-select:none}.star.active{opacity:1}.textarea{width:100%;background:#1e1e2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0f0f0;font-family:inherit;font-size:.9rem;padding:12px;resize:none;margin-bottom:16px}.btn{width:100%;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:12px;padding:14px;font-size:1rem;font-weight:600;cursor:pointer}.success{color:#22c55e;font-size:1.2rem;font-weight:700;margin-top:16px}</style></head><body><div class="card"><div class="logo">⭐</div><div id="content"><div class="title">Votre avis compte !</div><div class="sub" id="subText">Chargement...</div><div class="stars" id="stars">${[1,2,3,4,5].map(i=>`<span class="star" data-v="${i}" onclick="setRating(${i})">★</span>`).join('')}</div><textarea class="textarea" id="comment" rows="3" placeholder="Partagez votre expérience (optionnel)..."></textarea><button class="btn" onclick="submitReview()">Envoyer mon avis</button></div></div><script>let rating=5;const id="${bookingId}";fetch('/api/review/'+id).then(r=>r.json()).then(d=>{if(d.success&&!d.data.reviewed){document.getElementById('subText').textContent=d.data.salonName+' · '+d.data.serviceName+' du '+d.data.date}else if(d.data?.reviewed){document.getElementById('content').innerHTML='<div class="success">✅ Merci pour votre avis !</div><p style="color:#9ca3af;margin-top:12px;font-size:.9rem">Votre retour a bien été enregistré.</p>'}else{document.getElementById('subText').textContent='Lien invalide ou expiré.'}});setRating(5);function setRating(v){rating=v;document.querySelectorAll('.star').forEach(s=>{s.classList.toggle('active',parseInt(s.dataset.v)<=v)})}async function submitReview(){const comment=document.getElementById('comment').value;const r=await fetch('/api/review/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment})});const d=await r.json();if(d.success){document.getElementById('content').innerHTML='<div class="success">✅ Merci pour votre avis !</div><p style="color:#9ca3af;margin-top:12px;font-size:.9rem">Votre retour a bien été enregistré.</p>'}else{alert(d.error||'Erreur')}}</script></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(reviewHtml);
        return;
    }
    else if (pathname.startsWith('/receipt/')) {
        const bookingId = pathname.split('/receipt/')[1]?.split('?')[0] || '';
        const url = new URL(req.url, 'http://localhost');
        const token = url.searchParams.get('token') || '';

        const booking = await db.findBookingById(bookingId).catch(() => null);
        const isValidToken = booking && (booking.cancelToken === token);
        // Also allow pro owners via JWT
        const proUser = verifyToken(req);
        const isProAccess = proUser && (proUser.role === 'owner' || proUser.role === 'employee');

        if (!booking || (!isValidToken && !isProAccess)) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px;color:#6b7280"><h2>Reçu introuvable</h2><p>Ce lien est invalide ou a expiré.</p></body></html>');
        }
        const salon = await db.findSalonById(booking.salon).catch(() => null);
        const salonName = salon?.name || 'SalonPro';
        const primaryColor = salon?.branding?.primaryColor || '#6366F1';

        const payStatusLabel = {
            'fully_paid': '✅ Payé en ligne',
            'deposit_paid': '💳 Acompte payé',
            'pending_payment': '⏳ Paiement en attente',
            'failed': '❌ Paiement échoué',
        }[booking.paymentStatus] || '💶 À régler sur place';

        const receiptNum = `REC-${bookingId.slice(-8).toUpperCase()}`;
        const dateISO = booking.date || '';
        const dateFR = dateISO ? new Date(dateISO + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';

        const receiptHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reçu ${receiptNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f4f5;color:#18181b;padding:24px}
.receipt{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
.header{background:${primaryColor};padding:28px 28px 20px;color:#fff}
.header h1{font-size:20px;font-weight:700;margin-bottom:4px}
.header .sub{font-size:13px;opacity:.85}
.body{padding:24px 28px}
.receipt-num{font-size:12px;color:#71717a;margin-bottom:20px;letter-spacing:.5px}
table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px}
td{padding:10px 0;color:#3f3f46}
td:first-child{color:#71717a;width:140px}
tr+tr td{border-top:1px solid #f0f0f0}
.total td{border-top:2px solid #e4e4e7!important;font-weight:700;font-size:16px;padding-top:14px}
.total td:last-child{color:${primaryColor}}
.badge{display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;margin-bottom:20px}
.badge.pending{background:#fefce8;color:#a16207;border-color:#fde047}
.salon-info{background:#fafafa;border-radius:10px;padding:14px 16px;font-size:13px;color:#6b7280;margin-bottom:20px;line-height:1.8}
.salon-info strong{color:#18181b;display:block;margin-bottom:4px}
.actions{display:flex;gap:10px}
.btn{flex:1;padding:12px;border-radius:10px;border:none;font-size:.9rem;font-weight:600;cursor:pointer;text-align:center}
.btn-print{background:${primaryColor};color:#fff}
.btn-close{background:#f4f4f5;color:#3f3f46}
@media print{body{background:#fff;padding:0}.actions{display:none!important}.receipt{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="receipt">
  <div class="header">
    <h1>🧾 Reçu de réservation</h1>
    <div class="sub">${salonName}</div>
  </div>
  <div class="body">
    <div class="receipt-num">N° ${receiptNum} · ${new Date().toLocaleDateString('fr-FR')}</div>
    <div class="badge${booking.paymentStatus === 'pending_payment' ? ' pending' : ''}">${payStatusLabel}</div>
    <table>
      <tr><td>Client</td><td><strong>${booking.clientName}</strong></td></tr>
      <tr><td>Service</td><td>${booking.serviceIcon || '✂️'} ${booking.serviceName || '—'}</td></tr>
      <tr><td>Date</td><td>${dateFR}</td></tr>
      <tr><td>Heure</td><td>${booking.time || '—'}</td></tr>
      <tr><td>Durée</td><td>${booking.duration || 30} min</td></tr>
      ${booking.employeeName ? `<tr><td>Avec</td><td>${booking.employeeName}</td></tr>` : ''}
      ${booking.amountPaid ? `<tr><td>Acompte versé</td><td>${booking.amountPaid} CHF</td></tr>` : ''}
      <tr class="total"><td>Total</td><td>${booking.price || 0} CHF</td></tr>
    </table>
    ${salon?.address || salon?.phone ? `<div class="salon-info"><strong>${salonName}</strong>${salon.address ? `📍 ${salon.address}<br>` : ''}${salon.phone ? `📞 ${salon.phone}` : ''}</div>` : ''}
    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimer</button>
      <button class="btn btn-close" onclick="window.close()">Fermer</button>
    </div>
  </div>
</div>
</body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(receiptHtml);
    }
    else if (pathname.startsWith('/cancel/')) {
        const filePath = path.join(__dirname, 'website', 'cancel.html');
        const cancelToken = pathname.split('/cancel/')[1]?.split('?')[0] || '';
        fs.readFile(filePath, (err, content) => {
            if (err) { res.writeHead(404); return res.end('Not found'); }
            let html = content.toString();
            html = html.replace('</head>', `<script>window.CANCEL_TOKEN="${cancelToken}";</script>\n</head>`);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        });
        return;
    }
    else if (pathname.startsWith('/s/')) {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            salonSlug = parts[1];
            const rest = parts.slice(2);
            if (rest.length > 0) {
                filePath = path.join(__dirname, 'website', rest.join('/'));
            } else {
                filePath = path.join(__dirname, 'website', 'index.html');
            }
        } else {
            filePath = path.join(__dirname, 'website', 'index.html');
        }
    }
    // ---- Routes pour le SaaS Landing Page ----
    else if (pathname === '/sw.js') {
        filePath = path.join(__dirname, 'sw.js');
    }
    else if (pathname === '/' && req.method === 'GET') {
        filePath = path.join(__dirname, 'saas/index.html');
    }
    else if (pathname.startsWith('/saas/')) {
        const cleanUrl = pathname.split('?')[0];
        filePath = path.join(__dirname, cleanUrl);
    }
    // Redirect old testing root to the saas page just in case
    else if (pathname === '/website/index.html') {
        res.writeHead(302, { Location: '/' });
        return res.end();
    }
    else {
        filePath = path.join(__dirname, 'website', pathname === '/' ? 'index.html' : pathname);
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            fs.readFile(path.join(__dirname, 'saas/404.html'), (err404, page404) => {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(page404 || '<h1>404 - Page non trouvée</h1>');
            });
            return;
        } else {
            if (salonSlug && ext === '.html') {
                let html = content.toString();
                html = html.replace(/href="(css\/[^"]+)"/g, `href="/s/${salonSlug}/$1"`);
                html = html.replace(/src="(js\/[^"]+)"/g, `src="/s/${salonSlug}/$1"`);

                // Async: fetch salon for server-side SEO injection
                db.findSalonBySlug(salonSlug).then(salon => {
                    if (salon) {
                        const name = salon.name || 'SalonPro';
                        const city = salon.city || (salon.address ? salon.address.split(',')[0] : '');
                        const desc = `Prenez rendez-vous en ligne chez ${name}${city ? ' à ' + city : ''}. Réservation rapide, disponible 24h/24. Confirmez votre RDV en quelques clics.`;
                        const safeDesc = desc.replace(/"/g, '&quot;');
                        const safeName = name.replace(/"/g, '&quot;');
                        const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
                        const pageUrl = `${baseUrl}/s/${salonSlug}`;
                        const img = salon.logo || '';

                        const seoHead = [
                            `<title>${safeName} | Réservation en ligne</title>`,
                            `<meta name="description" content="${safeDesc}">`,
                            `<meta property="og:title" content="${safeName} | Réservation en ligne">`,
                            `<meta property="og:description" content="${safeDesc}">`,
                            `<meta property="og:type" content="local.business">`,
                            `<meta property="og:url" content="${pageUrl}">`,
                            img ? `<meta property="og:image" content="${img}">` : '',
                            `<link rel="canonical" href="${pageUrl}">`,
                            `<script type="application/ld+json">${JSON.stringify({
                                '@context': 'https://schema.org',
                                '@type': 'LocalBusiness',
                                name,
                                url: pageUrl,
                                ...(img && { image: img }),
                                ...(salon.phone && { telephone: salon.phone }),
                                ...(salon.address && { address: { '@type': 'PostalAddress', streetAddress: salon.address } }),
                            })}</script>`,
                        ].filter(Boolean).join('\n  ');

                        // Remove generic placeholder tags
                        html = html.replace(/<title>[^<]*<\/title>/i, '');
                        html = html.replace(/<meta name="description"[^>]*>/i, '');
                        html = html.replace(/<meta name="keywords"[^>]*>/i, '');
                        // Replace favicon with salon logo if available, otherwise ✂️
                        if (img) {
                            html = html.replace(/<link rel="icon"[^>]*>/i, `<link rel="icon" href="${img}" type="image/png">`);
                        } else {
                            html = html.replace("font-size='90'>💈</text>", "font-size='90'>✂️</text>");
                        }
                        // Inject SEO tags
                        html = html.replace('<head>', `<head>\n  ${seoHead}`);
                    }
                    html = html.replace('</head>', `<script>window.SALON_SLUG="${salonSlug}";</script>\n</head>`);
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(html);
                }).catch(() => {
                    html = html.replace('</head>', `<script>window.SALON_SLUG="${salonSlug}";</script>\n</head>`);
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(html);
                });
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        }
    });
});

// ==========================
//  START
// ==========================

async function start() {
    try {
        await db.connectDB();
        await db.seedIfEmpty();
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    server.listen(PORT, () => {
        console.log('');
        console.log('  💈 BarberPro SaaS Platform v2.0');
        console.log('  ════════════════════════════════════');
        console.log('  📦 Mode: MongoDB Atlas (persistent)');
        console.log('  ════════════════════════════════════');
        console.log(`  🔧 Super Admin:   http://localhost:${PORT}/admin`);
        console.log(`  💇 Espace Pro:    http://localhost:${PORT}/pro`);
        console.log(`  🌐 Salon Demo:    http://localhost:${PORT}/s/elite-barber-paris`);
        console.log(`  📡 API:           http://localhost:${PORT}/api`);
        console.log('  ════════════════════════════════════');
        console.log('  ✅ Prêt ! Ouvre une des URLs ci-dessus');
        console.log('');
    });
}

start();
