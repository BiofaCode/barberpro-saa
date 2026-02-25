const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: { type: String, default: '' }, // URL ou chemin du logo uploadé
    branding: {
        primaryColor: { type: String, default: '#C9A96E' },
        accentColor: { type: String, default: '#D4B97E' },
        heroTitle: { type: String, default: '' },
        heroSubtitle: { type: String, default: '' },
    },
    services: [{
        name: { type: String, required: true },
        icon: { type: String, default: '✂️' },
        price: { type: Number, default: 0 },
        duration: { type: Number, default: 30 },
        description: { type: String, default: '' },
        active: { type: Boolean, default: true },
    }],
    hours: {
        type: Map,
        of: new mongoose.Schema({ open: String, close: String }, { _id: false }),
        default: {
            lundi: { open: '09:00', close: '19:00' },
            mardi: { open: '09:00', close: '19:00' },
            mercredi: { open: '09:00', close: '19:00' },
            jeudi: { open: '09:00', close: '19:00' },
            vendredi: { open: '09:00', close: '19:00' },
            samedi: { open: '09:00', close: '18:00' },
        }
    },
    subscription: {
        plan: { type: String, enum: ['starter', 'pro', 'premium'], default: 'pro' },
        status: { type: String, enum: ['active', 'trial', 'suspended', 'cancelled'], default: 'active' },
        price: { type: Number, default: 29.99 },
        startDate: { type: Date, default: Date.now },
    },
    smsReminders: {
        enabled: { type: Boolean, default: false },
        status: { type: String, default: 'En développement' }, // En développement, En attente, Actif
        reminderBefore: { type: Number, default: 24 }, // heures avant le RDV
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Salon', salonSchema);
