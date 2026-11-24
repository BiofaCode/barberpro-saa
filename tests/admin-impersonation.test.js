/**
 * Admin "ouvrir ce salon" (GET /api/admin/salons/:id/magic-link): the session is
 * marked as an admin session, which must not steal the owner's push
 * notifications nor request deletion of the owner's account.
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonById: jest.fn(),
    findOwnerBySalon: jest.fn(),
    findOwnerById: jest.fn(),
    savePushToken: jest.fn(),
    updateOwner: jest.fn(),
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
const { server, createToken, verifyToken } = require('../server');

const admin = `Bearer ${createToken({ role: 'superadmin' })}`;

beforeEach(() => {
    jest.clearAllMocks();
    db.findSalonById.mockResolvedValue({ _id: 's1', name: 'Da Cutzz' });
    db.findOwnerBySalon.mockResolvedValue({ _id: 'o1', salon: 's1', name: 'Divio', email: 'd@x.ch' });
    db.findOwnerById.mockResolvedValue({ _id: 'o1', email: 'd@x.ch' });
});

async function openSalon() {
    const res = await request(server).get('/api/admin/salons/s1/magic-link').set('Authorization', admin);
    expect(res.status).toBe(200);
    return res.body.data;
}

test('only the admin can open a salon', async () => {
    const owner = `Bearer ${createToken({ ownerId: 'o2', salonId: 's2', role: 'owner' })}`;
    const res = await request(server).get('/api/admin/salons/s1/magic-link').set('Authorization', owner);
    expect(res.status).toBe(401);
});

test('opened session is an owner session flagged as admin', async () => {
    const data = await openSalon();
    expect(data.user).toMatchObject({ salonId: 's1', role: 'owner', impersonated: true });
    const payload = verifyToken({ headers: { authorization: `Bearer ${data.token}` } });
    expect(payload).toMatchObject({ ownerId: 'o1', salonId: 's1', role: 'owner', impersonatedBy: 'superadmin' });
});

test('admin session does not register a push token for the owner', async () => {
    const { token } = await openSalon();
    const res = await request(server).post('/api/pro/push-token')
        .set('Authorization', `Bearer ${token}`).send({ token: 'fcm-abc', platform: 'ios' });
    expect(res.status).toBe(200);
    expect(db.savePushToken).not.toHaveBeenCalled();
});

test('owner own session still registers its push token', async () => {
    const owner = `Bearer ${createToken({ ownerId: 'o1', salonId: 's1', role: 'owner' })}`;
    await request(server).post('/api/pro/push-token').set('Authorization', owner).send({ token: 'fcm-abc', platform: 'ios' });
    expect(db.savePushToken).toHaveBeenCalledWith('o1', 'fcm-abc', 'ios');
});

test('admin session cannot request account deletion', async () => {
    const { token } = await openSalon();
    const res = await request(server).post('/api/pro/account/delete-request')
        .set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(403);
    expect(db.updateOwner).not.toHaveBeenCalled();
});
