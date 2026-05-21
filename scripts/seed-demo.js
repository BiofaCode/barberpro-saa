/* ============================================
   Seed démo App Store / Apple Review
   ============================================
   Crée (ou recrée) un salon de démonstration "Kreno Demo" avec des données
   réalistes : services, employés, clients et rendez-vous répartis sur la
   semaine. Sert à la fois pour la review Apple ET pour faire de beaux
   screenshots App Store.

   Identifiants de connexion (pro portal + app mobile) :
       email    : demo@kreno.ch
       password : demo1234

   Usage :
       node scripts/seed-demo.js
   (lit MONGODB_URI depuis l'environnement / .env)
*/

require('dotenv').config();
const db = require('../db');

const DEMO_SLUG = 'kreno-demo';
const DEMO_EMAIL = 'demo@kreno.ch';
const DEMO_PASSWORD = 'demo1234';

// YYYY-MM-DD à partir d'un décalage en jours par rapport à aujourd'hui.
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const SERVICES = [
  { name: 'Coupe & Brushing', icon: '💇‍♀️', price: 45, duration: 45, description: 'Diagnostic, coupe sur mesure et brushing', active: true },
  { name: 'Coupe Homme',      icon: '✂️', price: 28, duration: 30, description: 'Coupe classique ou tendance', active: true },
  { name: 'Taille de Barbe',  icon: '🪒', price: 18, duration: 20, description: 'Sculpture et entretien à la serviette chaude', active: true },
  { name: 'Coloration',       icon: '🎨', price: 65, duration: 75, description: 'Coloration professionnelle, racines ou complète', active: true },
  { name: 'Balayage',         icon: '✨', price: 90, duration: 120, description: 'Éclaircissement naturel mèche à mèche', active: true },
  { name: 'Soin Profond',     icon: '🧴', price: 35, duration: 40, description: 'Rituel hydratation et réparation', active: true },
];

// Employés (mots de passe simples pour démo — le owner peut aussi tout gérer).
const EMPLOYEES = [
  { name: 'Léa Moreau',    email: 'lea@kreno-demo.ch',   role: 'Coloriste',  specialties: ['Coloration', 'Balayage', 'Coupe & Brushing'] },
  { name: 'Yanis Cherif',  email: 'yanis@kreno-demo.ch', role: 'Barbier',    specialties: ['Coupe Homme', 'Taille de Barbe'] },
  { name: 'Camille Roy',   email: 'camille@kreno-demo.ch', role: 'Coiffeuse', specialties: ['Coupe & Brushing', 'Soin Profond'] },
];

// Clients démo.
const CLIENTS = [
  { name: 'Sophie Dubois',    email: 'sophie.dubois@example.com',   phone: '079 123 45 67' },
  { name: 'Marc Lefèvre',     email: 'marc.lefevre@example.com',    phone: '078 234 56 78' },
  { name: 'Inès Bonnet',      email: 'ines.bonnet@example.com',     phone: '076 345 67 89' },
  { name: 'Thomas Girard',    email: 'thomas.girard@example.com',   phone: '079 456 78 90' },
  { name: 'Aurélie Martin',   email: 'aurelie.martin@example.com',  phone: '078 567 89 01' },
  { name: 'Karim Haddad',     email: 'karim.haddad@example.com',    phone: '076 678 90 12' },
  { name: 'Julie Fontaine',   email: 'julie.fontaine@example.com',  phone: '079 789 01 23' },
  { name: 'Nicolas Perret',   email: 'nicolas.perret@example.com',  phone: '078 890 12 34' },
];

