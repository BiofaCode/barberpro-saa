# État du projet Kreno — passation (11 novembre 2026)

Document de reprise pour une nouvelle session. À lire avec `CLAUDE.md`.
Le propriétaire du projet (Fabio) écrit en français, n'est pas développeur :
expliquer simplement, étape par étape, sans jargon. Il veut qu'on avance
à sa place sur tout ce qui ne demande pas ses identifiants.

## 1. Où on en est

PR #53 à #56 fusionnées dans `main`. Le travail du 11 novembre (ci-dessous) est sur
`claude/beautiful-edison-u9lm2z`, en PR à fusionner. Tests : **222 Jest + 9 Flutter**, verts en CI (GitHub Actions,
`.github/workflows/tests.yml`, sur chaque PR et push sur `main`).

### Fait le 11 novembre 2026 (branche `claude/beautiful-edison-u9lm2z`, PR à fusionner)
- **Nom du salon comme expéditeur des SMS** (`sms.js` `smsSenderName` / `senderFor`) :
  activé par `TWILIO_ALPHA_SENDER=true` dans Render (désactivé par défaut = rien ne change).
  Seulement pour les numéros suisses (+41) et du Liechtenstein (+423) ; les autres pays
  gardent `TWILIO_PHONE_NUMBER`. Si Twilio refuse le nom, le SMS repart depuis le numéro.
  Règles Twilio : 11 caractères max, lettres sans accents / chiffres / espaces.
  Le client **ne peut pas répondre** à ces SMS. L'alerte au propriétaire part en « Kreno ».
  Portail pro → Crédits SMS : champ « Nom affiché comme expéditeur » (visible seulement si activé).
