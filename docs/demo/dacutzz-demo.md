# Démo prospect — Da Cutzz (Neuchâtel)

> Divio (fondateur, barber) + Ottilie (coiffeuse). Site WordPress dacutzz.ch.
> Réservation actuelle : **Amelia** (plugin WordPress) pour Divio. **Ottilie garde son propre système** (`le-style-ottilie.co-labs.ch`) → la démo et la bascule concernent **Divio uniquement** ; son bouton à elle ne change pas.

## Liens démo
| Quoi | Lien |
|---|---|
| Site Kreno complet | https://kreno.ch/s/dacutzz-demo |
| Réservation seule (ce qui s'ouvre en popup chez lui) | https://kreno.ch/s/dacutzz-demo?embed=1 |
| Kreno sur son vrai site | `docs/demo/dacutzz-bookmarklet.html` → favori à glisser |
| Portail pro / app | `demo-dacutzz-demo@kreno.ch` (mot de passe affiché par le seed, **non commité**) |

Recréer la démo : `node scripts/seed-dacutzz.js` (nouveau mot de passe). Supprimer : `node scripts/seed-dacutzz.js --delete`.
⚠️ Un ancien salon de test `dacutzz` (mars 2026) existe : le seed refuse de le toucher.

## Contexte
Le site dacutzz.ch est géré par nous (accès hébergeur + phpMyAdmin). Objectif : remplacer Amelia (soucis +
peu personnalisable) par Kreno, notre outil — toute fonctionnalité manquante peut être ajoutée.
**Offre : 40.-/mois tout compris, migration offerte** (même budget que sa formule Amelia).
Facturation : salon créé en admin + Stripe Payment Link mensuel 40 CHF (voir CLAUDE.md « Plans & abonnement »).

## Préparation (la veille)
1. Coller `docs/demo/wordpress-demo-snippet.html` dans le pied de page WordPress (WPCode → Footer). Inactif pour les visiteurs.
2. Export Amelia (phpMyAdmin → `docs/migration/amelia-export.sql` → CSV), puis :
   ```
   DACUTZZ_DEMO_PASSWORD=<mdp actuel> node scripts/seed-dacutzz.js --vide
   node scripts/import-bookings-csv.js --salon dacutzz-demo --file rdv.csv            # simulation
   node scripts/import-bookings-csv.js --salon dacutzz-demo --file rdv.csv --commit   # import
   ```
   → l'app affiche **son vrai agenda**. Aucun email/SMS/rappel envoyé aux clients.
3. App mobile connectée au compte démo ; ouvrir une fois `https://dacutzz.ch/?kreno=demo` pour vérifier.

## Déroulé (tout sur le téléphone, 10 min)
1. Ouvrir `dacutzz.ch/?kreno=demo` → **il appuie sur son bouton** « Réserver avec le Coiffeur Barbier » → Kreno s'ouvre sur son site.
2. Il réserve un créneau → la notif / le RDV arrive dans l'app.
3. App : **ses vrais RDV de la semaine** (importés d'Amelia), fiche client, bloquer un créneau.
4. « Ce qui ne te plaît pas dans Amelia, on l'ajoute. » Noter ses demandes.
5. 40.-/mois, migration offerte, on bascule quand il veut, retour arrière en 1 min.
Après la démo : `dacutzz.ch/?kreno=off`, supprimer le RDV test.

## Plan de transition
| Phase | Les clients réservent sur | Kreno |
|---|---|---|
| 0. Démo | Amelia | Salon démo avec ses vraies prestations |
| 1. Test (1–2 sem.) | **Amelia** (rien ne change pour les clients) | Import quotidien Amelia → Kreno (`import-bookings-csv.js`, sans notif). Divio teste l'app avec ses vrais RDV. |
| 2. Bascule | **Kreno** (1 ligne ajoutée sur WordPress) | Dernier import Amelia, puis Amelia fermé aux nouvelles réservations |
| 3. Filet (2–4 sem.) | Kreno | Amelia reste installé, désactivé, prêt à être rallumé |

**Une seule porte d'entrée à la fois** → aucun double-booking possible entre les deux systèmes.

### « Et si Kreno a un problème après la bascule ? »
- Revenir en arrière = **retirer la ligne de script** sur WordPress (1 min) → les boutons reprennent Amelia.
- Les RDV pris sur Kreno **ne sont pas perdus** : ils restent dans Kreno, l'app et les emails de confirmation clients. Divio les honore normalement.
- Seule action : bloquer ces créneaux dans Amelia pour qu'ils ne soient pas revendus → on lui envoie la liste (export depuis le portail Kreno / iCal). En semaine 1 ça représente quelques dizaines de RDV max.
- Si la popup ne se charge pas en 10 s, le visiteur est envoyé sur la page Kreno complète ; si Kreno est entièrement en panne, le numéro du salon reste affiché sur son site.
- Bascule recommandée un **lundi** (salon fermé) → une journée pour vérifier avant le premier client.

## Intégration WordPress (le jour J)
1. Ajouter **une ligne** dans le pied de page (Elementor → bloc HTML, ou plugin « Insert Headers and Footers ») :
   ```html
   <script src="https://kreno.ch/embed.js" defer></script>
   ```
2. Dans Elementor, mettre le lien des boutons « Réserver » de Divio sur `https://kreno.ch/s/dacutzz`
   (option : `?service=Coupe%20%2B%20barbe` pour présélectionner une prestation).
3. Résultat : le clic ouvre la réservation Kreno **en popup sur son site**. Sans le script, le lien ouvre simplement la page Kreno → jamais cassé.
Le bouton d'Ottilie (co-labs) ne change pas.

## Import des RDV Amelia
1. phpMyAdmin chez son hébergeur → requête `docs/migration/amelia-export.sql` → export CSV (lecture seule, ne modifie rien).
2. `node scripts/import-bookings-csv.js --salon dacutzz --file rdv.csv` → simulation, affiche nouveaux / conflits / prestataires non reconnus.
3. Même commande + `--commit`. Rejouable sans doublon (mise à jour des RDV déplacés/annulés).
Aucun email, aucun SMS, aucun rappel envoyé pour les RDV importés (sauf `--reminders`).

## Questions à lui poser
- Amelia : version Lite ou Pro ? Accès phpMyAdmin / hébergeur ?
- Combien de RDV / semaine ? Paiement en ligne ? Rappels SMS aujourd'hui ?
