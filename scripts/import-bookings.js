/* ============================================
   Import clients + rendez-vous depuis un autre outil (WP Amelia, etc.)
   ============================================
   Usage (simulation par défaut, rien n'est écrit) :
       node scripts/import-bookings.js --salon <slug> --clients clients.csv --bookings rdv.csv
   Puis, une fois le rapport vérifié :
       node scripts/import-bookings.js --salon <slug> --clients clients.csv --bookings rdv.csv --commit

   Options :
       --clients <fichier>   CSV clients   : name, email, phone[, notes]
       --bookings <fichier>  CSV RDV       : date, time, duration, service, price, employee,
                                             client_name, client_email, client_phone, status[, notes]
       --include-past        importe aussi les RDV passés (historique, statut "completed")
       --utc                 les heures du CSV sont en UTC → converties en heure suisse
       --commit              écrit réellement en base (sinon : simulation)

   Formats acceptés : séparateur , ou ; (détecté), guillemets CSV, BOM Excel.
   date : AAAA-MM-JJ ou JJ.MM.AAAA ou JJ/MM/AAAA — time : HH:MM[:SS].
   Requêtes SQL pour exporter depuis Amelia : docs/MIGRATION_AMELIA.md

   Aucun email/SMS n'est envoyé aux clients : le script écrit directement en base.
*/

require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');

// ---------- CLI ----------
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? (args[i + 1] || '') : null; };
const flag = name => args.includes('--' + name);
const SLUG = opt('salon');
const CLIENTS_FILE = opt('clients');
const BOOKINGS_FILE = opt('bookings');
const COMMIT = flag('commit');
const INCLUDE_PAST = flag('include-past');
const FROM_UTC = flag('utc');

// ---------- CSV ----------
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  const header = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// ---------- Normalisation ----------
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const normPhone = p => String(p || '').replace(/[^\d+]/g, '').replace(/^0041/, '+41').replace(/^0(?=\d{9}$)/, '+41');
const normEmail = e => String(e || '').trim().toLowerCase();

