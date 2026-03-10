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
const { sendBookingConfirmation, sendOTPEmail } = require('./email');
const cloudinary = require('cloudinary').v2;

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
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- Helpers ----
function slugify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        + '-' + crypto.randomBytes(2).toString('hex');
}

function json(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({}); }
        });
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

function createToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        // Basic verify sig
        const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
        if (sig !== parts[2]) return null;
        return payload;
    } catch { return null; }
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

route('POST', '/api/admin/login', async (req, res) => {
    const body = await parseBody(req);
    if (!body.password || body.password !== ADMIN_PASSWORD) {
        return json(res, 401, { success: false, error: 'Mot de passe incorrect' });
    }
    const token = createToken({ role: 'superadmin' });
    json(res, 200, { success: true, token });
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
    const slug = slugify(body.name || 'salon');

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
    if (body.address) updates.address = body.address;
    if (body.phone) updates.phone = body.phone;
    if (body.email) updates.email = body.email;
    if (body.description) updates.description = body.description;
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

    const subscription = { ...(salon.subscription || {}), plan: body.plan };
    await db.updateSalon(params.id, { subscription });
    json(res, 200, { success: true, message: 'Plan mis à jour', data: subscription });
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
//  PUBLIC SALON API
// ==========================

route('GET', '/api/salon/:slug', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const employees = await db.findEmployees({ salon: salon._id });
    json(res, 200, {
        success: true,
        data: {
            _id: salon._id,
            name: salon.name,
            slug: salon.slug,
            description: salon.description,
            address: salon.address,
            phone: salon.phone,
            email: salon.email,
            logo: salon.logo,
            branding: salon.branding,
            services: salon.services,
            hours: salon.hours,
            gallery: salon.gallery || [],
            testimonials: salon.testimonials || [],
            employees: employees.map(e => ({ _id: e._id, name: e.name, specialties: e.specialties })),
            rating: salon.rating,
            reviewCount: salon.reviewCount,
        }
    });
});

// ==========================
//  BARBER (OWNER) API
// ==========================

route('POST', '/api/barber/login', async (req, res) => {
    const body = await parseBody(req);
    if (!body.email || !body.password) {
        return json(res, 400, { success: false, error: 'Email et mot de passe requis' });
    }

    // Check Owner First
    const owner = await db.findOwnerByEmail(body.email);
    if (owner) {
        const match = await db.comparePassword(owner, body.password);
        if (match) {
            const salon = await db.findSalonById(owner.salon);
            const token = createToken({ ownerId: owner._id, salonId: owner.salon, role: 'owner' });
            return json(res, 200, {
                success: true,
                token,
                user: { id: owner._id, salonId: owner.salon, name: owner.name, email: owner.email, role: 'owner' },
                salon: salon || null,
                subscription: salon?.subscription || null
            });
        }
    }

    // Check Employee Second
    const employee = await db.findEmployeeByEmail(body.email);
    if (employee) {
        if (!employee.active) {
            return json(res, 403, { success: false, error: 'Accès désactivé pour cet employé' });
        }
        const match = await db.compareEmployeePassword(employee, body.password);
        if (match) {
            const salon = await db.findSalonById(employee.salon);
            // Verify if salon active
            if (!salon || !salon.active) {
                return json(res, 403, { success: false, error: 'Le salon associé est inactif' });
            }
            const token = createToken({ employeeId: employee._id, salonId: employee.salon, role: 'employee' });
            return json(res, 200, {
                success: true,
                token,
                user: { id: employee._id, salonId: employee.salon, name: employee.name, email: employee.email, role: 'employee' },
                salon: salon || null
            });
        }
    }

    // If neither matched
    json(res, 401, { success: false, error: 'Email ou mot de passe incorrect' });
});

route('GET', '/api/barber/salon/:salonId', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const employees = await db.findEmployees({ salon: params.salonId });
    const owner = await db.findOwnerBySalon(params.salonId);
    json(res, 200, { success: true, data: { ...salon, employees, owner: owner ? db.ownerToJSON(owner) : null } });
});

