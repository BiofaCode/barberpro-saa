/* ============================================
   Seed démo prospect : Da Cutzz (Neuchâtel)
   ============================================
   Crée (ou recrée) le salon de démonstration « Da Cutzz » à partir des infos
   publiques de dacutzz.ch : vraies prestations et tarifs, horaires, couleurs, logo,
   Divio (fondateur / barbier, = compte propriétaire). Ottilie garde son propre système
   (co-labs) : elle n'est pas dans la démo, Kreno remplace uniquement Amelia pour Divio.
   Ajoute de faux clients et une semaine de RDV pour que l'agenda soit vivant.

   ⚠️ Démo uniquement : les clients et RDV sont FICTIFS (source: 'demo').
   Aucun email / SMS n'est envoyé (écriture directe en base).

   Usage :
       node scripts/seed-dacutzz.js
   Affiche à la fin l'URL publique, l'URL d'intégration et les identifiants.
   Pour supprimer : relancer avec --delete
*/

require('dotenv').config();
const crypto = require('crypto');
const db = require('../db');

// ⚠️ Un ancien salon de test « dacutzz » existe déjà en base (mars 2026) : on ne l'écrase pas.
// Autre slug possible : node scripts/seed-dacutzz.js --slug da-cutzz
const slugArg = process.argv.indexOf('--slug');
const SLUG = slugArg > -1 ? process.argv[slugArg + 1] : 'dacutzz-demo';
const OWNER_EMAIL = `demo-${SLUG}@kreno.ch`;
// Mot de passe aléatoire à chaque seed (le salon tourne sur la base de prod).
const OWNER_PASSWORD = process.env.DACUTZZ_DEMO_PASSWORD || crypto.randomBytes(6).toString('base64url');
const LOGO = 'https://dacutzz.ch/wp-content/uploads/2026/01/cropped-Logo-Dacutzz.png';

const id = () => crypto.randomBytes(12).toString('hex');
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// --- Prestations (dacutzz.ch/prestations-homme + /prestations-femme) ---
// who: 'divio' (barber). Les prix « de X à Y » prennent X,
// la fourchette est indiquée dans la description.
const SERVICES = [
  // Homme — Divio
  { who: 'divio', name: 'Coupe + coiffage', icon: '✂️', price: 32, duration: 35, description: '' },
  { who: 'divio', name: 'Coupe transformation', icon: '✂️', price: 38, duration: 45, description: 'Cheveux longs à volume important → coupe courte dégradée' },
  { who: 'divio', name: 'Couronne', icon: '✂️', price: 25, duration: 20, description: '' },
  { who: 'divio', name: 'Barbe (taille & contours)', icon: '🪒', price: 20, duration: 20, description: '' },
  { who: 'divio', name: 'Coupe + barbe', icon: '💈', price: 48, duration: 50, description: '' },
  { who: 'divio', name: 'Coupe transformation complète', icon: '⭐', price: 95, duration: 75, description: 'Premium : coupe transformation, shampooing avec massage et coiffage' },
  { who: 'divio', name: 'Soin du visage', icon: '🧖', price: 30, duration: 20, description: '' },
  { who: 'divio', name: 'Soin capillaire + massage', icon: '🧴', price: 20, duration: 20, description: '' },
  { who: 'divio', name: 'Jeunes -15 ans : Coupe + coiffage', icon: '🧒', price: 25, duration: 35, description: 'Tarif jeunes (moins de 15 ans)' },
  { who: 'divio', name: 'Jeunes -15 ans : Coupe + barbe', icon: '🧒', price: 40, duration: 50, description: 'Tarif jeunes (moins de 15 ans)' },
];

// Horaires dacutzz.ch : lundi + dimanche fermés.
const HOURS = {
  mardi: { open: '09:00', close: '19:00' },
  mercredi: { open: '09:00', close: '19:00' },
  jeudi: { open: '09:00', close: '20:00' },
  vendredi: { open: '09:00', close: '19:00' },
  samedi: { open: '09:00', close: '17:00' },
};

