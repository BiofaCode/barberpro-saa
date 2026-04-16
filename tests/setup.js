/**
 * Jest setup and global test utilities
 */

const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// Setup test environment before running tests
beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ADMIN_PASSWORD = 'admin123';

    // Start in-memory MongoDB
    const mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // Store globally for cleanup
    global.__MONGO_SERVER__ = mongoServer;

    // Clear require cache to ensure new server instance with new DB URI
    delete require.cache[require.resolve('../db.js')];
    delete require.cache[require.resolve('../server.js')];

    // Initialize database
    const db = require('../db.js');
    await db.connectDB();
});

afterAll(async () => {
    // Clean up in-memory MongoDB
    if (global.__MONGO_SERVER__) {
        await global.__MONGO_SERVER__.stop();
    }
});

// Create test JWT tokens
function createTestToken(payload = {}, expiresInDays = 30) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: Date.now(),
        exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${sig}`;
}

// Create expired token
function createExpiredToken(payload = {}) {
    return createTestToken(payload, -1);
}

// Test fixtures
const testSalon = {
    _id: 'salon123',
    name: 'Test Salon',
    slug: 'test-salon',
    city: 'Geneva',
    phone: '+41223334444',
    email: 'salon@test.ch',
    owner_id: 'owner123',
    plan: 'pro',
    employees: []
};

const testOwner = {
    _id: 'owner123',
    email: 'owner@test.ch',
    password_hash: 'hashed_password',
    salon_id: 'salon123',
    role: 'owner'
};

const testEmployee = {
    _id: 'emp123',
    email: 'emp@test.ch',
    password_hash: 'hashed_password',
    salon_id: 'salon123',
    role: 'employee'
};

const testBooking = {
    _id: 'booking123',
    salon_id: 'salon123',
    client_name: 'John Doe',
    client_email: 'john@test.ch',
    client_phone: '+41223334444',
    service_id: 'service123',
    employee_id: 'emp123',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration: 30,
    status: 'confirmed',
    payment_status: 'pending'
};

const testService = {
    _id: 'service123',
    salon_id: 'salon123',
    name: 'Haircut',
    duration: 30,
    price: 25,
    description: 'Basic haircut'
};

module.exports = {
    createTestToken,
    createExpiredToken,
    testSalon,
    testOwner,
    testEmployee,
    testBooking,
    testService
};
