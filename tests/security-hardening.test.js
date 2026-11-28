/**
 * Security hardening (audit 28 nov. 2026):
 * stored/reflected XSS, Host-header poisoning, receipt IDOR, owner-only SMS
 * settings, OTP brute force, private metrics, upload size cap.
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonBySlug: jest.fn(),
    findSalonById: jest.fn(),
    findBookingById: jest.fn(),
    findBookings: jest.fn().mockResolvedValue([]),
    findBlocks: jest.fn().mockResolvedValue([]),
    findOrCreateClient: jest.fn().mockResolvedValue({ _id: 'c1' }),
    createBooking: jest.fn(async b => ({ _id: 'b'.repeat(24), ...b })),
    findOwnerByEmail: jest.fn(),
    findOwnerBySalon: jest.fn(),
    findEmployeeByEmail: jest.fn().mockResolvedValue(null),
    findEmployeeById: jest.fn().mockResolvedValue(null),
    findOwnerById: jest.fn().mockResolvedValue(null),
    comparePassword: jest.fn().mockResolvedValue(false),
    updateSalon: jest.fn(async (id, u) => ({ _id: id, ...u })),
    addSalonLog: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => {
    // Same mock instance per name, so the test sees the calls the server made.
    const fns = {};
    return new Proxy({}, { get: (_, k) => (fns[k] ||= jest.fn().mockResolvedValue({ success: true })) });
});
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));

const crypto = require('crypto');
const request = require('supertest');
const db = require('../db');
const email = require('../email');
const { server, createToken } = require('../server');

const SALON = { _id: 's1', slug: 'da-cutzz', name: 'Da Cutzz', active: true, services: [{ name: 'Coupe', price: 32, duration: 45, active: true }], hours: {} };
const BOOKING_ID = 'a'.repeat(24);
const TOKEN = 'f'.repeat(32);
const BOOKING = { _id: BOOKING_ID, salon: 's1', clientName: 'Jean', serviceName: 'Coupe', date: '2030-01-01', time: '09:00', duration: 45, price: 32, cancelToken: TOKEN };
const auth = payload => `Bearer ${createToken(payload)}`;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonBySlug.mockResolvedValue(SALON);
    db.findSalonById.mockResolvedValue(SALON);
    db.findBookingById.mockResolvedValue(BOOKING);
});

describe('stored XSS: markup is neutralised at the door', () => {
    test('a booking name with HTML is stored without < or >', async () => {
        const res = await request(server).post('/api/salon/da-cutzz/book').send({
            clientName: '<img src=x onerror=alert(1)>', clientEmail: 'a@b.ch',
            notes: '<script>steal()</script>', serviceName: 'Coupe', date: tomorrow(), time: '10:00',
        });
        expect(res.status).toBe(201);
        const saved = db.createBooking.mock.calls[0][0];
        expect(saved.clientName).not.toMatch(/[<>]/);
        expect(saved.notes).not.toMatch(/[<>]/);
    });

    test('passwords are never altered', async () => {
        db.findOwnerByEmail.mockResolvedValue({ _id: 'o1', salon: 's1', email: 'o@x.ch' });
        await request(server).post('/api/pro/login').send({ email: 'o@x.ch', password: 'a<b>c' });
        expect(db.comparePassword).toHaveBeenCalledWith(expect.anything(), 'a<b>c');
    });
});

describe('reflected XSS on the review page', () => {
    test('a crafted id is not written into the page', async () => {
        const res = await request(server).get('/review/%22;alert(document.cookie)//');
        expect(res.status).toBe(200);
        expect(res.text).not.toContain('alert(document.cookie)');
    });

    test('a real id is kept', async () => {
        const res = await request(server).get(`/review/${BOOKING_ID}?t=${TOKEN}`);
        expect(res.text).toContain(`const id="${BOOKING_ID}"`);
    });
});

describe('receipt access', () => {
    test('another salon owner cannot read the receipt', async () => {
        const res = await request(server).get(`/receipt/${BOOKING_ID}`)
            .set('Authorization', auth({ ownerId: 'o9', salonId: 'other', role: 'owner' }));
        expect(res.status).toBe(404);
    });

    test('the salon own owner can', async () => {
        const res = await request(server).get(`/receipt/${BOOKING_ID}`)
            .set('Authorization', auth({ ownerId: 'o1', salonId: 's1', role: 'owner' }));
        expect(res.status).toBe(200);
    });

    test('the client with the right token can, a wrong token cannot', async () => {
        expect((await request(server).get(`/receipt/${BOOKING_ID}?token=${TOKEN}`)).status).toBe(200);
        expect((await request(server).get(`/receipt/${BOOKING_ID}?token=${'0'.repeat(32)}`)).status).toBe(404);
    });

    test('salon name is escaped in the receipt', async () => {
        db.findSalonById.mockResolvedValue({ ...SALON, name: '<b>x</b>', branding: { primaryColor: 'red;}</style><script>' } });
        const res = await request(server).get(`/receipt/${BOOKING_ID}?token=${TOKEN}`);
        expect(res.text).not.toContain('<b>x</b>');
        expect(res.text).not.toContain('</style><script>');
    });
});

test('password reset link ignores a forged Host header', async () => {
    db.findOwnerByEmail.mockResolvedValue({ _id: 'o1', email: 'o@x.ch', name: 'O' });
    await request(server).post('/api/pro/forgot-password').set('Host', 'evil.example').send({ email: 'o@x.ch' });
    expect(email.sendPasswordResetEmail).toHaveBeenCalled();
    const url = email.sendPasswordResetEmail.mock.calls[0][2];
    expect(url).not.toContain('evil.example');
});

test('an employee cannot change the SMS settings', async () => {
    const res = await request(server).put('/api/pro/salon/s1/sms-settings')
        .set('Authorization', auth({ employeeId: 'e1', salonId: 's1', role: 'employee' }))
        .send({ ownerPhone: '+41790000000' });
    expect(res.status).toBe(403);
    expect(db.updateSalon).not.toHaveBeenCalled();
});

test('client OTP is burnt after 5 wrong guesses', async () => {
    const spy = jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
    try {
        const mail = 'otp-test@x.ch';
        await request(server).post('/api/salon/da-cutzz/my-bookings/otp').send({ email: mail });
        for (let i = 0; i < 5; i++) {
            await request(server).post('/api/salon/da-cutzz/my-bookings')
                .set('X-Forwarded-For', `10.0.0.${i}`).send({ email: mail, code: '000000' });
        }
        const res = await request(server).post('/api/salon/da-cutzz/my-bookings')
            .set('X-Forwarded-For', '10.0.1.1').send({ email: mail, code: '123456' });
        expect(res.status).toBe(401);
    } finally { spy.mockRestore(); }
});

test('server metrics are admin only', async () => {
    expect((await request(server).get('/api/metrics')).status).toBe(401);
    expect((await request(server).get('/api/metrics').set('Authorization', auth({ role: 'superadmin' }))).status).toBe(200);
});

test('uploads above 10 MB are refused', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024, 1);
    const res = await request(server).post('/api/pro/salon/s1/logo')
        .set('Authorization', auth({ ownerId: 'o1', salonId: 's1', role: 'owner' }))
        .attach('logo', big, 'big.png')
        .catch(e => e.response || { status: 'aborted' });
    expect([413, 'aborted']).toContain(res.status);
});
