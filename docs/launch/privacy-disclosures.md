# Confidentialité App Store — Kreno

> À remplir dans **App Store Connect → ton app → Confidentialité de l'app**.
> Apple demande, pour chaque type de donnée : est-elle **collectée** ? est-elle
> **liée à l'identité** de l'utilisateur ? sert-elle au **suivi** (tracking) ?
> Réponses ci-dessous basées sur ce que l'app/le backend stockent réellement.

## Résumé décisionnel
- **Suivi (App Tracking Transparency)** : ❌ Aucun. Kreno ne suit pas les
  utilisateurs entre apps/sites tiers et ne partage rien avec des courtiers en
  données. → Tu ne dois PAS afficher la pop-up ATT.
- **Publicité tierce** : ❌ Aucune.
- **Toutes les données collectées servent au fonctionnement du service**
  (gestion du salon), pas au marketing tiers.

---

## Types de données à déclarer

### 1. Coordonnées de contact (Contact Info)
| Donnée | Collectée | Liée à l'utilisateur | Suivi | Finalité |
|---|---|---|---|---|
| Nom | ✅ | ✅ | ❌ | Fonctionnement de l'app, compte |
| Adresse e-mail | ✅ | ✅ | ❌ | Fonctionnement, authentification |
| Numéro de téléphone | ✅ | ✅ | ❌ | Fonctionnement de l'app |

> Concerne le **propriétaire/employé** (compte) ET les **clients du salon**
> saisis par le salon (nom, email, téléphone des clients pour les rendez-vous).

### 2. Identifiants (Identifiers)
| Donnée | Collectée | Liée | Suivi | Finalité |
|---|---|---|---|---|
| ID utilisateur (compte) | ✅ | ✅ | ❌ | Fonctionnement, authentification |
| Jeton d'appareil push (FCM) | ✅ | ✅ | ❌ | Notifications de rendez-vous |

### 3. Contenu utilisateur (User Content)
| Donnée | Collectée | Liée | Suivi | Finalité |
|---|---|---|---|---|
| Notes de rendez-vous | ✅ | ✅ | ❌ | Fonctionnement de l'app |
| Photos (galerie salon, si utilisée) | ✅ | ✅ | ❌ | Fonctionnement de l'app |

### 4. Achats (Purchases)
| Donnée | Collectée | Liée | Suivi | Finalité |
|---|---|---|---|---|
| Historique d'abonnement / paiements | ✅ | ✅ | ❌ | Fonctionnement de l'app |

> Les paiements sont traités par **Stripe** (carte non stockée par Kreno).
> Déclarer comme "Informations financières" uniquement si tu considères
> l'historique d'abonnement comme tel — sinon "Achats" suffit.

### 5. Diagnostics (Diagnostics) — à confirmer
| Donnée | Collectée | Liée | Suivi | Finalité |
|---|---|---|---|---|
| Données de plantage / logs | ⚠️ Selon outil | ❌ | ❌ | Diagnostic, amélioration |

> Coche **uniquement si** tu ajoutes un SDK de crash reporting (Sentry,
> Crashlytics…). Aujourd'hui l'app n'en a pas → tu peux répondre ❌.
> ⚠️ Note : Firebase Cloud Messaging est utilisé pour les push. Vérifie si le
> SDK Firebase remonte des identifiants/usage par défaut — si oui, déclare
> "Identifiants de l'appareil" + "Données d'usage" côté Firebase Analytics
> (désactivable). Kreno n'utilise **que** Messaging, pas Analytics.

### Données NON collectées (à laisser décochées)
- Localisation
- Contacts du téléphone
- Historique de navigation / recherche
- Données de santé, fitness
- Données sensibles
- Données de tiers à des fins publicitaires

---

## Texte "Confidentialité" (si demandé en complément)
```
Kreno collecte uniquement les données nécessaires à la gestion de votre salon :
informations de compte (nom, email, téléphone), coordonnées de vos clients que
vous saisissez, vos rendez-vous et prestations. Les paiements sont traités de
façon sécurisée par Stripe ; Kreno ne stocke aucune donnée de carte. Aucune
donnée n'est vendue ni utilisée à des fins de publicité ou de suivi tiers.
Détails : https://kreno.ch/privacy
```

## Checklist avant soumission
- [ ] Page `https://kreno.ch/privacy` accessible et à jour (mention Stripe, FCM, conservation des données, droit de suppression)
- [ ] Confirmer si Firebase Analytics est désactivé (sinon ajuster les déclarations)
- [ ] Décider du statut "Diagnostics" selon présence d'un SDK crash
