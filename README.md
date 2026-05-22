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
| Tests | Jest + supertest + mongodb-memory-server |

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
tests/               # Suite Jest (auth, bookings, security, validation)
docs/launch/         # Prép App Store : copy, privacy, screenshots, checklist test
```

## Démarrage local

### Backend
```bash
npm install
npm start          # lance le serveur (port 10000 par défaut)
npm test           # suite Jest
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
flutter analyze      # lint
```

## Patterns clés

- **Auth** : JWT côté client (owners/employés), vérifié manuellement via header
  `Authorization: Bearer`. Super-admin = `ADMIN_PASSWORD` séparé. Magic links pour onboarding.
- **Multi-tenant** : chaque salon a un `slug`. Routes publiques `/api/salon/:slug/...`,
  routes pro `/api/pro/salon/:salonId/...`.
- **Avis clients** : soumis → en attente de modération → publiés par le propriétaire
  (portail pro OU app mobile). Seuls les avis **avec commentaire** s'affichent en carte ;
  la note moyenne compte tous les avis approuvés.
- **Cache mobile** : bookings + bootstrap mis en cache (SharedPreferences) pour un
  affichage instantané au cold-start, refresh réseau en arrière-plan.

## Déploiement

> ⚠️ **Pousser sur Git ne déploie rien automatiquement.** Deux déploiements distincts :

1. **Backend → Render** (`render.yaml`). Branche `main`. Vérifier que l'auto-deploy
   est activé ; sinon **Manual Deploy** dans le dashboard. Health : `GET /api/health`.
2. **App mobile → Codemagic** (`codemagic.yaml`). Build depuis `main`, publie sur
   TestFlight. **Toujours sync `feature/kreno-rebranding` → `main`** pour les fixes mobile/CI.

Compte démo (Apple Review / screenshots) : `node scripts/seed-demo.js`
→ `demo@kreno.ch` / `demo1234`.

## Avant de publier

Voir **`docs/launch/`** : `test-checklist.md` (QA pré-lancement), `app-store-copy.md`,
`privacy-disclosures.md`, `screenshot-guide.md`.
