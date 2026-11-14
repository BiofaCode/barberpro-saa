/**
 * Online booking grid settings (PUT /api/pro/salon/:salonId { bookingSettings })
 * and the "add to calendar" file (GET /api/ics).
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonById: jest.fn(),
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

describe('GET /api/ics', () => {
    test('returns a valid calendar file', async () => {
        const res = await request(server).get('/api/ics').query({
            s: '2026-12-01T09:00:00.000Z', e: '2026-12-01T09:45:00.000Z',
            t: 'Coupe + coiffage @ Da Cutzz', l: 'Da Cutzz, Rue du Clos-de-Serrières 31, 2000 Neuchâtel',
        });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/calendar/);
        const body = res.text;
        expect(body).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
        expect(body).toContain('DTSTART:20261201T090000Z');
        expect(body).toContain('DTEND:20261201T094500Z');
        expect(body).toContain('LOCATION:Da Cutzz\\, Rue du Clos-de-Serrières 31\\, 2000 Neuchâtel');
    });

    test('line breaks cannot inject calendar fields', async () => {
        const res = await request(server).get('/api/ics').query({
            s: '2026-12-01T09:00:00Z', e: '2026-12-01T10:00:00Z', t: 'RDV\r\nATTENDEE:evil@x.com',
        });
        expect(res.text).not.toMatch(/\r\nATTENDEE/);
    });

    test('bad dates are refused', async () => {
        const res = await request(server).get('/api/ics').query({ s: 'x', e: 'y' });
        expect(res.status).toBe(400);
    });
});