// Clients FICTIFS (emails en example.com : aucun envoi réel possible).
const CLIENTS = [
  ['Luca Rossi', '079 111 22 01'], ['Mehdi Benali', '078 111 22 02'], ['Kevin Matthey', '076 111 22 03'],
  ['Arnaud Perrin', '079 111 22 04'], ['Samir Haddad', '078 111 22 05'], ['Julien Favre', '076 111 22 06'],
  ['Bastien Jeanneret', '079 111 22 07'], ['Loïc Monnier', '078 111 22 08'], ['Yanis Ducommun', '076 111 22 09'],
  ['Hugo Robert', '079 111 22 10'], ['Noah Girard', '078 111 22 11'], ['Enzo Costa', '076 111 22 12'],
].map(([name, phone]) => ({ name, phone, email: `${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.')}@example.com` }));

// RDV : jour (offset), heure, prestation, client (index), statut.
const BOOKINGS = [
  // Passés (terminés) — alimentent stats + avis
  [-6, '09:30', 'Coupe + barbe', 0, 'completed'], [-6, '14:00', 'Coupe + coiffage', 6, 'completed'],
  [-5, '10:00', 'Coupe + coiffage', 1, 'completed'], [-5, '11:00', 'Coupe transformation', 7, 'completed'],
  [-4, '16:00', 'Barbe (taille & contours)', 2, 'completed'], [-3, '09:00', 'Soin du visage', 8, 'completed'],
  [-3, '17:30', 'Coupe transformation complète', 3, 'completed'], [-2, '10:30', 'Coupe + barbe', 4, 'completed'],
  [-1, '15:00', 'Couronne', 9, 'completed'], [-1, '18:00', 'Coupe + coiffage', 5, 'completed'],
  // À venir
  [0, '18:00', 'Coupe + barbe', 10, 'confirmed'],
  [1, '09:00', 'Coupe + coiffage', 0, 'confirmed'], [1, '09:45', 'Barbe (taille & contours)', 2, 'confirmed'],
  [1, '10:30', 'Coupe + barbe', 4, 'confirmed'], [1, '14:00', 'Coupe transformation', 1, 'confirmed'],
  [1, '15:00', 'Soin capillaire + massage', 11, 'confirmed'],
  [1, '16:30', 'Jeunes -15 ans : Coupe + coiffage', 10, 'confirmed'], [1, '17:30', 'Coupe + barbe', 3, 'confirmed'],
  [2, '09:30', 'Coupe + coiffage', 5, 'confirmed'], [2, '11:00', 'Coupe + barbe', 8, 'confirmed'],
  [2, '15:00', 'Coupe + barbe', 1, 'confirmed'], [3, '11:00', 'Coupe transformation complète', 9, 'confirmed'],
  [3, '18:00', 'Coupe + coiffage', 2, 'confirmed'],
];

const REVIEWS = [
  [0, 5, 'Coupe + barbe au top, Divio est un vrai pro. Je reviens dans 3 semaines !'],
  [1, 5, 'Toujours nickel, et on se sent bien accueilli. Merci Divio !'],
  [3, 5, 'Il a enfin compris ce que je voulais pour mes cheveux longs. Top.'],
  [6, 5, 'Transformation complète réussie, accueil super sympa.'],
  [7, 4, 'Rapide, précis, bonne ambiance.'],
];