function parseDate(s) {
  s = String(s || '').trim();
  let iso = null, m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/))) iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // Reject impossible dates (32.13.2026 would otherwise become "2026-13-32").
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().startsWith(iso) ? iso : null;
}
function parseTime(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}
// UTC "date time" → heure locale Europe/Zurich (gère l'heure d'été).
function utcToZurich(date, time) {
  const d = new Date(`${date}T${time}:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Statuts Amelia (et équivalents) → Kreno. null = ignoré.
const STATUS_MAP = {
  approved: 'confirmed', confirmed: 'confirmed', confirme: 'confirmed', pending: 'confirmed', 'en attente': 'confirmed',
  canceled: null, cancelled: null, annule: null, rejected: null, refuse: null,
  'no-show': 'cancelled', no_show: 'cancelled', completed: 'completed', termine: 'completed',
};

// ---------- Main ----------
async function main() {
  if (!SLUG || (!CLIENTS_FILE && !BOOKINGS_FILE)) {
    console.log('Usage : node scripts/import-bookings.js --salon <slug> [--clients c.csv] [--bookings r.csv] [--include-past] [--utc] [--commit]');
    process.exit(1);
  }
  const db = require('../db');
  await db.connectDB();
  const salon = await db.findSalonBySlug(SLUG);
  if (!salon) { console.error(`❌ Salon "${SLUG}" introuvable. Créez-le d'abord dans Kreno.`); process.exit(1); }

  console.log(`\n${COMMIT ? '✍️  IMPORT RÉEL' : '🔎 SIMULATION (rien n\'est écrit — ajoutez --commit)'} → ${salon.name} (${SLUG})\n`);

  const employees = await db.findEmployees({ salon: salon._id });
  const services = (salon.services || []).filter(s => s.active !== false);
  const findService = name => services.find(s => norm(s.name) === norm(name));
  const findEmployee = name => employees.find(e => norm(e.name) === norm(name))
    || employees.find(e => norm(e.name).split(' ')[0] === norm(name).split(' ')[0] && norm(name));

  // Index des clients déjà présents (ré-exécution sans doublons).
  const existing = await db.findClients({ salon: salon._id });
  const byEmail = new Map(), byPhone = new Map();
  const indexClient = c => {
    if (c.email) byEmail.set(normEmail(c.email), c);
    if (c.phone) byPhone.set(normPhone(c.phone), c);
  };
  existing.forEach(indexClient);
  const lookupClient = (email, phone) => (email && byEmail.get(normEmail(email))) || (phone && byPhone.get(normPhone(phone))) || null;

  const report = { clientsNew: 0, clientsKnown: 0, clientsInvalid: 0, bookingsNew: 0, bookingsDup: 0, bookingsPast: 0, bookingsCancelled: 0, bookingsInvalid: [], conflicts: [] };
  const unknownServices = new Map(), unknownEmployees = new Map();

  // ---- Clients ----
  if (CLIENTS_FILE) {
    for (const r of parseCSV(fs.readFileSync(CLIENTS_FILE, 'utf8'))) {
      const name = r.name || [r.first_name || r.firstname || r.prenom, r.last_name || r.lastname || r.nom].filter(Boolean).join(' ');
      const email = normEmail(r.email);
      const phone = r.phone || r.telephone || '';
      if (!name || (!email && !phone)) { report.clientsInvalid++; continue; }
      if (lookupClient(email, phone)) { report.clientsKnown++; continue; }
      report.clientsNew++;
      const c = { name, email, phone: phone ? normPhone(phone) : '' };
      if (COMMIT) {
        const created = await db.findOrCreateClient(salon._id, c);
        // findOrCreateClient compte une visite : un client importé seul n'en a pas encore.
        await db.updateClient(created._id, { totalBookings: 0, totalSpent: 0, notes: r.notes || '', importedFrom: 'csv' });
        indexClient(created);
      } else indexClient(c);
    }
  }

  // ---- Rendez-vous ----
  if (BOOKINGS_FILE) {
    const today = new Date().toISOString().split('T')[0];
    const bookingsByDate = new Map();
    const dayBookings = async date => {
      if (!bookingsByDate.has(date)) {
        bookingsByDate.set(date, (await db.findBookings({ salon: salon._id, date, status: { $in: ['confirmed', 'pending', 'completed'] } })));
      }
      return bookingsByDate.get(date);
    };

    let line = 1;
    for (const r of parseCSV(fs.readFileSync(BOOKINGS_FILE, 'utf8'))) {
      line++;
      let date = parseDate(r.date), time = parseTime(r.time);
      if (!date || !time) { report.bookingsInvalid.push(`ligne ${line} : date/heure illisible ("${r.date}" "${r.time}")`); continue; }
      if (FROM_UTC) ({ date, time } = utcToZurich(date, time));

      const rawStatus = norm(r.status || 'approved');
      let status = rawStatus in STATUS_MAP ? STATUS_MAP[rawStatus] : 'confirmed';
      if (status === null) { report.bookingsCancelled++; continue; }
      if (date < today) {
        if (!INCLUDE_PAST) { report.bookingsPast++; continue; }
        if (status === 'confirmed') status = 'completed';
      }

      const clientName = r.client_name || r.client || r.customer || '';
      if (!clientName) { report.bookingsInvalid.push(`ligne ${line} : nom du client manquant`); continue; }

      const service = findService(r.service);
      if (!service) unknownServices.set(r.service || '(vide)', (unknownServices.get(r.service || '(vide)') || 0) + 1);
      const emp = r.employee ? findEmployee(r.employee) : null;
      if (r.employee && !emp) unknownEmployees.set(r.employee, (unknownEmployees.get(r.employee) || 0) + 1);

      const duration = Number(r.duration) || service?.duration || 30;
      const price = r.price !== '' && !isNaN(Number(r.price)) ? Number(r.price) : (service?.price ?? 0);

      // Doublon : même date/heure/client déjà présent (ré-exécution du script).
      const sameDay = await dayBookings(date);
      const email = normEmail(r.client_email);
      if (sameDay.some(b => b.time === time && (norm(b.clientName) === norm(clientName) || (email && normEmail(b.clientEmail) === email)))) {
        report.bookingsDup++; continue;
      }
      // Chevauchement (avec Kreno ou une autre ligne du CSV) pour le même employé : importé quand même, mais signalé.
      const start = toMin(time), end = start + duration;
      const clash = sameDay.find(b => (!emp || !b.employeeId || String(b.employeeId) === String(emp._id))
        && start < toMin(b.time) + (b.duration || 30) && end > toMin(b.time));
      if (clash) report.conflicts.push(`${date} ${time} ${clientName} ↔ ${clash.time} ${clash.clientName}`);

      const booking = {
        salon: salon._id,
        clientName, clientEmail: email, clientPhone: r.client_phone ? normPhone(r.client_phone) : '',
        serviceName: service?.name || r.service || 'Prestation', serviceIcon: service?.icon || '✂️',
        price, duration, date, time, notes: r.notes || '',
        employeeId: emp?._id || null, employeeName: emp?.name || null,
        status, source: 'import',
        cancelToken: crypto.randomBytes(16).toString('hex'),
      };
      report.bookingsNew++;
      if (COMMIT) {
        const client = await db.findOrCreateClient(salon._id, { name: clientName, email, phone: booking.clientPhone, price });
        indexClient(client);
        const created = await db.createBooking({ ...booking, client: client._id });
        sameDay.push(created);
      } else sameDay.push(booking);
    }
  }

  // ---- Rapport ----
  console.log('👥 Clients');
  console.log(`   ${report.clientsNew} nouveaux · ${report.clientsKnown} déjà présents · ${report.clientsInvalid} ignorés (ni email ni téléphone)`);
  console.log('📅 Rendez-vous');
  console.log(`   ${report.bookingsNew} à importer · ${report.bookingsDup} déjà présents · ${report.bookingsCancelled} annulés ignorés · ${report.bookingsPast} passés ignorés${INCLUDE_PAST ? '' : ' (--include-past pour l\'historique)'}`);
  if (unknownServices.size) {
    console.log('\n⚠️  Prestations inconnues dans Kreno (importées avec le nom et le prix du CSV) — créez-les ou renommez-les :');
    for (const [n, c] of unknownServices) console.log(`   • "${n}" (${c} RDV)`);
    console.log(`   Prestations Kreno : ${services.map(s => `"${s.name}"`).join(', ') || '(aucune)'}`);
  }
  if (unknownEmployees.size) {
    console.log('\n⚠️  Employés inconnus dans Kreno (RDV importés sans employé) :');
    for (const [n, c] of unknownEmployees) console.log(`   • "${n}" (${c} RDV)`);
    console.log(`   Employés Kreno : ${employees.map(e => `"${e.name}"`).join(', ') || '(aucun)'}`);
  }
  if (report.conflicts.length) {
    console.log(`\n⚠️  ${report.conflicts.length} chevauchement(s) de créneaux (à vérifier avec le salon) :`);
    report.conflicts.slice(0, 20).forEach(c => console.log('   • ' + c));
  }
  if (report.bookingsInvalid.length) {
    console.log(`\n❌ ${report.bookingsInvalid.length} ligne(s) illisible(s) :`);
    report.bookingsInvalid.slice(0, 20).forEach(c => console.log('   • ' + c));
  }
  console.log(COMMIT ? '\n✅ Import terminé.' : '\nℹ️  Simulation terminée. Relancez avec --commit pour importer.');
  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
