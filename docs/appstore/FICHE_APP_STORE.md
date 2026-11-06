# Fiche App Store — Kreno

À copier dans App Store Connect → *Kreno* → version 1.0. Langue principale : **Français**.

## Captures d'écran

`docs/appstore/screenshots/kreno-iphone-1.png` à `-6.png` — 1320 × 2868 px, format **iPhone 6,9"**
(App Store Connect les réutilise pour les tailles plus petites). Faites de la vraie app avec le compte démo.

**iPad** : l'app est actuellement déclarée compatible iPad (`TARGETED_DEVICE_FAMILY = "1,2"`).
Apple exigera alors aussi des captures iPad 13" (2064 × 2752). Deux options :
- limiter l'app à l'iPhone (recommandé pour la v1) ;
- ou fournir des captures iPad.

## Informations de l'app

| Champ | Valeur | Limite |
|---|---|---|
| Nom | Kreno – Gestion de salon | 24/30 |
| Sous-titre | Agenda et RDV de votre salon | 28/30 |
| Catégorie principale | Économie et entreprise (Business) | |
| Catégorie secondaire | Productivité | |
| Âge | 4+ | |
| URL de confidentialité | https://kreno.ch/privacy | |
| URL d'assistance | https://kreno.ch/support | |
| URL marketing | https://kreno.ch | |
| Copyright | 2026 Kreno | |

**Mots-clés** (93/100 — ne pas répéter les mots du nom/sous-titre) :
```
coiffeur,coiffure,barbier,barbershop,rendez-vous,réservation,planning,clients,beauté,onglerie
```

**Texte promotionnel** (149/170, modifiable sans nouvelle version) :
```
Vos rendez-vous, vos clients et votre chiffre du jour dans votre poche. Notification à chaque nouvelle réservation, rappel SMS automatique la veille.
```

**Description** :
```
Kreno est l'application des salons de coiffure, barbiers et instituts qui utilisent Kreno pour leurs réservations en ligne.

VOTRE JOURNÉE EN UN COUP D'ŒIL
• Rendez-vous du jour, chiffre d'affaires et prochain client dès l'ouverture
• Planning du jour dans l'ordre, avec le statut de chaque rendez-vous

TOUS VOS RENDEZ-VOUS
• Les réservations faites en ligne par vos clients arrivent directement dans l'agenda
• Vue liste ou vue jour, rendez-vous à venir, terminés et annulés
• Ajoutez un rendez-vous pris par téléphone en quelques secondes
• Déplacez, terminez ou annulez un rendez-vous en un geste ; le client est prévenu

PRÉVENU EN TEMPS RÉEL
• Notification à chaque nouvelle réservation, modification ou annulation
• Un résumé de votre journée chaque matin

VOS CLIENTS
• Fiche client avec coordonnées et historique des visites
• Appel, SMS ou e-mail directement depuis la fiche

VOTRE SALON
• Prestations, prix et durées
• Équipe et horaires
• Couleurs et photo de votre page de réservation
• Rappel SMS automatique la veille de chaque rendez-vous

Kreno s'adresse aux professionnels disposant d'un compte Kreno. Le compte du salon se crée sur kreno.ch.
```

**Notes de version 1.0** :
```
Première version de l'application Kreno pour les professionnels.
```

## Informations pour la vérification (App Review)

- **Identifiant** : `demo@kreno.ch` — **Mot de passe** : `demo1234`
  ⚠️ Lancer `node scripts/seed-demo.js` **sur la base de production** avant de soumettre, et
  vérifier la connexion sur l'iPhone avec ce compte.
- **Notes** :
```
Kreno is a B2B companion app for hair salons, barbers and beauty institutes that use the Kreno booking platform. Accounts are created by businesses on kreno.ch; the app has no sign-up and no purchase of any kind (guideline 3.1.3(c), enterprise services sold to businesses).

Demo account: demo@kreno.ch / demo1234 (pre-filled salon with bookings, clients and staff).

Things to try: Home (today's schedule), RDV tab (bookings; tap one for actions), "+" to add a booking, Clients, Salon (settings).
Push notifications are sent when a customer books online on the salon's page: https://kreno.ch/s/kreno-demo
```

## Confidentialité de l'app (App Privacy)

Suivi (tracking) : **Non**. Aucune donnée n'est utilisée à des fins publicitaires ni partagée avec des courtiers.

| Type de donnée | Collectée | Liée à l'utilisateur | Finalité |
|---|---|---|---|
| Coordonnées → nom, e-mail, téléphone (compte pro et clients du salon) | Oui | Oui | Fonctionnalités de l'app |
| Photos (logo / photo du salon, si ajoutées) | Oui | Oui | Fonctionnalités de l'app |
| Identifiants → identifiant de l'appareil (jeton de notification push) | Oui | Oui | Fonctionnalités de l'app |
| Contenu utilisateur → autres (notes de rendez-vous) | Oui | Oui | Fonctionnalités de l'app |

Pas de données de santé, de localisation, financières, d'historique de navigation ni d'analytics.

## Chiffrement (export compliance)

`ITSAppUsesNonExemptEncryption = false` est déjà dans `Info.plist` : l'app n'utilise que HTTPS.
Répondre « Non » aux questions de chiffrement si elles apparaissent.
