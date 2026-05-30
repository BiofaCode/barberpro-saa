/**
 * SMS buy route guards (real integration via supertest + mocked db/sms).
 * Route: POST /api/pro/sms/buy
 *
 * Ces tests ciblent les gardes qui s'exécutent AVANT l'appel Stripe
 * (403 employé, 400 pack invalide), ce qui suffit à prouver que la route
 * ne crashe plus sur `params` indéfini.
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonById: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => ({ sendEmail: jest.fn() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn() }));
jest.mock('../sms', () => ({
    sendSMSConfirmation: jest.fn(),
    sendSMSReminder: jest.fn(),
    sendSMSCancellation: jest.fn(),
    sendSMSOwnerNotification: jest.fn(),
    SMS_PACKS: {
        starter: { credits: 50, priceChf: 5, label: 'Pack Starter' },
        pro: { credits: 100, priceChf: 9, label: 'Pack Pro' },
        max: { credits: 250, priceChf: 19, label: 'Pack Max' },
    },
}));

const request = require('supertest');
const db = require('../db');
const { server, createToken } = require('../server');

const SALON_ID = 'salon_abc';
const ownerToken = (salonId = SALON_ID) => createToken({ ownerId: 'owner_1', salonId, role: 'owner' });
const employeeToken = (salonId = SALON_ID) => createToken({ employeeId: 'emp_1', salonId, role: 'employee' });

describe('POST /api/pro/sms/buy', () => {
    beforeEach(() => jest.clearAllMocks());

    test('invalid pack returns 400 (not a 500 crash)', async () => {
        db.findSalonById.mockResolvedValue({ _id: SALON_ID, name: 'Test' });
        const res = await request(server)
            .post('/api/pro/sms/buy')
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ pack: 'does-not-exist' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('employee is forbidden (403)', async () => {
        const res = await request(server)
            .post('/api/pro/sms/buy')
            .set('Authorization', `Bearer ${employeeToken()}`)
            .send({ pack: 'starter' });
        expect(res.status).toBe(403);
    });

    test('missing auth is rejected (401)', async () => {
        const res = await request(server)
            .post('/api/pro/sms/buy')
            .send({ pack: 'starter' });
        expect(res.status).toBe(401);
    });
});
