/**
 * SMS templates must stay in ONE GSM-7 segment.
 *
 * Regression: emojis (and â/ô/û/ç/À, curly quotes, "—") switched every SMS to
 * UCS-2 (70 chars/segment), so a ~130-char reminder was billed as 2 SMS by
 * Twilio while the salon was charged a single credit.
 */
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'test';
process.env.TWILIO_PHONE_NUMBER = '+41000000000';

const mockCreate = jest.fn(async () => ({ sid: 'SM1' }));
jest.mock('twilio', () => () => ({ messages: { create: mockCreate } }));

const sms = require('../sms');

const GSM7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà]*$/;

const booking = { date: '2026-08-14', time: '10:30', serviceName: 'Coupe Homme + Taille de barbe à l’ancienne', clientName: 'François Müller-Dupont', clientPhone: '079 123 45 67' };
const salons = [
    { name: 'Dacutzz', address: 'Rue du Marché 12, 2300 La Chaux-de-Fonds', phone: '032 123 45 67' },
    { name: 'L’Atelier Côté Coiffure & Barbier — Maison Bientôt', address: 'Avenue Léopold-Robert 108, 2300 La Chaux-de-Fonds, Suisse', phone: '' },
];

beforeEach(() => mockCreate.mockClear());

describe.each(salons)('SMS for salon "$name"', salon => {
    test.each([
        ['confirmation', () => sms.sendSMSConfirmation(booking, salon)],
        ['reminder', () => sms.sendSMSReminder(booking, salon)],
        ['cancellation', () => sms.sendSMSCancellation(booking, salon)],
        ['reschedule', () => sms.sendSMSReschedule(booking, salon)],
        ['owner notification', () => sms.sendSMSOwnerNotification(booking, salon, '0790000000')],
    ])('%s is a single GSM-7 segment', async (_label, send) => {
        await send();
        const { body } = mockCreate.mock.calls[0][0];
        expect(body).toMatch(GSM7);
        expect(body.length).toBeLessThanOrEqual(160);
        expect(body).toContain('10:30');
    });
});

test('toGSM7 keeps é/è/à, transliterates the rest and drops emojis', () => {
    expect(sms.toGSM7('À bientôt ! Août, ça va ? 💈 l’adresse — été, très, à'))
        .toBe("A bientot ! Aout, ca va ? l'adresse - été, très, à");
});
