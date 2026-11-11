/**
 * PUT /api/pro/salon/:salonId/sms-settings and GET .../sms-status
 *
 * - Only the fields sent are changed: the mobile app sends the 4 toggles only,
 *   it must not wipe the sender name set on the web portal.
 * - The sender name is cleaned to Twilio's rules (11 chars, A-Z 0-9 space).
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

const auth = () => `Bearer ${createToken({ ownerId: 'o1', salonId: 's1', role: 'owner' })}`;
const put = body => request(server).put('/api/pro/salon/s1/sms-settings').set('Authorization', auth()).send(body);
const existing = { clientConfirmation: true, clientReminder: true, ownerNotification: true, ownerPhone: '+41790000000', senderName: 'Atelier' };

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonById.mockResolvedValue({ _id: 's1', name: 'L’Atelier Côté Coiffure', smsSettings: existing });
    delete process.env.TWILIO_ALPHA_SENDER;
});

test('the mobile app toggles do not wipe the sender name', async () => {
    const res = await put({ clientConfirmation: false, clientReminder: true, ownerNotification: true, ownerPhone: '+41790000000' });
    expect(res.status).toBe(200);
    expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsSettings: { ...existing, clientConfirmation: false } });
});

test('a single field can be changed alone', async () => {
    await put({ clientReminder: false });
    expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsSettings: { ...existing, clientReminder: false } });
});

test('sender name is cleaned to Twilio rules', async () => {
    await put({ senderName: 'Chez Zoé ✂️' });
    expect(db.updateSalon.mock.calls[0][1].smsSettings.senderName).toBe('Chez Zoe');
});

test('empty sender name = use the salon name', async () => {
    await put({ senderName: '' });
    expect(db.updateSalon.mock.calls[0][1].smsSettings.senderName).toBe('');
});

test('sender name without any letter is refused', async () => {
    const res = await put({ senderName: '0791234567' });
    expect(res.status).toBe(400);
    expect(db.updateSalon).not.toHaveBeenCalled();
});

test('sms-status tells the portal which sender clients will see', async () => {
    process.env.TWILIO_ALPHA_SENDER = 'true';
    const res = await request(server).get('/api/pro/salon/s1/sms-status').set('Authorization', auth());
    expect(res.body.data.sender).toEqual({ enabled: true, name: 'Atelier', default: 'LAtelier' });
});

test('sms-status: sender disabled when TWILIO_ALPHA_SENDER is off', async () => {
    const res = await request(server).get('/api/pro/salon/s1/sms-status').set('Authorization', auth());
    expect(res.body.data.sender.enabled).toBe(false);
});

test('another salon cannot change the settings', async () => {
    const res = await request(server).put('/api/pro/salon/s2/sms-settings').set('Authorization', auth()).send({ clientReminder: false });
    expect(res.status).toBe(401);
    expect(db.updateSalon).not.toHaveBeenCalled();
});

describe('employees', () => {
    const empAuth = () => `Bearer ${createToken({ employeeId: 'e1', salonId: 's1', role: 'employee' })}`;

    test('cannot change the sender name or the owner alert phone', async () => {
        const res = await request(server).put('/api/pro/salon/s1/sms-settings').set('Authorization', empAuth())
            .send({ senderName: 'Autre', ownerPhone: '+41781111111', ownerNotification: false });
        expect(res.status).toBe(403);
        expect(db.updateSalon).not.toHaveBeenCalled();
    });

    test('can still send the unchanged values (mobile app toggles)', async () => {
        const res = await request(server).put('/api/pro/salon/s1/sms-settings').set('Authorization', empAuth())
            .send({ clientConfirmation: false, clientReminder: true, ownerNotification: true, ownerPhone: '+41790000000' });
        expect(res.status).toBe(200);
        expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsSettings: { ...existing, clientConfirmation: false } });
    });
});

test('protected sender name (bank, operator...) is refused', async () => {
    const res = await put({ senderName: 'PostFinance' });
    expect(res.status).toBe(400);
    expect(db.updateSalon).not.toHaveBeenCalled();
});

test('sender name change is logged on the salon', async () => {
    await put({ senderName: 'Zoe' });
    expect(db.addSalonLog).toHaveBeenCalledWith('s1', 'sms_sender_changed', expect.objectContaining({ from: 'Atelier', to: 'Zoe' }));
});
