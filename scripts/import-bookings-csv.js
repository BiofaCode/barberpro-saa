/* ============================================
   Import de RDV depuis un CSV (ex. export Amelia / WordPress) — SANS notification
   ============================================
   Écrit directement en base : aucun email, aucun SMS de confirmation.
   Rejouable : chaque ligne porte un identifiant externe (externalId). Si on relance
   l'import avec un CSV plus récent, les RDV déjà importés sont MIS À JOUR (date, heure,
   statut annulé…) au lieu d'être dupliqués. Ça permet de « refléter » l'ancien système
   dans Kreno chaque jour pendant la phase de test, sens unique ancien → Kreno.

   Usage :
       node scripts/import-bookings-csv.js --salon dacutzz --file rdv.csv            (simulation, n'écrit rien)
       node scripts/import-bookings-csv.js --salon dacutzz --file rdv.csv --commit   (écrit en base)
   Options :
       --from 2026-11-13   ignorer les RDV avant cette date (défaut : aujourd'hui)
       --reminders         laisser Kreno envoyer le rappel (email + SMS) la veille
                           (défaut : NON, pour ne pas doubler les rappels de l'ancien système)

   Colonnes attendues (en-tête, ordre libre, séparateur , ou ;) :
       id, date (YYYY-MM-DD ou DD.MM.YYYY), time (HH:MM), duration (min), service,
       staff, client_name, client_email, client_phone, price, status, notes
   « status » : confirmed / approved / pending / canceled / cancelled / rejected / no-show
   Voir docs/migration/amelia-export.sql pour sortir ce CSV d'Amelia via phpMyAdmin.
*/

require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

// Parseur CSV minimal (guillemets, séparateur auto , ou ;).
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  const header = rows.shift().map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

function normDate(s) {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
function normTime(s) {
  const m = (s || '').match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}
function normStatus(s) {
  s = (s || '').toLowerCase();
  if (/cancel|reject|annul/.test(s)) return 'cancelled';
  if (/no.?show/.test(s)) return 'cancelled';
  if (/pend|attente/.test(s)) return 'pending';
  return 'confirmed';
}
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

async function run() {
  const slug = arg('salon');
  const file = arg('file');
  const commit = !!arg('commit');
  const from = arg('from', new Date().toISOString().slice(0, 10));
  const reminders = !!arg('reminders');
  if (!slug || !file) {
    console.error('Usage : node scripts/import-bookings-csv.js --salon <slug> --file <rdv.csv> [--commit] [--from YYYY-MM-DD] [--reminders]');
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(file, 'utf8'));
  await db.connectDB();
  const salon = await db.findSalonBySlug(slug);
  if (!salon) throw new Error(`Salon introuvable : ${slug}`);
  const salonId = salon._id;

  const [owners, employees, existing] = await Promise.all([
    db.findOwners({ salon: String(salonId) }),
    db.findEmployees({ salon: String(salonId) }),
    db.findBookings({ salon: salonId }),
  ]);
  const staff = [...owners, ...employees];
  const byExternal = new Map(existing.filter(b => b.externalId).map(b => [b.externalId, b]));
  const services = salon.services || [];

  const report = { created: 0, updated: 0, unchanged: 0, skipped: 0, conflicts: [], unknownStaff: new Set(), unknownService: new Set() };

  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    const date = normDate(r.date || '');
    const time = normTime(r.time || r.date || '');
    const name = r.client_name || `${r.client_firstname || ''} ${r.client_lastname || ''}`.trim();
    if (!date || !time || !name) { report.skipped++; console.warn(`  ⚠️ ligne ${line} ignorée (date/heure/nom manquant)`); continue; }
    if (date < from) { report.skipped++; continue; }

    // Prestataire : correspondance par prénom/nom (insensible aux accents).
    const emp = staff.find(s => norm(s.name) === norm(r.staff)) ||
                staff.find(s => r.staff && norm(r.staff).includes(norm(s.name)));
    if (r.staff && !emp) report.unknownStaff.add(r.staff);

    const svc = services.find(s => norm(s.name) === norm(r.service));
    if (r.service && !svc) report.unknownService.add(r.service);

    const externalId = `csv:${r.id || crypto.createHash('sha1').update(`${date}|${time}|${name}|${r.service}`).digest('hex')}`;
    const data = {
      clientName: name,
      clientEmail: r.client_email || '',
      clientPhone: r.client_phone || '',
      serviceName: svc?.name || r.service || 'Rendez-vous',
      serviceIcon: svc?.icon || '✂️',
      price: Number(r.price) || svc?.price || 0,
      duration: Number(r.duration) || svc?.duration || 30,
      date, time,
      notes: r.notes || '',
      employeeId: emp?._id || null,
      employeeName: emp?.name || r.staff || null,
      status: normStatus(r.status),
    };

    const prev = byExternal.get(externalId);
    if (prev) {
      const changed = ['date', 'time', 'duration', 'status', 'employeeId', 'serviceName'].some(k => String(prev[k] ?? '') !== String(data[k] ?? ''));
      if (!changed) { report.unchanged++; continue; }
      if (commit) await db.updateBooking(prev._id, data);
      report.updated++;
      continue;
    }

    // Conflit avec un RDV déjà présent dans Kreno (ex. pris en ligne sur Kreno) → signalé, pas bloqué.
    if (data.status !== 'cancelled') {
      const start = +time.slice(0, 2) * 60 + +time.slice(3);
      const clash = existing.find(b => b.date === date && ['confirmed', 'pending'].includes(b.status) &&
        (!data.employeeId || !b.employeeId || String(b.employeeId) === String(data.employeeId)) && (() => {
          const s = +b.time.slice(0, 2) * 60 + +b.time.slice(3);
          return start < s + (b.duration || 30) && s < start + data.duration;
        })());
      if (clash) report.conflicts.push(`${date} ${time} ${name} ⟷ déjà dans Kreno : ${clash.time} ${clash.clientName}`);
    }

    if (commit) {
      const client = await db.findOrCreateClient(salonId, { name, email: data.clientEmail, phone: data.clientPhone, price: data.price });
      const booking = await db.createBooking({
        salon: salonId, client: client._id, ...data,
        source: 'import', externalId,
        cancelToken: crypto.randomBytes(16).toString('hex'),
        // Pas de rappel (email + SMS) Kreno par défaut : l'ancien système envoie déjà les siens.
        reminderSent: !reminders,
        reviewEmailSent: true, // pas de demande d'avis automatique sur les RDV importés
      });
      existing.push(booking);
    }
    report.created++;
  }

  console.log(`\n${commit ? '✅ IMPORT EFFECTUÉ' : '🔎 SIMULATION (rien écrit — ajouter --commit)'} — salon ${salon.name}`);
  console.log(`   Nouveaux : ${report.created} | Mis à jour : ${report.updated} | Inchangés : ${report.unchanged} | Ignorés : ${report.skipped}`);
  if (report.unknownStaff.size) console.log(`   ⚠️ Prestataires non reconnus (RDV sans attribution) : ${[...report.unknownStaff].join(', ')}`);
  if (report.unknownService.size) console.log(`   ℹ️ Prestations absentes du catalogue Kreno (nom gardé tel quel) : ${[...report.unknownService].join(', ')}`);
  if (report.conflicts.length) {
    console.log(`   🚨 ${report.conflicts.length} chevauchement(s) à vérifier :`);
    report.conflicts.forEach(c => console.log(`      - ${c}`));
  }
  process.exit(0);
}

run().catch(err => { console.error('❌ Import échoué :', err.message); process.exit(1); });
