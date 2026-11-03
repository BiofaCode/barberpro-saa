/**
 * SMS billing guarantees:
 *  - by default only the D-1 reminder is sent (confirmation by email only);
 *  - every SMS, the owner alert included, reserves a credit atomically
 *    before sending, is not sent at 0 credits, and is refunded on failure.
 *
 * Regressions: the owner "new booking" SMS never consumed a credit, and
 * credits were decremented from a stale copy of the balance.
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonBySlug: jest.fn(),
    findSalonById: jest.fn(),
    findBookings: jest.fn().mockResolvedValue([]),
    findBlocks: jest.fn().mockResolvedValue([]),
    findOrCreateClient: jest.fn().mockResolvedValue({ _id: 'client_1' }),
    createBooking: jest.fn(async b => ({ _id: 'booking_1', ...b })),
    consumeSmsCredit: jest.fn(),
    refundSmsCredit: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));
jest.mock('../sms', () => ({
    sendSMSConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendSMSReminder: jest.fn().mockResolvedValue({ success: true }),
    sendSMSCancellation: jest.fn().mockResolvedValue({ success: true }),
    sendSMSReschedule: jest.fn().mockResolvedValue({ success: true }),
    sendSMSOwnerNotification: jest.fn().mockResolvedValue({ success: true }),
    SMS_PACKS: {},
}));

const request = require('supertest');
const db = require('../db');
const sms = require('../sms');
const { server } = require('../server');

const baseSalon = { _id: 'salon_1', slug: 'demo', name: 'Demo', active: true, smsCredits: 10,
    services: [{ name: 'Coupe', price: 30, duration: 30, active: true }] };
const future = () => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().split('T')[0]; };
let ip = 0;
const book = () => request(server).post('/api/salon/demo/book')
    .set('X-Forwarded-For', `10.7.0.${++ip}`)
    .send({ clientName: 'A', clientPhone: '0791234567', serviceName: 'Coupe', date: future(), time: '10:00' });
const flush = () => new Promise(r => setTimeout(r, 30)); // SMS are fire-and-forget

beforeEach(() => {
    jest.clearAllMocks();
    db.consumeSmsCredit.mockResolvedValue(true);
});

test('default settings: no confirmation SMS on booking', async () => {
    db.findSalonBySlug.mockResolvedValue({ ...baseSalon });
    expect((await book()).status).toBe(201);
    await flush();
    expect(sms.sendSMSConfirmation).not.toHaveBeenCalled();
    expect(db.consumeSmsCredit).not.toHaveBeenCalled();
});

test('confirmation opted in: one credit reserved, then sent', async () => {
    db.findSalonBySlug.mockResolvedValue({ ...baseSalon, smsSettings: { clientConfirmation: true } });
    await book(); await flush();
    expect(db.consumeSmsCredit).toHaveBeenCalledWith('salon_1');
    expect(sms.sendSMSConfirmation).toHaveBeenCalledTimes(1);
    expect(db.refundSmsCredit).not.toHaveBeenCalled();
});

test('no credit left: nothing is sent', async () => {
    db.consumeSmsCredit.mockResolvedValue(false);
    db.findSalonBySlug.mockResolvedValue({ ...baseSalon, smsCredits: 0, smsSettings: { clientConfirmation: true, ownerNotification: true, ownerPhone: '0790000000' } });
    await book(); await flush();
    expect(sms.sendSMSConfirmation).not.toHaveBeenCalled();
    expect(sms.sendSMSOwnerNotification).not.toHaveBeenCalled();
});

test('owner alert SMS consumes a credit too', async () => {
    db.findSalonBySlug.mockResolvedValue({ ...baseSalon, smsSettings: { ownerNotification: true, ownerPhone: '0790000000' } });
    await book(); await flush();
    expect(sms.sendSMSOwnerNotification).toHaveBeenCalledTimes(1);
    expect(db.consumeSmsCredit).toHaveBeenCalledTimes(1);
});

test('failed send is refunded', async () => {
    sms.sendSMSConfirmation.mockResolvedValueOnce({ success: false, error: 'twilio down' });
    db.findSalonBySlug.mockResolvedValue({ ...baseSalon, smsSettings: { clientConfirmation: true } });
    await book(); await flush();
    expect(db.refundSmsCredit).toHaveBeenCalledWith('salon_1');
});
