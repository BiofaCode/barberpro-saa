# Kreno

**Plateforme SaaS multi-tenant de gestion pour salons de coiffure, barbiers et instituts de beauté.**

Trois rôles : super-admin (plateforme), propriétaires de salon (portail pro), clients finaux (réservation publique). Plus une **app mobile Flutter** pour le staff.

---

## Stack

| Couche | Techno |
|---|---|
| Backend | Node.js HTTP brut (`server.js`, ~3500 lignes, **pas d'Express**) |
| Base de données | MongoDB Atlas via `db.js` (driver mongodb natif) |
| Email | Resend (`email.js`) |
| SMS | Twilio, crédits prépayés par salon (`sms.js`) |
| Push | Firebase Cloud Messaging (`push.js`, firebase-admin) |
| Paiements | Stripe + Stripe Connect |
| Frontends web | Vanilla HTML/CSS/JS (pas de framework, pas de bundler) |
| App mobile | Flutter (`barber_app/`), locale `fr_FR` |
| Tests | Jest + supertest (259 tests, forceExit requis) |

## Structure

```
server.js            # Serveur HTTP + routing + logique métier
db.js                # Adaptateur MongoDB (toutes les requêtes)
email.js / sms.js    # Templates email / envoi SMS
push.js              # Notifications push FCM
lib/                 # security.js, validation.js
admin/               # Dashboard super-admin
pro/                 # Portail propriétaire de salon
website/             # Landing publique + réservation client
saas/                # Pages marketing / signup + privacy/faq/cgu
barber_app/          # App mobile Flutter (staff)
scripts/seed-demo.js # Seed salon démo (App Store / screenshots)
tests/               # Suite Jest (auth, bookings, security, validation, reviews, push-tokens, booking-detail, booking-reschedule, static-routes)
docs/launch/         # Prép App Store : copy, privacy, screenshots, checklist test
```

## Démarrage local

### Backend
```bash
npm install
npm start          # lance le serveur (port 10000 par défaut)
npm test           # suite Jest (--forceExit obligatoire pour éviter le hang des setInterval)
```
Variables requises dans `.env` : `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`,
`STRIPE_WEBHOOK_SECRET`. Optionnel : `CLOUDINARY_*`, `TWILIO_*`,
`FIREBASE_SERVICE_ACCOUNT_JSON`, `BASE_URL`.

### App mobile
```bash
cd barber_app
flutter pub get
flutter run
flutter analyze      # lint (0 issue attendu)
```

## Patterns clés

- **Auth** : JWT côté client (owners/employés), vérifié manuellement via header
  `Authorization: Bearer`. Super-admin = `ADMIN_PASSWORD` séparé. Magic links pour onboarding.
- **Multi-tenant** : chaque salon a un `slug`. Routes publiques `/api/salon/:slug/...`,
  routes pro `/api/pro/salon/:salonId/...`. Alias `/api/barber/` → `/api/pro/` pour l'app mobile.
- **Avis clients** : soumis → en attente de modération → publiés par le propriétaire
  (portail pro ou app mobile). Seuls les avis **avec commentaire écrit** s'affichent en carte ;
  la note moyenne compte tous les avis approuvés. Notification FCM push à chaque nouvel avis.
- **Chevauchement de RDV** : contrôlé **par employé**. Deux RDV au même créneau pour deux
  employés différents est normal (coiffeurs en parallèle). Vérifié à la création ET à la
  reprogrammation (`PUT /api/pro/salon/:salonId/bookings/:bookingId`).
- **Cache mobile** : bookings + bootstrap + clients mis en cache (SharedPreferences) pour un
  affichage instantané au cold-start et en mode hors-ligne, refresh réseau en arrière-plan.
- **Tests** : `server.js` exporte `{ server, start, createToken }` et gate `start()` derrière
  `require.main === module`. Les tests mockent `db`, `email`, `push`, `sms` et attaquent le
  serveur via supertest sans connexion MongoDB réelle.

## Déploiement

> ⚠️ **Pousser sur Git ne déploie rien automatiquement.** Deux déploiements distincts :

1. **Backend → Render** (`render.yaml`). Branche `main`. **Manual Deploy** dans le dashboard
   (ou activer l'auto-deploy). Health check : `GET /api/health`.
2. **App mobile → Codemagic** (`codemagic.yaml`). Build depuis `main`, publie sur TestFlight.

**Workflow de branche :**
- `feature/kreno-rebranding` → branche de travail
- `main` → branche de prod (cherry-pick des commits)
- Ne jamais merger `main` dans `feature/` ; cherry-picker de `feature/` vers `main`
- Le worktree `main` est dans `.worktrees/production-launch/`

Compte démo (Apple Review / screenshots) : `node scripts/seed-demo.js`
→ `demo@kreno.ch` / `demo1234`.

---

## État du projet — mai 2026

### ✅ Fait (sessions de mai 2026)

**Backend**
- Fix chevauchement à la reprogrammation de RDV (`PUT /bookings/:id` sans guard → corrigé)
- Route `/support` et `/privacy` pour l'App Store (Apple exige une URL valide)
- `server.js` exportable pour les tests (sans breakage de la prod)

**App mobile (Flutter)**
- Push notifs FCM iOS résolu + deep-link (tap notif → ouvre le bon RDV)
- Cache local bookings + bootstrap (cold-start instantané, plus d'écran vide au démarrage)
- Cache local clients + bannière « Hors ligne » quand le réseau est absent
- Modération des avis dans l'app mobile (approbation/rejet) + push FCM à chaque nouvel avis
- Vue RDV : **vue liste par défaut** au lieu de la vue jour
- Vue liste : bandeau de dates étendu à ~3 mois + bouton calendrier pour sauter à n'importe quelle date
- Vue jour : RDV qui se chevauchent affichés **en colonnes côte à côte** (plus de superposition)
- Couleur de texte ajoutée au branding mobile
- Palette d'emojis pour les icônes de prestations (identique au portail web)
- Sélection des employés par prestation (« réalisée par »)
- Gestion des rôles équipe : Employé vs Manager (owner), avec email+mdp pour les managers
- Sélecteur d'heure dans Créneaux bloqués : remplacement du cadran rond par une liste groupée Matin/Après-midi/Soir (pas de 15 min)
- Création de RDV : date pré-remplie depuis le jour affiché dans l'onglet RDV, heure = prochain créneau 30 min propre, erreurs de validation affichées **dans** le sheet (plus derrière)
- Devise `€` → `CHF` dans le dropdown de sélection de prestation
- Aperçu live branding : carte « Aperçu live » en haut du sheet de personnalisation (titre, couleurs, CTA)
- Confirmation avant sauvegarde branding (dialog de validation)

**Site web client**
- Avis (témoignages) sur mobile : carrousel centré, une carte pleine largeur par vue
- Bouton « Ajouter au calendrier » (iCal/Google) après réservation, **y compris après paiement Stripe** (contexte sauvegardé dans `sessionStorage` avant redirect)

**Tests**
- 259 tests Jest (de 216 stubs → vrais tests avec supertest + mocks)
- Nouveaux fichiers : `reviews.test.js`, `push-tokens.test.js`, `booking-detail.test.js`, `static-routes.test.js`, `booking-reschedule.test.js`
- Toujours lancer avec `--forceExit` (les `setInterval` du serveur bloquent Jest sinon)

### 🔜 Prochaines étapes (App Store)

1. **Dérouler `docs/launch/test-checklist.md`** section par section sur device réel → corriger les bugs remontés
2. **Fiche App Store Connect** :
   - Icône (1024×1024, pas de coins arrondis, pas de transparence)
   - Screenshots iPhone 6.9" et 6.5" (obligatoires)
   - Screenshots iPad (obligatoires si l'app supporte iPad)
   - Métadonnées : titre, sous-titre, description, mots-clés, URL support (`https://kreno.ch/support`), URL privacy (`https://kreno.ch/privacy`)
   - Compte démo pour la review Apple : `demo@kreno.ch` / `demo1234`
3. **Soumission** : App Store Connect → TestFlight → Submit for Review
4. **Après acceptation** :
   - Merge `feature/kreno-rebranding` → `main` (cherry-picks déjà faits, cleanup)
   - Activer l'auto-deploy Render
   - Mettre en place un monitoring basique (Render logs + alertes)

### ⚠️ Points à ne pas oublier

- Avis sans commentaire (étoiles seules) : ne s'affichent **pas** sur le site public — comportement voulu
- Deux RDV même heure employés différents = **normal** (pas un bug)
- Cherry-pick systématique : tout fix va d'abord sur `feature/kreno-rebranding`, puis cherry-pick sur `main`
- Le worktree `main` est dans `.worktrees/production-launch/` (ne pas `cd` ailleurs)

---

## Avant de publier

Voir **`docs/launch/`** : `test-checklist.md` (QA pré-lancement, 14 sections ~80 points),
`app-store-copy.md`, `privacy-disclosures.md`, `screenshot-guide.md`.
