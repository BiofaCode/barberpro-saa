/**
 * Swiss time & reminders.
 *
 * Regressions:
 *  - the server ran on UTC: "8h-20h" windows, "tomorrow" and booking end
 *    times were off by 1-2 h;
 *  - on Render's free plan the server sleeps: reminders for tomorrow were
 *    lost if it was asleep the evening before (now caught up the same day);
 *  - bookings were accepted on the salon's closure days.
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
    updateBooking: jest.fn(),
    consumeSmsCredit: jest.fn().mockResolvedValue(true),
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
    sendSMSCancellation: jest.fn(), sendSMSReschedule: jest.fn(), sendSMSOwnerNotification: jest.fn(),
    SMS_PACKS: {},
}));

const request = require('supertest');
const db = require('../db');
const sms = require('../sms');
const email = require('../email');
const { server, _test } = require('../server');

const salon = { _id: 's1', slug: 'demo', name: 'Demo', active: true,
    services: [{ name: 'Coupe', price: 30, duration: 30, active: true }],
    closedDates: [{ start: '2099-12-24', end: '2099-12-26' }] };

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonById.mockResolvedValue(salon);
    db.findSalonBySlug.mockResolvedValue(salon);
});
afterEach(() => jest.useRealTimers());

test('server runs on Swiss time', () => {
    expect(process.env.TZ).toBe('Europe/Zurich');
    // 23:30 UTC on Nov 9 is already Nov 10 in Switzerland
    expect(_test.localDateStr(new Date('2026-11-09T23:30:00Z'))).toBe('2026-11-10');
});

test('booking on a closure day is rejected', async () => {
    const res = await request(server).post('/api/salon/demo/book').set('X-Forwarded-For', '10.5.0.1')
        .send({ clientName: 'A', serviceName: 'Coupe', date: '2099-12-25', time: '10:00' });
    expect(res.status).toBe(400);
    expect(db.createBooking).not.toHaveBeenCalled();
});

describe('reminders', () => {
    const at = iso => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'] });
    const flush = () => new Promise(r => setImmediate(r));

    test('evening run reminds tomorrow\'s bookings', async () => {
        at('2026-11-10T18:00:00+01:00'); // 18:00 Swiss
        db.findBookings.mockImplementation(async q => q.date === '2026-11-11'
            ? [{ _id: 'b1', salon: 's1', date: '2026-11-11', time: '09:00', clientPhone: '079', clientEmail: 'a@b.ch' }] : []);
        await _test.sendPendingReminders(); await flush();
        expect(sms.sendSMSReminder).toHaveBeenCalledWith(expect.objectContaining({ _id: 'b1' }), salon, { sameDay: false });
        expect(db.updateBooking).toHaveBeenCalledWith('b1', { reminderSent: true });
    });

    test('missed reminder is caught up the same morning, not for bookings made today', async () => {
        at('2026-11-11T08:30:00+01:00'); // server woke up at 08:30 Swiss
        db.findBookings.mockImplementation(async q => q.date === '2026-11-11' ? [
            { _id: 'old', salon: 's1', date: '2026-11-11', time: '14:00', clientPhone: '079', createdAt: '2026-11-05T10:00:00Z' },
            { _id: 'soon', salon: 's1', date: '2026-11-11', time: '09:30', clientPhone: '079', createdAt: '2026-11-05T10:00:00Z' },
            { _id: 'new', salon: 's1', date: '2026-11-11', time: '15:00', clientPhone: '079', createdAt: '2026-11-11T07:00:00Z' },
        ] : []);
        await _test.sendPendingReminders(); await flush();
        const reminded = sms.sendSMSReminder.mock.calls.map(c => c[0]._id);
        expect(reminded).toEqual(['old']);
        expect(sms.sendSMSReminder.mock.calls[0][2]).toEqual({ sameDay: true });
    });

    test('no reminders at night (Swiss time)', async () => {
        at('2026-11-10T21:30:00+01:00');
        await _test.sendPendingReminders();
        expect(db.findBookings).not.toHaveBeenCalled();
    });
});
