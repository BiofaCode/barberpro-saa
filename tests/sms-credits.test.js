/**
 * SMS credits: purchased / offered credits must survive the monthly reset.
 *
 * Regression: on each subscription renewal smsCredits was reset to the plan
 * allowance, wiping the SMS packs the salon had paid for.
 */
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findSalonById: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    updateSalon: jest.fn(),
    addSalonLog: jest.fn(),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findBookings: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));

const request = require('supertest');
const Stripe = require('stripe');
const db = require('../db');
const { server, createToken } = require('../server');

const stripe = Stripe('sk_test_dummy');
function sendWebhook(event) {
    const payload = JSON.stringify(event);
    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    return request(server).post('/api/stripe/webhook')
        .set('stripe-signature', sig).set('Content-Type', 'application/json').send(payload);
}
const renewal = { type: 'invoice.payment_succeeded', data: { object: { billing_reason: 'subscription_cycle', amount_paid: 4900, customer: 'cus_1' } } };

beforeEach(() => jest.clearAllMocks());

test('renewal keeps purchased credits on top of the plan allowance', async () => {
    // Pro plan (200/month): 260 left, 250 of which were bought → 200 + 250
    db.findSalons.mockResolvedValue([{ _id: 's1', subscription: { plan: 'pro' }, smsCredits: 260, smsPurchased: 250 }]);
    const res = await sendWebhook(renewal);
    expect(res.status).toBe(200);
    expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsCredits: 450, smsPurchased: 250 });
});

test('renewal never restores more purchased credits than are left', async () => {
    // Bought 250 but only 30 left in total → 200 + 30
    db.findSalons.mockResolvedValue([{ _id: 's1', subscription: { plan: 'pro' }, smsCredits: 30, smsPurchased: 250 }]);
    await sendWebhook(renewal);
    expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsCredits: 230, smsPurchased: 30 });
});

test('renewal without purchased credits resets to the plan allowance', async () => {
    db.findSalons.mockResolvedValue([{ _id: 's1', subscription: { plan: 'pro' }, smsCredits: 57 }]);
    await sendWebhook(renewal);
    expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsCredits: 200, smsPurchased: 0 });
});

describe('POST /api/admin/salons/:id/sms-credits', () => {
    const admin = () => createToken({ role: 'superadmin' });

    test('adds offered credits as purchased', async () => {
        db.findSalonById.mockResolvedValue({ _id: 's1', smsCredits: 10, smsPurchased: 0 });
        const res = await request(server).post('/api/admin/salons/s1/sms-credits')
            .set('Authorization', `Bearer ${admin()}`).send({ credits: 200 });
        expect(res.status).toBe(200);
        expect(db.updateSalon).toHaveBeenCalledWith('s1', { smsCredits: 210, smsPurchased: 200 });
    });

    test('rejects invalid amounts and non-admins', async () => {
        db.findSalonById.mockResolvedValue({ _id: 's1', smsCredits: 0 });
        const bad = await request(server).post('/api/admin/salons/s1/sms-credits')
            .set('Authorization', `Bearer ${admin()}`).send({ credits: -5 });
        expect(bad.status).toBe(400);
        const owner = createToken({ ownerId: 'o1', salonId: 's1', role: 'owner' });
        const forbidden = await request(server).post('/api/admin/salons/s1/sms-credits')
            .set('Authorization', `Bearer ${owner}`).send({ credits: 200 });
        expect(forbidden.status).toBe(401);
        expect(db.updateSalon).not.toHaveBeenCalled();
    });
});
