/**
 * PUT /api/pro/salon/:salonId/bookings/:bookingId — reschedule overlap guard.
 *
 * Regression: rescheduling a booking onto an occupied slot used to succeed,
 * producing two bookings at the same time for the same employee.
 */

jest.mock('../db', () => ({
    connectDB: jest.fn(),
    seedIfEmpty: jest.fn(),
    findBookingById: jest.fn(),
    findBookings: jest.fn().mockResolvedValue([]),
    findBlocks: jest.fn().mockResolvedValue([]),
    updateBooking: jest.fn(),
    findSalonById: jest.fn(),
    findSalonBySlug: jest.fn(),
    updateSalon: jest.fn(),
    findSalons: jest.fn().mockResolvedValue([]),
    savePushToken: jest.fn(),
    removePushToken: jest.fn(),
    findOwnerById: jest.fn(),
    findOwners: jest.fn().mockResolvedValue([]),
    findEmployees: jest.fn().mockResolvedValue([]),
    findPushTokensBySalon: jest.fn().mockResolvedValue([]),
}));
jest.mock('../email', () => new Proxy({}, { get: () => jest.fn() }));
jest.mock('../push', () => ({ init: jest.fn(), sendToSalon: jest.fn().mockResolvedValue({ sent: 0, removed: 0 }) }));
jest.mock('../sms', () => ({
    sendSMSConfirmation: jest.fn(),
    sendSMSReminder: jest.fn(),
    sendSMSCancellation: jest.fn(),
    sendSMSOwnerNotification: jest.fn(),
    SMS_PACKS: {},
}));

const request = require('supertest');
const db = require('../db');
const { server, createToken } = require('../server');

const SALON = 'salon_1';
const BOOKING = 'booking_1';
const ownerToken = () => createToken({ ownerId: 'owner_1', salonId: SALON, role: 'owner' });

const url = `/api/pro/salon/${SALON}/bookings/${BOOKING}`;

describe('PUT booking reschedule — overlap guard', () => {
    beforeEach(() => jest.clearAllMocks());

    it('blocks a reschedule onto an occupied slot (same employee) with 409', async () => {
        db.findBookingById.mockResolvedValueOnce({
            _id: BOOKING, salon: SALON, date: '2026-06-12', time: '10:00',
            duration: 30, employeeId: 'emp_1', status: 'confirmed',
        });
        // Another booking already at the target slot.
        db.findBookings.mockResolvedValueOnce([
            { _id: 'other', employeeId: 'emp_1', time: '14:00', duration: 30 },
        ]);

        const res = await request(server)
            .put(url)
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ date: '2026-06-13', time: '14:00' });

        expect(res.status).toBe(409);
        expect(db.updateBooking).not.toHaveBeenCalled();
    });

    it('allows a reschedule onto a free slot', async () => {
        db.findBookingById.mockResolvedValueOnce({
            _id: BOOKING, salon: SALON, date: '2026-06-12', time: '10:00',
            duration: 30, employeeId: 'emp_1', status: 'confirmed',
        });
        db.findBookings.mockResolvedValueOnce([]); // nothing at target
        db.updateBooking.mockResolvedValueOnce({ _id: BOOKING, date: '2026-06-13', time: '14:00' });

        const res = await request(server)
            .put(url)
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ date: '2026-06-13', time: '14:00' });

        expect(res.status).toBe(200);
        expect(db.updateBooking).toHaveBeenCalledWith(BOOKING, expect.objectContaining({
            date: '2026-06-13', time: '14:00',
        }));
    });

    it('does not check overlap against itself when only status changes', async () => {
        db.findBookingById.mockResolvedValueOnce({
            _id: BOOKING, salon: SALON, date: '2026-06-12', time: '10:00',
            duration: 30, employeeId: 'emp_1', status: 'confirmed',
        });
        db.updateBooking.mockResolvedValueOnce({ _id: BOOKING, status: 'completed' });

        const res = await request(server)
            .put(url)
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ status: 'completed' });

        expect(res.status).toBe(200);
        expect(db.findBookings).not.toHaveBeenCalled();
    });

    it('skips overlap check when the booking is being cancelled', async () => {
        db.findBookingById.mockResolvedValueOnce({
            _id: BOOKING, salon: SALON, date: '2026-06-12', time: '10:00',
            duration: 30, employeeId: 'emp_1', status: 'confirmed',
        });
        db.updateBooking.mockResolvedValueOnce({ _id: BOOKING, status: 'cancelled' });

        const res = await request(server)
            .put(url)
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ status: 'cancelled', date: '2026-06-13', time: '14:00' });

        expect(res.status).toBe(200);
        expect(db.findBookings).not.toHaveBeenCalled();
    });

    it('returns 404 when the booking belongs to another salon', async () => {
        db.findBookingById.mockResolvedValueOnce({ _id: BOOKING, salon: 'other_salon', status: 'confirmed' });
        const res = await request(server)
            .put(url)
            .set('Authorization', `Bearer ${ownerToken()}`)
            .send({ time: '14:00' });
        expect(res.status).toBe(404);
    });
});