async function run() {
  await db.connectDB();

  const existing = await db.findSalonBySlug(SLUG);
  if (existing) {
    // Sécurité : on ne supprime que ce que ce script a créé lui-même.
    if (!existing.demoSeed) {
      console.error(`❌ Un salon « ${existing.name} » (${SLUG}) existe déjà et n'a pas été créé par ce script. Rien n'a été modifié.`);
      console.error('   Choisir un autre slug : node scripts/seed-dacutzz.js --slug <autre-slug>');
      process.exit(1);
    }
    await db.deleteSalon(existing._id);
    console.log('🗑️  Ancien salon démo Da Cutzz supprimé');
  }
  if (process.argv.includes('--delete')) { console.log('✅ Supprimé.'); process.exit(0); }

  const services = SERVICES.map(({ who, ...s }) => ({ _id: id(), ...s, active: true, _who: who }));

  const salon = await db.createSalon({
    slug: SLUG,
    name: 'Da Cutzz',
    description: 'Barber shop à Neuchâtel (Serrières). Coupe, barbe, soins.',
    address: 'Rue du Clos-de-Serrières 31, 2000 Neuchâtel',
    city: 'Neuchâtel',
    phone: '076 841 23 80',
    email: 'colab.dacutzz@outlook.com',
    logo: LOGO,
    plan: 'pro',
    branding: {
      primaryColor: '#ff66c4',
      accentColor: '#e63399',
      backgroundColor: '#0a0a0a',
      heroTitle: 'Da Cutzz',
      heroSubtitle: 'Barber shop à Neuchâtel',
    },
    services: services.map(({ _who, ...s }) => s),
    hours: HOURS,
    subscription: { plan: 'pro', status: 'active', price: 49 },
    smsSettings: { clientConfirmation: true, clientReminder: true, ownerNotification: false },
    smsCredits: 0,
    rating: 4.9,
    reviewCount: REVIEWS.length,
    active: true,
    demoSeed: 'seed-dacutzz', // marqueur : autorise ce script à recréer / supprimer ce salon
  });
  const salonId = salon._id;
  console.log(`🏪 Salon créé : ${salon.name} (${SLUG})`);

  // Divio = propriétaire (les owners sont réservables comme staff).
  const owner = await db.createOwner({
    salon: salonId, name: 'Divio', email: OWNER_EMAIL, password: OWNER_PASSWORD,
    phone: '', role: 'owner', specialties: ['Coupe homme', 'Barbe', 'Soins'], hours: HOURS,
  });
  const staff = { divio: owner };
  console.log('💈 Divio (propriétaire, réservable) créé');

  // Chaque prestation n'est proposée qu'avec la bonne personne.
  await db.updateSalon(salonId, {
    services: services.map(({ _who, ...s }) => ({ ...s, assignedEmployees: [String(staff[_who]._id)] })),
  });

  const clients = [];
  for (const c of CLIENTS) clients.push(await db.findOrCreateClient(salonId, { ...c, price: 0 }));

  const created = [];
  for (const [day, time, svcName, cli, status] of BOOKINGS) {
    const svc = services.find(s => s.name === svcName);
    if (!svc) throw new Error(`Prestation inconnue : ${svcName}`);
    const emp = staff[svc._who];
    const c = clients[cli];
    created.push(await db.createBooking({
      salon: salonId, client: c._id, clientName: c.name, clientEmail: c.email, clientPhone: c.phone,
      serviceName: svc.name, serviceIcon: svc.icon, price: svc.price, duration: svc.duration,
      date: dateStr(day), time, notes: '', employeeId: emp._id, employeeName: emp.name,
      // Faux clients : jamais de rappel ni de demande d'avis envoyés.
      status, source: 'demo', cancelToken: id(), reminderSent: true, reviewEmailSent: true,
    }));
  }
  console.log(`📅 ${created.length} RDV fictifs créés`);

  for (const [idx, rating, comment] of REVIEWS) {
    await db.updateBooking(created[idx]._id, {
      reviewed: true, reviewRating: rating, reviewComment: comment, reviewApproved: true,
      reviewDate: new Date().toISOString(), reviewEmailSent: true,
    });
  }
  console.log(`⭐ ${REVIEWS.length} avis créés`);

  const base = process.env.PUBLIC_BASE_URL || 'https://kreno.ch';
  console.log('\n✅ Démo Da Cutzz prête');
  console.log(`   Site Kreno      : ${base}/s/${SLUG}`);
  console.log(`   Réservation seule (iframe) : ${base}/s/${SLUG}?embed=1`);
  console.log(`   Portail pro / app : ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  process.exit(0);
}

run().catch(err => { console.error('❌ Seed Da Cutzz échoué :', err); process.exit(1); });
