/**
 * Online booking grid settings (PUT /api/pro/salon/:salonId { bookingSettings })
 * and the "add to calendar" file (GET /api/bookings/:id/ics?token=).
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonById: jest.fn(),
    findBookingById: jest.fn(),
    updateSalon: jest.fn(),
    addSalonLog: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findBookings: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));

const request = require('supertest');
const db = require('../db');
const { server, createToken } = require('../server');

const token = role => `Bearer ${createToken({ ownerId: 'o1', salonId: 's1', role })}`;
const put = (body, role = 'owner') =>
    request(server).put('/api/pro/salon/s1').set('Authorization', token(role)).send(body);

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonById.mockResolvedValue({ _id: 's1', name: 'Da Cutzz' });
    db.updateSalon.mockImplementation(async (id, u) => ({ _id: id, ...u }));
});

describe('bookingSettings', () => {
    test('owner sets interval and min gap', async () => {
        const res = await put({ bookingSettings: { slotInterval: 15, minGap: 30 } });
        expect(res.status).toBe(200);
        expect(db.updateSalon).toHaveBeenCalledWith('s1', { bookingSettings: { slotInterval: 15, minGap: 30 } });
    });

    test('one field alone keeps the other', async () => {
        db.findSalonById.mockResolvedValue({ _id: 's1', bookingSettings: { slotInterval: 15, minGap: 30 } });
        await put({ bookingSettings: { minGap: 0 } });
        expect(db.updateSalon).toHaveBeenCalledWith('s1', { bookingSettings: { slotInterval: 15, minGap: 0 } });
    });

    test('invalid values are refused', async () => {
        expect((await put({ bookingSettings: { slotInterval: 7 } })).status).toBe(400);
        expect((await put({ bookingSettings: { minGap: -5 } })).status).toBe(400);
        expect(db.updateSalon).not.toHaveBeenCalled();
    });

    test('an employee cannot change them', async () => {
        expect((await put({ bookingSettings: { slotInterval: 15 } }, 'employee')).status).toBe(403);
    });
});

describe('GET /api/bookings/:id/ics', () => {
    const TOKEN = 'a'.repeat(32);
    beforeEach(() => {
        db.findBookingById.mockResolvedValue({
            _id: 'b1', salon: 's1', cancelToken: TOKEN, date: '2026-12-01', time: '10:00', duration: 45,
            serviceName: 'Coupe + coiffage', employeeName: 'Divio',
        });
        db.findSalonById.mockResolvedValue({ _id: 's1', name: 'Da Cutzz', address: 'Rue du Clos-de-Serrières 31, 2000 Neuchâtel' });
    });
    const get = token => request(server).get('/api/bookings/b1/ics').query({ token });

    test('builds the event from the stored booking (Swiss time -> UTC)', async () => {
        const res = await get(TOKEN);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/calendar/);
        expect(res.text).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
        expect(res.text).toContain('DTSTART:20261201T090000Z'); // 10:00 CET
        expect(res.text).toContain('DTEND:20261201T094500Z');
        expect(res.text).toContain('SUMMARY:Coupe + coiffage - Da Cutzz');
        expect(res.text).toContain('LOCATION:Da Cutzz\\, Rue du Clos-de-Serrières 31\\, 2000 Neuchâtel');
    });

    test('wrong or missing token = 404 (no arbitrary content on kreno.ch)', async () => {
        expect((await get('b'.repeat(32))).status).toBe(404);
        expect((await get('')).status).toBe(404);
    });

    test('unknown booking = 404', async () => {
        db.findBookingById.mockResolvedValue(null);
        expect((await get(TOKEN)).status).toBe(404);
    });
});
