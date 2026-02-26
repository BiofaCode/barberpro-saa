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

function createToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
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

route('GET', '/api/admin/stats', async (req, res) => {
    const totalSalons = await db.countSalons();
    const totalOwners = await db.countOwners();
    const totalEmployees = await db.countEmployees();
    const totalBookings = await db.countAllBookings();
    const totalClients = await db.countAllClients();
    const salons = await db.findSalons();
    const revenueEstimate = salons.reduce((sum, s) => sum + (s.subscription?.price || 29.99), 0);
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
            primaryColor: body.branding?.primaryColor || '#C9A96E',
            accentColor: body.branding?.accentColor || '#D4B97E',
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
        subscription: { plan: body.subscription?.plan || 'pro', status: 'active', price: body.subscription?.plan === 'premium' ? 49.99 : 29.99 },
        smsReminders: { enabled: false, status: 'En développement' },
        rating: 0,
        reviewCount: 0,
        active: true,
    });

    const owner = await db.createOwner({
        salon: salon._id,
        name: body.ownerName || 'Propriétaire',
        email: body.ownerEmail || '',
        password: body.ownerPassword || 'barber123',
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

// ==========================
//  BARBER (OWNER) API
// ==========================

route('POST', '/api/barber/login', async (req, res) => {
    const body = await parseBody(req);
    const owner = await db.findOwnerByEmail(body.email || '');
    if (!owner) return json(res, 401, { success: false, error: 'Email ou mot de passe incorrect' });

    const match = await db.comparePassword(owner, body.password);
    if (!match) return json(res, 401, { success: false, error: 'Email ou mot de passe incorrect' });

    const salon = await db.findSalonById(owner.salon);
    const token = createToken({ ownerId: owner._id, salonId: owner.salon });

    json(res, 200, {
        success: true,
        token,
        user: { id: owner._id, salonId: owner.salon, name: owner.name, email: owner.email, role: 'owner' },
        salon: salon || null
    });
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

    const boundary = contentType.split('boundary=')[1];
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString('binary').split(`--${boundary}`);

        for (const part of parts) {
            if (part.includes('filename=')) {
                const filenameMatch = part.match(/filename="([^"]+)"/);
                if (!filenameMatch) continue;

                const ext = path.extname(filenameMatch[1]).toLowerCase();
                if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) continue;

                const headerEnd = part.indexOf('\r\n\r\n') + 4;
                let fileData = part.substring(headerEnd);
                fileData = fileData.substring(0, fileData.lastIndexOf('\r\n'));

                const filename = `logo_${params.salonId}_${Date.now()}${ext}`;
                const filePath = path.join(UPLOAD_DIR, filename);
                fs.writeFileSync(filePath, fileData, 'binary');

                // Delete old logo if exists
                if (salon.logo && salon.logo.startsWith('/uploads/')) {
                    const oldPath = path.join(__dirname, salon.logo);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }

                await db.updateSalon(params.salonId, { logo: `/uploads/${filename}` });
                return json(res, 200, { success: true, data: { logo: `/uploads/${filename}` } });
            }
        }
        json(res, 400, { success: false, error: 'Aucun fichier trouvé' });
    });
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
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await db.findBookings({ salon: params.salonId, date: today });
    const totalBookings = await db.countBookings({ salon: params.salonId });
    const totalClients = await db.countClients({ salon: params.salonId });
    const allBookings = await db.findBookings({ salon: params.salonId });
    const totalRevenue = allBookings.reduce((s, b) => s + (b.price || 0), 0);
    const todayRevenue = todayBookings.reduce((s, b) => s + (b.price || 0), 0);

    json(res, 200, { success: true, data: { todayBookings: todayBookings.length, todayRevenue, totalBookings, totalClients, totalRevenue } });
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
    const svc = { _id: crypto.randomBytes(12).toString('hex'), name: body.name, icon: body.icon || '✂️', price: body.price || 0, duration: body.duration || 30, description: body.description || '', active: true };
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

// Employees
route('GET', '/api/barber/salon/:salonId/employees', async (req, res, params) => {
    const employees = await db.findEmployees({ salon: params.salonId });
    json(res, 200, { success: true, data: employees });
});

route('POST', '/api/barber/salon/:salonId/employees', async (req, res, params) => {
    const body = await parseBody(req);
    const emp = await db.createEmployee({ salon: params.salonId, name: body.name, email: body.email || '', phone: body.phone || '', specialties: body.specialties || [] });
    json(res, 201, { success: true, data: emp });
});

route('DELETE', '/api/barber/salon/:salonId/employees/:empId', async (req, res, params) => {
    await db.deleteEmployee(params.empId);
    json(res, 200, { success: true, message: 'Employé supprimé' });
});

// Bookings
route('GET', '/api/barber/salon/:salonId/bookings', async (req, res, params) => {
    const url = new URL(req.url, `http://localhost`);
    const dateFilter = url.searchParams.get('date');
    const query = { salon: params.salonId };
    if (dateFilter) query.date = dateFilter;
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

    const booking = await db.createBooking({
        salon: params.salonId, client: client._id,
        clientName: body.clientName, clientEmail: body.clientEmail || '', clientPhone: body.clientPhone || '',
        serviceName: body.serviceName || '', serviceIcon: body.serviceIcon || '✂️',
        price: body.price || 0, duration: body.duration || 30,
        date: body.date, time: body.time, notes: body.notes || '',
        employeeId: body.employeeId || null, employeeName: body.employeeName || null,
        status: 'confirmed', source: body.source || 'manual',
    });

    console.log(`  📅 RDV manuel: ${body.clientName} - ${body.serviceName} @ ${body.date} ${body.time}`);
    json(res, 201, { success: true, data: booking });
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

server.listen(PORT, () => {
    console.log('');
    console.log('  💈 BarberPro SaaS Platform v2.0');
    console.log('  ════════════════════════════════════');
    console.log('  📦 Mode: JSON Database (dev)');
    console.log('  ════════════════════════════════════');
    console.log(`  🔧 Super Admin:   http://localhost:${PORT}/admin`);
    console.log(`  💇 Espace Pro:    http://localhost:${PORT}/pro`);
    console.log(`  🌐 Salon Demo:    http://localhost:${PORT}/s/elite-barber-paris`);
    console.log(`  📡 API:           http://localhost:${PORT}/api`);
    console.log('  ════════════════════════════════════');
    console.log('  ✅ Prêt ! Ouvre une des URLs ci-dessus');
    console.log('');
});