route('PUT', '/api/barber/salon/:salonId', async (req, res, params) => {
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
route('POST', '/api/barber/salon/:salonId/logo', async (req, res, params) => {
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

route('DELETE', '/api/barber/salon/:salonId/logo', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    if (salon.logo && salon.logo.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, salon.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.updateSalon(params.salonId, { logo: '' });
    json(res, 200, { success: true, message: 'Logo supprimé' });
});

// Stats
route('GET', '/api/barber/salon/:salonId/stats', async (req, res, params) => {
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

// Services
route('GET', '/api/barber/salon/:salonId/services', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    json(res, 200, { success: true, data: salon.services || [] });
});

route('POST', '/api/barber/salon/:salonId/services', async (req, res, params) => {
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

route('PUT', '/api/barber/salon/:salonId/services/:svcId', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    const body = await parseBody(req);
    const services = (salon.services || []).map(s => s._id === params.svcId ? { ...s, ...body } : s);
    await db.updateSalon(params.salonId, { services });
    json(res, 200, { success: true, data: services.find(s => s._id === params.svcId) });
});

route('DELETE', '/api/barber/salon/:salonId/services/:svcId', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    const services = (salon.services || []).filter(s => s._id !== params.svcId);
    await db.updateSalon(params.salonId, { services });
    json(res, 200, { success: true, message: 'Service supprimé' });
});

// Branding & Hours
route('PUT', '/api/barber/salon/:salonId/branding', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const body = await parseBody(req);

    const branding = {
        primaryColor: body.primaryColor || salon.branding?.primaryColor || '#6366F1',
        accentColor: body.accentColor || salon.branding?.accentColor || '#818CF8',
        heroTitle: body.heroTitle || salon.branding?.heroTitle || `Bienvenue chez ${salon.name}`,
        heroSubtitle: body.heroSubtitle || salon.branding?.heroSubtitle || 'Votre salon de coiffure premium',
        instagram: body.instagram !== undefined ? body.instagram : (salon.branding?.instagram || ''),
        facebook: body.facebook !== undefined ? body.facebook : (salon.branding?.facebook || ''),
        tiktok: body.tiktok !== undefined ? body.tiktok : (salon.branding?.tiktok || ''),
        youtube: body.youtube !== undefined ? body.youtube : (salon.branding?.youtube || ''),
    };

    const updated = await db.updateSalon(params.salonId, { branding });
    json(res, 200, { success: true, data: updated });
});

// ---- Gallery ----
route('POST', '/api/barber/salon/:salonId/gallery', async (req, res, params) => {
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

route('DELETE', '/api/barber/salon/:salonId/gallery/:photoId', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });

    const gallery = (salon.gallery || []).filter(p => p._id !== params.photoId);
    await db.updateSalon(params.salonId, { gallery });
    json(res, 200, { success: true, message: 'Photo supprimée' });
});

// Retro-compatibility (old logo upload fallback just in case)
route('POST', '/api/barber/salon/:salonId/logo_old', async (req, res, params) => {
    json(res, 410, { success: false, error: 'Gone' });
});

route('DELETE', '/api/barber/salon/:salonId/logo_old', async (req, res, params) => {
    json(res, 410, { success: false, error: 'Gone' });
});

// ---- Testimonials ----
route('GET', '/api/barber/salon/:salonId/testimonials', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    json(res, 200, { success: true, data: salon.testimonials || [] });
});

route('POST', '/api/barber/salon/:salonId/testimonials', async (req, res, params) => {
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

route('PUT', '/api/barber/salon/:salonId/testimonials/:tid', async (req, res, params) => {
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

route('DELETE', '/api/barber/salon/:salonId/testimonials/:tid', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    if (salon.subscription?.plan === 'starter' || salon.plan === 'starter') return json(res, 403, { success: false, error: 'Fonctionnalité non disponible avec le plan Starter' });

    const testimonials = (salon.testimonials || []).filter(t => t._id !== params.tid);
    await db.updateSalon(params.salonId, { testimonials });
    json(res, 200, { success: true, message: 'Avis supprimé' });
});

// Employees and Team Management
route('GET', '/api/barber/salon/:salonId/employees', async (req, res, params) => {
    const employees = await db.findEmployees({ salon: params.salonId });
    const owners = await db.findOwners({ salon: params.salonId });

    const team = [
        ...owners.map(o => ({ ...db.ownerToJSON(o), role: 'owner' })),
        ...employees.map(e => ({ ...db.employeeToJSON(e), role: 'employee' }))
    ];
    json(res, 200, { success: true, data: team });
});

route('POST', '/api/barber/salon/:salonId/employees', async (req, res, params) => {
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

route('DELETE', '/api/barber/salon/:salonId/employees/:empId', async (req, res, params) => {
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

// Bookings
route('GET', '/api/barber/salon/:salonId/bookings', async (req, res, params) => {
    const user = verifyToken(req);
    const url = new URL(req.url, `http://localhost`);
    const dateFilter = url.searchParams.get('date');
    const query = { salon: params.salonId };
    if (dateFilter) query.date = dateFilter;
    if (user?.role === 'employee') {
        query.employeeId = user.employeeId;
    }
    const bookings = await db.findBookings(query);
    json(res, 200, { success: true, data: bookings });
});

route('PUT', '/api/barber/salon/:salonId/bookings/:bookingId', async (req, res, params) => {
    const body = await parseBody(req);
    const booking = await db.updateBooking(params.bookingId, { status: body.status });
    if (!booking) return json(res, 404, { success: false });
    json(res, 200, { success: true, data: booking });
});

// Manual booking creation (from barber panel)
route('POST', '/api/barber/salon/:salonId/bookings', async (req, res, params) => {
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

    const booking = await db.createBooking({
        salon: params.salonId, client: client._id,
        clientName: body.clientName, clientEmail: body.clientEmail || '', clientPhone: body.clientPhone || '',
        serviceName: body.serviceName || '', serviceIcon: body.serviceIcon || '✂️',
        price: body.price || 0, duration: body.duration || 30,
        date: body.date, time: body.time, notes: body.notes || '',
        employeeId, employeeName,
        status: 'confirmed', source: body.source || 'manual',
    });

    console.log(`  📅 RDV manuel: ${body.clientName} - ${body.serviceName} @ ${body.date} ${body.time}`);
    json(res, 201, { success: true, data: booking });

    // Send confirmation email (non-blocking)
    const salon = await db.findSalonById(params.salonId);
    if (salon && booking.clientEmail) sendBookingConfirmation(booking, salon);
});

// Clients
route('GET', '/api/barber/salon/:salonId/clients', async (req, res, params) => {
    const clients = await db.findClients({ salon: params.salonId });
    json(res, 200, { success: true, data: clients });
});

// SMS Status
route('GET', '/api/barber/salon/:salonId/sms-status', async (req, res, params) => {
    const salon = await db.findSalonById(params.salonId);
    if (!salon) return json(res, 404, { success: false });
    json(res, 200, {
        success: true,
        data: {
            enabled: salon.smsReminders?.enabled || false,
            status: salon.smsReminders?.status || 'En développement',
            message: 'Les rappels SMS sont en cours de développement.'
        }
    });
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

// Register + Checkout in one step
route('POST', '/api/stripe/register-and-checkout', async (req, res) => {
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

    // Generate slug from salon name
    const slug = salonName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

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
        await db.createOwner({
            salon: salon._id,
            name: ownerName,
            email: email.toLowerCase(),
            password: password,
            phone: phone || '',
            role: 'owner',
        });

        // Welcome email will be sent after Stripe payment confirmation (via webhook)

        console.log(`✅ Nouveau salon créé: ${salonName} (${plan}) par ${ownerName}`);

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
                metadata: { plan: plan || 'pro', salonId: salon._id, salonName, ownerEmail: email },
                customer_email: email,
                subscription_data: { trial_period_days: 14 },
                success_url: `${baseUrl}/saas/success.html?plan=${plan || 'pro'}&salon=${encodeURIComponent(salonName)}`,
                cancel_url: `${baseUrl}/saas/index.html?checkout=cancel`
            });

            console.log(`[API Stripe] Session créée: ${session.id}, URL: ${session.url}`);
            return json(res, 200, { success: true, data: { url: session.url, sessionId: session.id, salonSlug: slug } });
        } else {
            // Stripe not configured, just return success
            console.warn('[API Stripe] Stripe non configuré, retour URL vide');
            return json(res, 200, { success: true, data: { salonSlug: slug, message: 'Salon créé (Stripe non configuré)' } });
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

            // Now send welcome email
            try {
                const { sendWelcomeEmail } = require('./email');
                if (sendWelcomeEmail && ownerEmail) {
                    sendWelcomeEmail(ownerEmail, session.metadata?.salonName || 'Votre salon', salonName || 'Votre salon', plan);
                }
            } catch (e) { console.log('Welcome email error:', e.message); }
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

    json(res, 200, { received: true });
});

// ==========================
//  PUBLIC SALON API
// ==========================

route('GET', '/api/salon/:slug', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon || !salon.active) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const employees = await db.findEmployees({ salon: salon._id });
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
            employees: employees.map(e => ({ _id: e._id, name: e.name, specialties: e.specialties })),
            rating: salon.rating, reviewCount: salon.reviewCount,
        }
    });
});

route('POST', '/api/salon/:slug/book', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });
    const body = await parseBody(req);

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
    });

    console.log(`  📅 Nouveau RDV: ${body.clientName} - ${body.serviceName} @ ${salon.name} (${body.date} ${body.time})`);
    json(res, 201, { success: true, data: booking });

    // Send confirmation email (non-blocking)
    if (booking.clientEmail) sendBookingConfirmation(booking, salon);
});