// Rendez-vous : offset jour, heure, service, client (index), statut.
// Pensé pour que la vue "Aujourd'hui" et l'agenda soient bien remplis.
const BOOKINGS = [
  // Hier — terminés
  { day: -1, time: '10:00', svc: 'Coloration',      cli: 0, emp: 0, status: 'completed' },
  { day: -1, time: '14:30', svc: 'Coupe Homme',     cli: 1, emp: 1, status: 'completed' },
  // Aujourd'hui — mix réaliste
  { day: 0,  time: '09:00', svc: 'Coupe & Brushing', cli: 4, emp: 2, status: 'completed' },
  { day: 0,  time: '10:30', svc: 'Taille de Barbe',  cli: 5, emp: 1, status: 'in_progress' },
  { day: 0,  time: '11:30', svc: 'Balayage',         cli: 2, emp: 0, status: 'confirmed' },
  { day: 0,  time: '14:00', svc: 'Coupe Homme',      cli: 7, emp: 1, status: 'confirmed' },
  { day: 0,  time: '15:30', svc: 'Soin Profond',     cli: 6, emp: 2, status: 'pending' },
  { day: 0,  time: '17:00', svc: 'Coloration',       cli: 0, emp: 0, status: 'confirmed' },
  // Demain
  { day: 1,  time: '09:30', svc: 'Coupe & Brushing', cli: 3, emp: 2, status: 'confirmed' },
  { day: 1,  time: '11:00', svc: 'Taille de Barbe',  cli: 1, emp: 1, status: 'confirmed' },
  { day: 1,  time: '16:00', svc: 'Balayage',         cli: 4, emp: 0, status: 'confirmed' },
  // Après-demain
  { day: 2,  time: '10:00', svc: 'Coupe Homme',      cli: 7, emp: 1, status: 'confirmed' },
  { day: 2,  time: '13:30', svc: 'Coloration',       cli: 2, emp: 0, status: 'confirmed' },
  { day: 3,  time: '15:00', svc: 'Soin Profond',     cli: 6, emp: 2, status: 'confirmed' },
];

async function run() {
  await db.connectDB();

  // 1. Nettoyer l'ancien salon démo (idempotent).
  const existing = await db.findSalonBySlug(DEMO_SLUG);
  if (existing) {
    await db.deleteSalon(existing._id);
    console.log('🗑️  Ancien salon démo supprimé');
  }

  // 2. Salon.
  const salon = await db.createSalon({
    slug: DEMO_SLUG,
    name: 'Kreno Demo',
    description: 'Salon de coiffure & barbier — démonstration Kreno',
    address: '15 Rue du Marché, 1204 Genève',
    phone: '022 345 67 89',
    email: 'contact@kreno-demo.ch',
    plan: 'pro',
    logo: '',
    branding: {
      primaryColor: '#6366F1',
      accentColor: '#818CF8',
      backgroundColor: '#F8FAFC',
      heroTitle: 'Votre style, notre savoir-faire',
      heroSubtitle: 'Coiffure & barbier au cœur de Genève',
    },
    services: SERVICES.map(s => ({ _id: require('crypto').randomBytes(12).toString('hex'), ...s })),
    hours: {
      lundi:    { open: '09:00', close: '19:00' },
      mardi:    { open: '09:00', close: '19:00' },
      mercredi: { open: '09:00', close: '19:00' },
      jeudi:    { open: '09:00', close: '20:00' },
      vendredi: { open: '09:00', close: '20:00' },
      samedi:   { open: '09:00', close: '18:00' },
    },
    subscription: { plan: 'pro', status: 'active', price: 29.90 },
    smsCredits: 50,
    rating: 4.8,
    reviewCount: 87,
    active: true,
  });
  console.log(`🏪 Salon créé : ${salon.name} (${salon.slug})`);

  // 3. Propriétaire (compte démo Apple).
  await db.createOwner({
    salon: salon._id,
    name: 'Émma Laurent',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    phone: '079 000 11 22',
    role: 'owner',
  });
  console.log(`👤 Owner créé : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // 4. Employés.
  const employees = [];
  for (const e of EMPLOYEES) {
    const emp = await db.createEmployee({ salon: salon._id, ...e });
    employees.push(emp);
  }
  console.log(`💈 ${employees.length} employés créés`);

  // 5. Clients.
  const clients = [];
  for (const c of CLIENTS) {
    const cli = await db.findOrCreateClient(salon._id, { ...c, price: 0 });
    clients.push(cli);
  }
  console.log(`🧑‍🤝‍🧑 ${clients.length} clients créés`);

  // 6. Rendez-vous.
  let count = 0;
  for (const b of BOOKINGS) {
    const svc = SERVICES.find(s => s.name === b.svc);
    const cli = clients[b.cli];
    const emp = employees[b.emp];
    await db.createBooking({
      salon: salon._id,
      client: cli._id,
      clientName: cli.name,
      clientEmail: cli.email,
      clientPhone: cli.phone,
      serviceName: svc.name,
      serviceIcon: svc.icon,
      price: svc.price,
      duration: svc.duration,
      date: dateStr(b.day),
      time: b.time,
      notes: '',
      employeeId: emp._id,
      employeeName: emp.name,
      status: b.status,
      source: 'demo',
      cancelToken: require('crypto').randomBytes(16).toString('hex'),
    });
    count++;
  }
  console.log(`📅 ${count} rendez-vous créés`);

  console.log('\n✅ Seed démo terminé.');
  console.log(`   Connexion : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed démo échoué :', err);
  process.exit(1);
});
