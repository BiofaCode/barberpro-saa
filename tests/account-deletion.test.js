/**
 * POST /api/pro/account/delete-request — account deletion started from the app
 * (App Store guideline 5.1.1(v)).
 */
jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findOwnerById: jest.fn(),
    findEmployeeById: jest.fn(),
    updateOwner: jest.fn(),
    updateEmployee: jest.fn(),
    findSalonById: jest.fn().mockResolvedValue({ _id: 's1', name: 'Demo' }),
    addSalonLog: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findBookings: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
const mockSendEmail = jest.fn().mockResolvedValue({});
jest.mock('../email', () => new Proxy({}, { get: (_t, k) => (k === 'sendEmail' ? mockSendEmail : jest.fn().mockResolvedValue()) }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));

const request = require('supertest');
const db = require('../db');
const { server, createToken } = require('../server');

const url = '/api/pro/account/delete-request';
beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = 'admin@kreno.ch';
});

test('owner request is recorded and both emails are sent', async () => {
    db.findOwnerById.mockResolvedValue({ _id: 'o1', name: 'Emma', email: 'emma@salon.ch' });
    const res = await request(server).post(url)
        .set('Authorization', `Bearer ${createToken({ ownerId: 'o1', salonId: 's1', role: 'owner' })}`).send({});
    expect(res.status).toBe(200);
    expect(db.updateOwner).toHaveBeenCalledWith('o1', { deletionRequestedAt: expect.any(String) });
    expect(db.addSalonLog).toHaveBeenCalledWith('s1', 'account_deletion_requested', expect.objectContaining({ role: 'owner' }));
    const recipients = mockSendEmail.mock.calls.map(c => c[0].to);
    expect(recipients).toEqual(expect.arrayContaining(['admin@kreno.ch', 'emma@salon.ch']));
});

test('employee request flags the employee account only', async () => {
    db.findEmployeeById.mockResolvedValue({ _id: 'e1', name: 'Yanis', email: 'yanis@salon.ch' });
    const res = await request(server).post(url)
        .set('Authorization', `Bearer ${createToken({ employeeId: 'e1', salonId: 's1', role: 'employee' })}`).send({});
    expect(res.status).toBe(200);
    expect(db.updateEmployee).toHaveBeenCalledWith('e1', { deletionRequestedAt: expect.any(String) });
    expect(db.updateOwner).not.toHaveBeenCalled();
});

test('requires authentication', async () => {
    const res = await request(server).post(url).send({});
    expect(res.status).toBe(401);
    expect(db.updateOwner).not.toHaveBeenCalled();
});