// OTP Store (in memory) - email -> { code, expires }
const otpStore = new Map();

// Client: generate OTP for my bookings
route('POST', '/api/salon/:slug/my-bookings/otp', async (req, res, params) => {
    const salon = await db.findSalonBySlug(params.slug);
    if (!salon) return json(res, 404, { success: false, error: 'Salon non trouvé' });

    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    if (!email) return json(res, 400, { success: false, error: 'Email requis' });

    // Generate 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
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

        const match = routes.find(r => r.method === req.method && r.regex.test(pathname));
        if (match) {
            const params = pathname.match(match.regex)?.groups || {};
            try { await match.handler(req, res, params); }
            catch (err) { console.error('API Error:', err); json(res, 500, { success: false, error: 'Erreur serveur' }); }
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
        const proPath = pathname === '/pro' || pathname === '/pro/' ? '/barber/index.html' : pathname.replace(/^\/pro/, '/barber');
        filePath = path.join(__dirname, proPath);
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
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - Page non trouvée</h1>');
        } else {
            if (salonSlug && ext === '.html') {
                let html = content.toString();
                html = html.replace(/href="(css\/[^"]+)"/g, `href="/s/${salonSlug}/$1"`);
                html = html.replace(/src="(js\/[^"]+)"/g, `src="/s/${salonSlug}/$1"`);
                html = html.replace('</head>', `<script>window.SALON_SLUG="${salonSlug}";</script>\n</head>`);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(html);
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
