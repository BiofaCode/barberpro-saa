/**
 * Alphanumeric SMS sender: the client sees the salon's name instead of a
 * phone number. Opt-in with TWILIO_ALPHA_SENDER=true, Swiss / Liechtenstein
 * numbers only (other countries may need a registration), and falls back to
 * TWILIO_PHONE_NUMBER when Twilio refuses the alphanumeric sender.
 */
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'test';
process.env.TWILIO_PHONE_NUMBER = '+41000000000';

const mockCreate = jest.fn(async () => ({ sid: 'SM1' }));
jest.mock('twilio', () => () => ({ messages: { create: mockCreate } }));

const sms = require('../sms');

const booking = { date: '2026-08-14', time: '10:30', serviceName: 'Coupe', clientName: 'Léa', clientPhone: '079 123 45 67' };
const salon = { name: 'L’Atelier Côté Coiffure', address: 'Rue du Marché 12' };

beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockImplementation(async () => ({ sid: 'SM1' }));
    process.env.TWILIO_ALPHA_SENDER = 'true';
    process.env.TWILIO_PHONE_NUMBER = '+41000000000';
});
afterAll(() => { delete process.env.TWILIO_ALPHA_SENDER; });

describe('smsSenderName', () => {
    test.each([
        ['Dacutzz', 'Dacutzz'],
        ['L’Atelier Côté Coiffure', 'LAtelier'],             // quotes removed, cut between words (11 max)
        ['Salon & Spa', 'Salon Spa'],
        ['  Barber   Shop  ', 'Barber Shop'],
        ['Coiffure 2000 Genève', 'Coiffure'],
        ['Barbershopgeneve', 'Barbershopg'],                // one long word: hard cut
        ['Coiffeur Zoé', 'Coiffeur'],                        // 'Coiffeur Zoe' = 12 chars
        ['Chez Zoé ✂️', 'Chez Zoe'],
        ['12345', ''],                                        // must contain a letter
        ['✂️✂️', ''],
        ['', ''],
        [undefined, ''],
    ])('%p -> %p', (input, expected) => {
        expect(sms.smsSenderName(input)).toBe(expected);
    });
});

describe('sender used by Twilio', () => {
    test('Swiss client gets the salon name as sender', async () => {
        await sms.sendSMSReminder(booking, salon);
        expect(mockCreate.mock.calls[0][0].from).toBe('LAtelier');
        expect(mockCreate.mock.calls[0][0].to).toBe('+41791234567');
    });

    test('custom sender name from the salon settings wins', async () => {
        await sms.sendSMSReminder(booking, { ...salon, smsSettings: { senderName: 'Atelier' } });
        expect(mockCreate.mock.calls[0][0].from).toBe('Atelier');
    });

    test('salon name without letters falls back to "Kreno"', async () => {
        await sms.sendSMSReminder(booking, { name: '2000' });
        expect(mockCreate.mock.calls[0][0].from).toBe('Kreno');
    });

    test('Liechtenstein number also gets the salon name', async () => {
        await sms.sendSMSReminder({ ...booking, clientPhone: '+423 777 12 34' }, salon);
        expect(mockCreate.mock.calls[0][0].from).toBe('LAtelier');
    });

    test('foreign (French) number keeps the phone number sender', async () => {
        await sms.sendSMSReminder({ ...booking, clientPhone: '+33 6 12 34 56 78' }, salon);
        expect(mockCreate.mock.calls[0][0].from).toBe('+41000000000');
    });

    test('owner alert is sent as "Kreno", not as the salon', async () => {
        await sms.sendSMSOwnerNotification(booking, salon, '0790000000');
        expect(mockCreate.mock.calls[0][0].from).toBe('Kreno');
    });

    test('without TWILIO_ALPHA_SENDER the phone number is used (unchanged behaviour)', async () => {
        delete process.env.TWILIO_ALPHA_SENDER;
        await sms.sendSMSReminder(booking, salon);
        expect(mockCreate.mock.calls[0][0].from).toBe('+41000000000');
    });

    test('Twilio refuses the alphanumeric sender -> retried with the phone number', async () => {
        mockCreate
            .mockImplementationOnce(async () => { const e = new Error('Invalid From Number'); e.code = 21212; throw e; })
            .mockImplementationOnce(async () => ({ sid: 'SM2' }));
        const r = await sms.sendSMSReminder(booking, salon);
        expect(r).toEqual({ success: true, sid: 'SM2' });
        expect(mockCreate.mock.calls.map(c => c[0].from)).toEqual(['LAtelier', '+41000000000']);
    });

    test('alphanumeric sender works even without a Twilio phone number', async () => {
        process.env.TWILIO_PHONE_NUMBER = '';
        const r = await sms.sendSMSReminder(booking, salon);
        expect(r.success).toBe(true);
        expect(mockCreate.mock.calls[0][0].from).toBe('LAtelier');
    });

    test('foreign number without a Twilio phone number is not sent', async () => {
        process.env.TWILIO_PHONE_NUMBER = '';
        const r = await sms.sendSMSReminder({ ...booking, clientPhone: '+33612345678' }, salon);
        expect(r).toEqual({ success: false, reason: 'no_from' });
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

describe('protected names are never used as sender (phishing)', () => {
    test.each(['UBS', 'Post Finance', 'postfinance', 'TWINT', 'Swisscom', 'Raiffeisen', 'SBB CFF', 'PayPal', 'Apple', 'Police', 'UBS Coiffure', 'ZKB Coiffure'])(
        'salon named %p is sent as "Kreno"', async name => {
            await sms.sendSMSReminder(booking, { name });
            expect(mockCreate.mock.calls[0][0].from).toBe('Kreno');
        });

    test('protected custom sender name falls back to the salon name', async () => {
        await sms.sendSMSReminder(booking, { name: 'Dacutzz', smsSettings: { senderName: 'UBS' } });
        expect(mockCreate.mock.calls[0][0].from).toBe('Dacutzz');
    });

    test('ordinary words are allowed', () => {
        for (const n of ['Swiss Cut', 'Salt and Pepper', 'Post Barber', 'Le Salon', 'Dacutzz']) {
            expect(sms.isProtectedSenderName(n)).toBe(false);
        }
    });
});
