/**
 * POST /api/salon/:slug/book — server-side validation, and router specificity.
 *
 * Regressions:
 *  - the conflict check used the client-supplied duration, so a 120-min
 *    service sent with `duration: 1` could overlap the next booking;
 *  - empty bodies, unknown services and past dates created bookings;
 *  - GET /bookings/ical was swallowed by /bookings/:bookingId (404).
 */

jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonBySlug: jest.fn(),
    findSalonById: jest.fn(),
    findBookingById: jest.fn(),
    findBookings: jest.fn().mockResolvedValue([]),
    findBlocks: jest.fn().mockResolvedValue([]),
    findOrCreateClient: jest.fn().mockResolvedValue({ _id: 'client_1' }),
    createBooking: jest.fn(async b => ({ _id: 'booking_new', ...b })),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));
jest.mock('../sms', () => new Proxy({ SMS_PACKS: {} }, { get: (t, k) => (k in t ? t[k] : jest.fn().mockResolvedValue()) }));

const request = require('supertest');
const db = require('../db');
const { server, createToken } = require('../server');

const SALON = {
    _id: 'salon_1', slug: 'demo', name: 'Demo', active: true,
    services: [{ name: 'Balayage', price: 90, duration: 120, active: true }],
};
const future = () => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
};
// Distinct IP per request so the 10/hour booking rate limit never interferes.
let ipCounter = 0;
const book = body => request(server)
    .post('/api/salon/demo/book')
    .set('X-Forwarded-For', `10.9.0.${++ipCounter}`)
    .send(body);

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonBySlug.mockResolvedValue(SALON);
    db.findBookings.mockResolvedValue([]);
    db.findBlocks.mockResolvedValue([]);
});

describe('POST /api/salon/:slug/book', () => {
    test('conflict check uses the service duration, not the client one', async () => {
        const date = future();
        db.findBookings.mockResolvedValue([{ _id: 'b1', date, time: '10:00', duration: 30, status: 'confirmed' }]);
        const res = await book({ clientName: 'A', serviceName: 'Balayage', date, time: '09:00', duration: 1 });
        expect(res.status).toBe(409);
        expect(db.createBooking).not.toHaveBeenCalled();
    });

    test('stores server price and duration', async () => {
        const res = await book({ clientName: 'A', serviceName: 'Balayage', date: future(), time: '09:00', duration: 1, price: 1 });
        expect(res.status).toBe(201);
        expect(db.createBooking).toHaveBeenCalledWith(expect.objectContaining({ price: 90, duration: 120 }));
    });

    test.each([
        ['empty body', {}],
        ['unknown service', { clientName: 'A', serviceName: 'Nope', date: '2099-01-01', time: '10:00' }],
        ['past date', { clientName: 'A', serviceName: 'Balayage', date: '2020-01-01', time: '10:00' }],
        ['malformed time', { clientName: 'A', serviceName: 'Balayage', date: '2099-01-01', time: '10h' }],
    ])('rejects %s with 400', async (_label, body) => {
        const res = await book(body);
        expect(res.status).toBe(400);
        expect(db.createBooking).not.toHaveBeenCalled();
    });
});

describe('router specificity', () => {
    test('GET /bookings/ical reaches the iCal route, not /bookings/:bookingId', async () => {
        db.findSalonById.mockResolvedValue({ ...SALON, subscription: { plan: 'premium' } });
        const token = createToken({ ownerId: 'o1', salonId: 'salon_1', role: 'owner' });
        const res = await request(server)
            .get('/api/pro/salon/salon_1/bookings/ical')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('BEGIN:VCALENDAR');
        expect(db.findBookingById).not.toHaveBeenCalled();
    });
});
