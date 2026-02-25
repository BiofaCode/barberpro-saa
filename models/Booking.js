const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    serviceName: { type: String, required: true },
    serviceIcon: { type: String, default: '✂️' },
    price: { type: Number, default: 0 },
    duration: { type: Number, default: 30 },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM
    status: { type: String, enum: ['confirmed', 'pending', 'completed', 'cancelled'], default: 'confirmed' },
    notes: { type: String, default: '' },
    source: { type: String, default: 'website' }, // website, app, admin
    smsReminderSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
