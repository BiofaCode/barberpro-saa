/* ============================================
   Database Adapter - MongoDB Atlas
   ============================================ */

const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ---- Connection ----
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://info_db_user:mrQ0tFyyilw4hpUu@salonpro.kpketkg.mongodb.net/';
const DB_NAME = 'salonpro';

let client;
let dbInstance;

async function connectDB() {
    if (dbInstance) return dbInstance;

    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log('   URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

    try {
        client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        await client.connect();
        dbInstance = client.db(DB_NAME);

        // Quick ping to verify connection
        await dbInstance.command({ ping: 1 });
        console.log('✅ Connected to MongoDB Atlas - database:', DB_NAME);

        // Create indexes for performance
        await dbInstance.collection('owners').createIndex({ email: 1 });
        await dbInstance.collection('owners').createIndex({ salon: 1 });
        await dbInstance.collection('employees').createIndex({ email: 1 });
        await dbInstance.collection('employees').createIndex({ salon: 1 });
        await dbInstance.collection('salons').createIndex({ slug: 1 }, { unique: true });
        await dbInstance.collection('clients').createIndex({ salon: 1 });
        await dbInstance.collection('bookings').createIndex({ salon: 1, date: -1 });
        console.log('📇 Indexes created');

        return dbInstance;
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('   Check: 1) MONGODB_URI env var 2) Atlas IP whitelist (allow 0.0.0.0/0) 3) User/password');
        throw err;
    }
}

function getDB() {
    if (!dbInstance) throw new Error('Database not connected. Call connectDB() first.');
    return dbInstance;
}

function genId() { return crypto.randomBytes(12).toString('hex'); }

// Helper: convert _id for compatibility (our API uses string _id)
function withStringId(doc) {
    if (!doc) return null;
    if (doc._id && typeof doc._id === 'object') doc._id = doc._id.toString();
    return doc;
}

// ============ SEED DATA ============
async function seedIfEmpty() {
    const db = getDB();
    const salonCount = await db.collection('salons').countDocuments();
    if (salonCount > 0) return; // Already has data

    console.log('🌱 Seeding initial data...');
    const salonId = genId();
    const ownerId = genId();
    const emp1Id = genId();
    const emp2Id = genId();
    const hashedPassword = await bcrypt.hash('salon123', 10);

    await db.collection('salons').insertOne({
        _id: salonId,
        slug: 'salon-premium-paris',
        name: 'Salon Premium Paris',
        description: 'Institut de beauté et coiffure premium au cœur de Paris',
        address: '12 Rue de la Beauté, 75001 Paris',
        phone: '06 12 34 56 78',
        email: 'contact@salon.fr',
        plan: 'pro', // starter, pro, premium
        logo: '',
        branding: {
            primaryColor: '#6366F1',
            accentColor: '#818CF8',
            heroTitle: "L'Art de la Beauté & du Bien-être",
            heroSubtitle: 'Excellence, style et précision',
        },
        services: [
            { _id: genId(), name: 'Coupe & Brushing', icon: '💆‍♀️', price: 45, duration: 45, description: 'Soin, coupe sur mesure et brushing', active: true },
            { _id: genId(), name: 'Coloration', icon: '🎨', price: 65, duration: 60, description: 'Coloration professionnelle', active: true },
            { _id: genId(), name: 'Manucure Premium', icon: '💅', price: 35, duration: 45, description: 'Soin complet des mains', active: true },
            { _id: genId(), name: 'Coupe Homme', icon: '✂️', price: 25, duration: 30, description: 'Coupe classique', active: true },
            { _id: genId(), name: 'Soin Visage', icon: '✨', price: 50, duration: 45, description: 'Traitement éclat et hydratation', active: true },
            { _id: genId(), name: 'Épilation', icon: '🌸', price: 20, duration: 25, description: 'Zone au choix', active: true },
        ],
        hours: {
            lundi: { open: '09:00', close: '19:00' },
            mardi: { open: '09:00', close: '19:00' },
            mercredi: { open: '09:00', close: '19:00' },
            jeudi: { open: '09:00', close: '19:00' },
            vendredi: { open: '09:00', close: '19:00' },
            samedi: { open: '09:00', close: '18:00' },
        },
        subscription: { plan: 'premium', status: 'active', price: 49.90 },
        smsReminders: { enabled: false, status: 'En développement' },
        rating: 4.9,
        reviewCount: 125,
        active: true,
        createdAt: new Date().toISOString(),
    });

    await db.collection('owners').insertOne({
        _id: ownerId,
        salon: salonId,
        name: 'Ahmed Mansouri',
        email: 'demo@salon.ch',
        password: hashedPassword,
        phone: '06 12 34 56 78',
        role: 'owner',
    });

    await db.collection('employees').insertMany([
        { _id: emp1Id, salon: salonId, name: 'Ahmed Mansouri', email: 'ahmed@elitebarber.fr', specialties: ['Coupe', 'Barbe', 'Coloration'], active: true },
        { _id: emp2Id, salon: salonId, name: 'Karim Benali', email: 'karim@elitebarber.fr', specialties: ['Coupe', 'Barbe'], active: true },
    ]);

    console.log('✅ Seed data inserted');
}

// ============ ADAPTER ============

const db = {
    // ---- Init ----
    connectDB,
    seedIfEmpty,

    // ---- Salons ----
    async findSalons(query = {}) {
        return (await getDB().collection('salons').find(query).toArray());
    },
    async findSalonById(id) {
        return await getDB().collection('salons').findOne({ _id: id });
    },
    async findSalonBySlug(slug) {
        return await getDB().collection('salons').findOne({ slug });
    },
    async createSalon(data) {
        const salon = { _id: genId(), ...data, createdAt: new Date().toISOString() };
        await getDB().collection('salons').insertOne(salon);
        return salon;
    },
    async updateSalon(id, updates) {
        await getDB().collection('salons').updateOne({ _id: id }, { $set: updates });
        return await getDB().collection('salons').findOne({ _id: id });
    },
    async deleteSalon(id) {
        await getDB().collection('salons').deleteOne({ _id: id });
        await getDB().collection('owners').deleteMany({ salon: id });
        await getDB().collection('employees').deleteMany({ salon: id });
        await getDB().collection('clients').deleteMany({ salon: id });
        await getDB().collection('bookings').deleteMany({ salon: id });
    },

    // ---- Owners ----
    async findOwners(query = {}) {
        return await getDB().collection('owners').find(query).toArray();
    },
    async findOwnerByEmail(email) {
        return await getDB().collection('owners').findOne({ email: email.toLowerCase() });
    },
    async findOwnerBySalon(salonId) {
        return await getDB().collection('owners').findOne({ salon: salonId });
    },
    async createOwner(data) {
        const pwd = await bcrypt.hash(data.password, 10);
        const owner = { _id: genId(), ...data, password: pwd, email: data.email.toLowerCase() };
        await getDB().collection('owners').insertOne(owner);
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
        await getDB().collection('owners').deleteOne({ _id: id });
    },
    async updateOwner(id, updates) {
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        await getDB().collection('owners').updateOne({ _id: id }, { $set: updates });
        return await getDB().collection('owners').findOne({ _id: id });
    },

    // ---- Employees ----
    async findEmployees(query = {}) {
        return await getDB().collection('employees').find(query).toArray();
    },
    async findEmployeeByEmail(email) {
        return await getDB().collection('employees').findOne({ email: email.toLowerCase() });
    },
    async createEmployee(data) {
        let pwd = null;
        if (data.password) {
            pwd = await bcrypt.hash(data.password, 10);
        }
        
        let defaultHours = {
            lundi: { open: '09:00', close: '19:00' },
            mardi: { open: '09:00', close: '19:00' },
            mercredi: { open: '09:00', close: '19:00' },
            jeudi: { open: '09:00', close: '19:00' },
            vendredi: { open: '09:00', close: '19:00' },
            samedi: { open: '09:00', close: '18:00' },
        };
        try {
            const salon = await getDB().collection('salons').findOne({ _id: data.salon });
            if (salon && salon.hours) {
                defaultHours = salon.hours;
            }
        } catch (err) {}

        const emp = {
            _id: genId(),
            ...data,
            hours: data.hours || defaultHours,
            email: data.email ? data.email.toLowerCase() : '',
            password: pwd,
            active: true,
        };
        await getDB().collection('employees').insertOne(emp);
        return emp;
    },
    async updateEmployee(id, updates) {
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        await getDB().collection('employees').updateOne({ _id: id }, { $set: updates });
        return await getDB().collection('employees').findOne({ _id: id });
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
        await getDB().collection('employees').deleteOne({ _id: id });
    },

    // ---- Clients ----
    async findClients(query = {}) {
        return await getDB().collection('clients').find(query).toArray();
    },
    async findOrCreateClient(salonId, data) {
        const col = getDB().collection('clients');

        // Build query conditions for matching existing client
        const conditions = [];
        if (data.email) conditions.push({ email: data.email });
        if (data.phone) conditions.push({ phone: data.phone });

        let client = null;
        if (conditions.length > 0) {
            client = await col.findOne({ salon: salonId, $or: conditions });
        }

        if (!client) {
            client = { _id: genId(), salon: salonId, name: data.name, email: data.email || '', phone: data.phone || '', totalBookings: 0, totalSpent: 0 };
            await col.insertOne(client);
        }

        await col.updateOne({ _id: client._id }, {
            $inc: { totalBookings: 1, totalSpent: data.price || 0 },
            $set: { lastVisit: new Date().toISOString() },
        });

        return await col.findOne({ _id: client._id });
    },
    async findClientById(id) {
        return await getDB().collection('clients').findOne({ _id: id });
    },
    async updateClient(id, updates) {
        await getDB().collection('clients').updateOne({ _id: id }, { $set: updates });
        return await getDB().collection('clients').findOne({ _id: id });
    },
    async countClients(query = {}) {
        return await getDB().collection('clients').countDocuments(query);
    },

    // ---- Bookings ----
    async findBookings(query = {}) {
        return await getDB().collection('bookings').find(query).sort({ date: -1, time: -1 }).toArray();
    },
    async findBookingById(id) {
        return await getDB().collection('bookings').findOne({ _id: id });
    },
    async createBooking(data) {
        const booking = { _id: genId(), ...data, createdAt: new Date().toISOString() };
        await getDB().collection('bookings').insertOne(booking);
        return booking;
    },
    async updateBooking(id, updates) {
        await getDB().collection('bookings').updateOne({ _id: id }, { $set: updates });
        return await getDB().collection('bookings').findOne({ _id: id });
    },
    async countBookings(query = {}) {
        return await getDB().collection('bookings').countDocuments(query);
    },

    // ---- Salon Logs ----
    async addSalonLog(salonId, action, details = {}) {
        const log = { salonId, action, details, timestamp: new Date().toISOString() };
        await getDB().collection('salonLogs').insertOne(log);
    },
    async getSalonLogs(salonId, limit = 50) {
        return await getDB().collection('salonLogs').find({ salonId }).sort({ timestamp: -1 }).limit(limit).toArray();
    },

    // ---- Counts ----
    async countSalons() { return await getDB().collection('salons').countDocuments(); },
    async countOwners() { return await getDB().collection('owners').countDocuments(); },
    async countEmployees(query = {}) { return await getDB().collection('employees').countDocuments(query); },
    async countAllBookings() { return await getDB().collection('bookings').countDocuments(); },
    async countAllClients() { return await getDB().collection('clients').countDocuments(); },
};

module.exports = db;