- **Réglages SMS** (`PUT /sms-settings`) : seuls les champs envoyés sont modifiés
  (l'app mobile n'efface plus le nom d'expéditeur ni le reste).
- **Badge « Télécharger dans l'App Store »** sur la page d'accueil (carte app + bas de page),
  badge officiel Apple en français (`saas/images/app-store-badge-fr.svg`). **Caché** tant que
  `APP_STORE_URL` est vide dans `saas/js/app-links.js` : le jour J, coller le lien `apps.apple.com/...`.
- **SEO** : `kreno.ch/sitemap.xml` et `robots.txt` servaient d'anciens fichiers pointant vers
  `salonpro.osmodigital.ch` (le générateur dynamique n'était jamais appelé). Ils sont maintenant
  générés avec `https://kreno.ch` (ou `BASE_URL`) et listent les pages des salons actifs.
  `kreno.ch/faq` (annoncé dans le sitemap) renvoyait 404 : corrigé.
- **Textes** : confidentialité disait « disponible sur l'App Store et Google Play » → « pour iPhone » ;
  FAQ « application mobile » mentionne l'app iPhone.
  **Anti-hameçonnage** : noms de banques, TWINT, opérateurs, Poste, CFF, grandes marques, police
  jamais utilisés comme expéditeur (`isProtectedSenderName`, refusés à l'enregistrement, ignorés
  si c'est le nom du salon → « Kreno »). Changements de nom journalisés (`sms_sender_changed`).
  Un **employé** ne peut pas changer le nom d'expéditeur, le numéro ni l'alerte du propriétaire.
- **Flutter figé à 3.47.9** (CI GitHub + `codemagic.yaml`) : Flutter 3.50 (sorti le 10-11 nov.)
  déclare obsolète `package:flutter/material.dart` et faisait échouer la CI. Montée de version
  à faire volontairement plus tard (migration vers `material_ui`).
- Tests : **222 Jest** (nouveaux : `sms-sender`, `sms-settings`, `static-pages`).

### Fait pendant la session précédente
- **Réservation publique** : validation serveur (nom, prestation existante, date
  non passée, jours de fermeture), contrôle de conflit avec la durée **du serveur**
  (avant : double réservation possible), garde-fous sur le paiement en ligne.
- **Routeur** : la route la plus spécifique gagne (`/bookings/ical` ne marchait pas).
- **SMS** : messages GSM-7 en 1 segment (les emojis faisaient payer 2 SMS),
  chaque SMS réserve un crédit de façon atomique avant l'envoi (remboursé si échec),
  crédits achetés conservés au renouvellement, par défaut **seul le rappel J-1**
  part par SMS (confirmation par email). Packs : **100/12, 300/33, 600/60 CHF**.
  Admin : bouton « + Offrir » des SMS.
- **Heure suisse** : `process.env.TZ = 'Europe/Zurich'` au démarrage du serveur
  (Render tourne en UTC). Dates locales partout (`localDateStr` serveur,
  `localDateStr` site, `localYMD` portail pro). Rattrapage du rappel le jour même
  si le serveur dormait la veille. Fermetures (vacances) décalées d'un jour sur
  le site : corrigé.
- **Popup de réservation sur le site d'un salon** : `website/embed.js`
  (`<script src="https://kreno.ch/embed.js">` + liens vers `kreno.ch/s/<slug>`,
  option `?service=`). Seules les pages `/s/<slug>?embed=1` sont intégrables.
- **Import depuis WP Amelia / CSV** : `scripts/import-bookings.js` (simulation
  par défaut, `--commit` pour écrire) + guide `docs/MIGRATION_AMELIA.md`.
- **App mobile** : planning du jour dans l'ordre, « prochain RDV » correct,
  bande de dates sur aujourd'hui, prix du forfait retiré, **boutons de paiement
  externe retirés** (risque de refus Apple), bouton **« Supprimer mon compte »**
  (demande enregistrée, email à `ADMIN_EMAIL` et à l'utilisateur, traitement
  sous 30 jours, visible dans l'admin), **iPhone uniquement** pour la v1.
- **Android** : `build.gradle.kts` lit `android/key.properties` (avant : release
  signée avec la clé debug).
- **Page d'accueil** : faux témoignages, « +150 salons », « 4,9/5 », « −70 % »,
  « Planity prend 20 % » et « sans carte bancaire » supprimés (loi LCD) ; remplacés
  par des faits vérifiables. Champ « domaine personnalisé » (non fonctionnel)
  retiré du portail pro.
- **Forfaits alignés partout** : Starter 39 CHF = vous + 1 employé ;
  Pro 49 CHF = vous + 5 (200 SMS/mois) ; Premium 89 CHF = illimité (400 SMS/mois).
- **Admin** : bouton « 🍎 Compte démo App Store » (`POST /api/admin/demo-seed`)
  qui recrée `demo@kreno.ch` / `demo1234` sans terminal.
- **App Store** : 6 captures 1320×2868 de la vraie app dans
  `docs/appstore/screenshots/` + fiche complète `docs/appstore/FICHE_APP_STORE.md`
  (textes dans les limites, notes pour Apple, confidentialité).
- `package-lock.json` resynchronisé (manquait `firebase-admin`), fichiers de debug
  supprimés.

## 2. Infrastructure

| Élément | État |
|---|---|
| Hébergement | **Render gratuit** (service `barberpro-saa`, `barberpro-saa.onrender.com`). S'endort après 15 min sans visite. Fabio ne veut pas payer Starter (~7 $/mois) pour l'instant. |
| Domaine | `kreno.ch` chez **Hostinger** : A → 216.24.57.1 (Render), `www` → CNAME onrender. Emails Hostinger. Pas de sous-domaines `admin.`/`pro.` : l'admin est sur `kreno.ch/admin`, le portail pro sur `kreno.ch/pro`. |
| Base | MongoDB (Atlas), `MONGODB_URI` dans Render. |
| SMS | Twilio, prix réel Suisse **0,0769 $ / segment** (≈ 0,073 CHF). Seuil de perte du pack 600 : 0,102 $. |
| Emails | Resend. |
| Images | Cloudinary si `CLOUDINARY_*` configuré (sinon perdues au redémarrage : **à vérifier dans Render**). |
| Builds mobiles | Codemagic (`codemagic.yaml`), compte perso gratuit. Bundle iOS `ch.kreno.app`, Android `com.kreno.app`. |
| Déploiement | Render n'a pas déployé automatiquement une fois : vérifier « Auto-Deploy = Yes, branche main », sinon « Manual Deploy → Deploy latest commit ». |

## 3. Ce que Fabio doit faire (ses identifiants)

1. Render → Environment : ajouter `ADMIN_EMAIL` (son adresse) ; vérifier `CLOUDINARY_*` et `TWILIO_*`.
2. `kreno.ch/admin` → « 🍎 Compte démo App Store ».
3. UptimeRobot (ou cron-job.org) : surveiller `https://kreno.ch/api/health` toutes les 5 min (garde Render gratuit éveillé).
4. Codemagic → « iOS TestFlight » sur `main` → tester sur iPhone via TestFlight.
5. App Store Connect → soumettre avec la fiche et les captures.
6. Quand l'app est validée : envoyer le lien App Store → le coller dans `saas/js/app-links.js`
   (le badge est déjà en place, caché) + redéployer.
6 bis. (Optionnel) Nom du salon comme expéditeur SMS : Render → `TWILIO_ALPHA_SENDER=true`.
   Avant, envoyer un SMS de test : si le compte Twilio refuse les expéditeurs alphanumériques,
   les SMS repartent automatiquement depuis le numéro (rien ne se perd).
7. Client pilote (salon sur WP Amelia) : démo popup + app, puis migration
   (`docs/MIGRATION_AMELIA.md`). Migration gratuite + accompagnement.

## 4. Prochaines tâches possibles (côté code)

- ~~Badge App Store~~ (en place, caché, attend le lien) ; ~~expéditeur SMS = nom du salon~~ (fait,
  à activer). Si tous les clients sont suisses, le numéro Twilio pourrait ensuite être résilié
  (garder un numéro tant que des clients ont un portable étranger, ex. +33).
- E-mails de contact du site encore en `info@osmodigital.ch` (FAQ, CGU, confidentialité, 404) :
  à garder ou passer en `@kreno.ch` selon le choix de Fabio.
- FAQ : « assistance prioritaire … temps de réponse garanti sous 4h » (Premium) — engagement à
  confirmer ou retirer (règle : aucune affirmation non tenue).
- Publication Android / Google Play (fichier `google-services.json`, compte Play 25 $,
  captures Android comme pour iOS).
- Plus de tests (≈ 20 % de `server.js` couvert ; beaucoup d'anciens tests sont permissifs).
- Render Starter dès qu'il y a des clients payants.

## 5. À savoir pour travailler

- **Tests backend** : `mongodb-memory-server` ne peut pas télécharger MongoDB dans
  le bac à sable. Lancer MongoDB via Docker (`dockerd &` puis
  `docker run -d --name kreno-mongo -p 27017:27017 mongo:7`) et
  `TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npx jest --forceExit`.
  Les workers Jest sont en `TZ=Europe/Zurich` (`tests/global-setup.js`).
  **Sur le PC Windows de Fabio** (pas de Docker) : `npx jest --forceExit --runInBand`
  (mongodb-memory-server télécharge MongoDB ; en parallèle, ~75 tests échouent par lenteur).
- **Flutter** n'est pas installé par défaut : télécharger le SDK stable
  (storage.googleapis.com est accessible). Build web pour captures :
  `flutter build web --release --no-web-resources-cdn`.
- **kreno.ch est bloqué** par le réseau du bac à sable par défaut. Un environnement
  cloud « barberpro-saa » (autorise kreno.ch + `npm install` au démarrage) a été
  créé : le choisir pour vérifier la production.
- Chromium/Playwright préinstallés ; pour les ressources Google (polices, CanvasKit)
  lancer Chromium avec le proxy `HTTPS_PROXY` et `ignoreHTTPSErrors`.
- Branche de travail : `claude/beautiful-edison-u9lm2z` (repartir de `origin/main`).
  Fabio demande en général de fusionner lui-même ou dit « fusionne ».
- Règles produit décidées : rappel SMS seul par défaut ; pas de lien de paiement
  dans l'app ; aucune affirmation marketing non vérifiable ; demandes de
  suppression de compte traitées à la main sous 30 jours.
