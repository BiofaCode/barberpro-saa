/* ============================================
   Database Adapter - JSON (dev) & MongoDB (prod)
   ============================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function genId() { return crypto.randomBytes(12).toString('hex'); } // Same length as MongoDB ObjectId

// ---- JSON Storage ----
function loadDB() {
    if (!fs.existsSync(DB_FILE)) return null;
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return null; }
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }

function getDB() {
    let db = loadDB();
    if (!db) {
        db = createInitialData();
        saveDB(db);
    }
    return db;
}

function createInitialData() {
    const salonId = genId();
    const ownerId = genId();
    const emp1Id = genId();
    const emp2Id = genId();
    const hashedPassword = bcrypt.hashSync('barber123', 10);

    return {
        salons: [{
            _id: salonId,
            slug: 'elite-barber-paris',
            name: 'Elite Barber Paris',
            description: 'Salon de coiffure premium au cœur de Paris',
            address: '12 Rue du Style, 75001 Paris',
            phone: '06 12 34 56 78',
            email: 'contact@elitebarber.fr',
            logo: '',
            branding: {
                primaryColor: '#6366F1',
                accentColor: '#818CF8',
                heroTitle: "L'Art de la Coiffure Masculine",
                heroSubtitle: 'Excellence, style et précision depuis 2018',
            },
            services: [
                { _id: genId(), name: 'Coupe Classique', icon: '✂️', price: 25, duration: 30, description: 'Coupe précise et élégante', active: true },
                { _id: genId(), name: 'Taille de Barbe', icon: '🪒', price: 15, duration: 20, description: 'Sculpture et entretien barbe', active: true },
                { _id: genId(), name: 'Pack Premium', icon: '💎', price: 55, duration: 60, description: 'Coupe + barbe + soin visage', active: true },
                { _id: genId(), name: 'Coloration', icon: '🎨', price: 40, duration: 45, description: 'Coloration professionnelle', active: true },
                { _id: genId(), name: 'Soin Capillaire', icon: '🧴', price: 30, duration: 35, description: 'Traitement profond cheveux', active: true },
                { _id: genId(), name: 'Coupe Enfant', icon: '👶', price: 18, duration: 25, description: 'Coupe moins de 12 ans', active: true },
            ],
            hours: {
                lundi: { open: '09:00', close: '19:00' },
                mardi: { open: '09:00', close: '19:00' },
                mercredi: { open: '09:00', close: '19:00' },
                jeudi: { open: '09:00', close: '19:00' },
                vendredi: { open: '09:00', close: '19:00' },
                samedi: { open: '09:00', close: '18:00' },
            },
            subscription: { plan: 'premium', status: 'active', price: 49.99 },
            smsReminders: { enabled: false, status: 'En développement' },
            rating: 4.9,
            reviewCount: 125,
            active: true,
            createdAt: new Date().toISOString(),
        }],
        owners: [{
            _id: ownerId,
            salon: salonId,
            name: 'Ahmed Mansouri',
            email: 'ahmed@elitebarber.fr',
            password: hashedPassword,
            phone: '06 12 34 56 78',
            role: 'owner',
        }],
        employees: [
            { _id: emp1Id, salon: salonId, name: 'Ahmed Mansouri', email: 'ahmed@elitebarber.fr', specialties: ['Coupe', 'Barbe', 'Coloration'], active: true },
            { _id: emp2Id, salon: salonId, name: 'Karim Benali', email: 'karim@elitebarber.fr', specialties: ['Coupe', 'Barbe'], active: true },
        ],
        clients: [],
        bookings: [],
    };
}

// ============ ADAPTER (mimics Mongoose-like API for JSON) ============

const db = {
    // ---- Salons ----
    async findSalons(query = {}) {
        const data = getDB();
        return data.salons.filter(s => {
            for (const k in query) { if (s[k] !== query[k]) return false; }
            return true;
        });
    },
    async findSalonById(id) {
        return getDB().salons.find(s => s._id === id) || null;
    },
    async findSalonBySlug(slug) {
        return getDB().salons.find(s => s.slug === slug) || null;
    },
    async createSalon(data) {
        const d = getDB();
        const salon = { _id: genId(), ...data, createdAt: new Date().toISOString() };
        d.salons.push(salon);
        saveDB(d);
        return salon;
    },
    async updateSalon(id, updates) {
        const d = getDB();
        const idx = d.salons.findIndex(s => s._id === id);
        if (idx === -1) return null;
        Object.assign(d.salons[idx], updates);
        saveDB(d);
        return d.salons[idx];
    },
    async deleteSalon(id) {
        const d = getDB();
        d.salons = d.salons.filter(s => s._id !== id);
        d.owners = d.owners.filter(o => o.salon !== id);
        d.employees = d.employees.filter(e => e.salon !== id);
        d.clients = d.clients.filter(c => c.salon !== id);
        d.bookings = d.bookings.filter(b => b.salon !== id);
        saveDB(d);
    },

    // ---- Owners ----
    async findOwners(query = {}) {
        const d = getDB();
        return d.owners.filter(o => !query.salon || o.salon === query.salon);
    },
    async findOwnerByEmail(email) {
        return getDB().owners.find(o => o.email === email.toLowerCase()) || null;
    },
    async findOwnerBySalon(salonId) {
        return getDB().owners.find(o => o.salon === salonId) || null;
    },
    async createOwner(data) {
        const d = getDB();
        const pwd = await bcrypt.hash(data.password, 10);
        const owner = { _id: genId(), ...data, password: pwd, email: data.email.toLowerCase() };
        d.owners.push(owner);
        saveDB(d);
        return owner;
    },
    async comparePassword(owner, password) {
        return bcrypt.compare(password, owner.password);
    },
    ownerToJSON(owner) {
        const o = { ...owner };
        delete o.password;
        return o;
    },
    async deleteOwner(id) {
        const d = getDB();
        d.owners = d.owners.filter(o => o._id !== id);
        saveDB(d);
    },
    async updateOwner(id, updates) {
        const d = getDB();
        const idx = d.owners.findIndex(o => o._id === id);
        if (idx === -1) return null;
        Object.assign(d.owners[idx], updates);
        if (updates.password) d.owners[idx].password = await bcrypt.hash(updates.password, 10);
        saveDB(d);
        return d.owners[idx];
    },

    // ---- Employees ----
    async findEmployees(query = {}) {
        return getDB().employees.filter(e => {
            for (const k in query) { if (e[k] !== query[k]) return false; }
            return true;
        });
    },
    async findEmployeeByEmail(email) {
        return getDB().employees.find(e => e.email === email.toLowerCase()) || null;
    },
    async createEmployee(data) {
        const d = getDB();
        let pwd = null;
        if (data.password) {
            pwd = await bcrypt.hash(data.password, 10);
        }
        const emp = {
            _id: genId(),
            ...data,
            email: data.email ? data.email.toLowerCase() : '',
            password: pwd,
            active: true
        };
        d.employees.push(emp);
        saveDB(d);
        return emp;
    },
    async compareEmployeePassword(emp, password) {
        if (!emp.password) return false;
        return bcrypt.compare(password, emp.password);
    },
    employeeToJSON(emp) {
        const e = { ...emp };
        delete e.password;
        return e;
    },
    async deleteEmployee(id) {
        const d = getDB();
        d.employees = d.employees.filter(e => e._id !== id);
        saveDB(d);
    },

    // ---- Clients ----
    async findClients(query = {}) {
        return getDB().clients.filter(c => {
            for (const k in query) { if (c[k] !== query[k]) return false; }
            return true;
        });
    },
    async findOrCreateClient(salonId, data) {
        const d = getDB();
        let client = d.clients.find(c => c.salon === salonId && (c.email === data.email || c.phone === data.phone));
        if (!client) {
            client = { _id: genId(), salon: salonId, name: data.name, email: data.email || '', phone: data.phone || '', totalBookings: 0, totalSpent: 0 };
            d.clients.push(client);
        }
        client.totalBookings++;
        client.totalSpent += data.price || 0;
        client.lastVisit = new Date().toISOString();
        saveDB(d);
        return client;
    },
    async countClients(query = {}) {
        return (await this.findClients(query)).length;
    },

    // ---- Bookings ----
    async findBookings(query = {}) {
        return getDB().bookings.filter(b => {
            for (const k in query) { if (b[k] !== query[k]) return false; }
            return true;
        }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    },
    async createBooking(data) {
        const d = getDB();
        const booking = { _id: genId(), ...data, createdAt: new Date().toISOString() };
        d.bookings.push(booking);
        saveDB(d);
        return booking;
    },
    async updateBooking(id, updates) {
        const d = getDB();
        const idx = d.bookings.findIndex(b => b._id === id);
        if (idx === -1) return null;
        Object.assign(d.bookings[idx], updates);
        saveDB(d);
        return d.bookings[idx];
    },
    async countBookings(query = {}) {
        return (await this.findBookings(query)).length;
    },

    // ---- Counts ----
    async countSalons() { return getDB().salons.length; },
    async countOwners() { return getDB().owners.length; },
    async countEmployees(query = {}) { return (await this.findEmployees(query)).length; },
    async countAllBookings() { return getDB().bookings.length; },
    async countAllClients() { return getDB().clients.length; },
};

module.exports = db;
