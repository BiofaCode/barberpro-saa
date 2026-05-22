# Checklist de test pré-lancement — Kreno

> Objectif : tout vérifier avant la soumission App Store. Coche au fur et à mesure.
> Légende : 🤖 = test automatisé · 📱 = app mobile · 🌐 = web · ⚙️ = backend/deploy

---

## 0. Tests automatisés (backend) 🤖

- [ ] `npm test` → 216 tests passent (auth, bookings, security, validation)
- [ ] Aucun nouveau warning de fuite (open handles) bloquant
- [ ] (Optionnel) Ajouter des tests pour les zones non couvertes : avis/modération,
      push token register/remove, endpoint `GET bookings/:id`, `/support`

> Couverture actuelle faible sur `server.js` (les tests passent par supertest mais
> l'instrumentation ne capture pas le serveur lancé). Les chemins critiques
> ci-dessous doivent donc être testés **manuellement**.

---

## 1. App mobile — Authentification 📱
- [ ] Login avec `demo@kreno.ch` / `demo1234` → arrive sur le dashboard
- [ ] Mauvais mot de passe → message d'erreur clair
- [ ] Mot de passe oublié → email reçu
- [ ] Session persistante : fermer/rouvrir l'app → toujours connecté
- [ ] Déconnexion → retour login + token push supprimé côté serveur

## 2. App mobile — Dashboard (Accueil) 📱
- [ ] Stats du jour + RDV à venir s'affichent
- [ ] Cold-start (après kill) : affichage **instantané** depuis le cache, puis refresh
- [ ] Pull-to-refresh met à jour
- [ ] Mode hors-ligne : garde les données en cache, pas d'écran vide
- [ ] Menu latéral (☰) : Équipe · Services · Créneaux bloqués · **Avis clients** présents

## 3. App mobile — Rendez-vous 📱
- [ ] Vue Jour : RDV positionnés aux bons horaires, ligne d'heure actuelle
- [ ] Vue Liste : onglets À venir / Terminés / Annulés corrects
- [ ] Navigation entre jours/semaines
- [ ] Ouvrir un RDV → détail complet (client, service, prix, statut)
- [ ] Actions : Confirmer / Commencer / Terminer / Reprogrammer / Annuler
- [ ] Reprogrammer → choix date + créneau, créneaux passés grisés
- [ ] Boutons Appeler / SMS / Email du client fonctionnent
- [ ] Auto-complétion des RDV passés (statut → terminé après 2 min)

## 4. App mobile — Créer un RDV 📱
- [ ] Bouton + → feuille nouveau RDV
- [ ] Recherche client existant (autocomplete) + pré-remplissage tel/email
- [ ] Nouveau client à la volée
- [ ] Validations : nom requis, prestation requise, tel requis, pas de RDV dans le passé
- [ ] Conflit de créneau → message d'erreur
- [ ] Création OK → RDV visible dans l'agenda + email de confirmation au client

## 5. App mobile — Clients / Équipe / Services 📱
- [ ] Liste clients s'affiche, recherche fonctionne
- [ ] Ajouter / supprimer un employé
- [ ] Ajouter / modifier / supprimer un service (prix, durée, icône)
- [ ] Créneaux bloqués : créer / supprimer une indisponibilité

## 6. App mobile — Avis clients (modération) 📱
- [ ] Onglet "Avis clients" depuis le menu (Dashboard ET autres onglets)
- [ ] Onglets En attente / Publiés / Rejetés / Tous + compteur "En attente"
- [ ] Publier un avis → passe en "Publiés", note salon recalculée
- [ ] Rejeter un avis → passe en "Rejetés"
- [ ] Retirer / Republier un avis déjà modéré
- [ ] (Employé non-owner) → action refusée proprement

## 7. App mobile — Branding 📱
- [ ] Salon → Personnalisation : Titre, Sous-titre, Stats
- [ ] Couleur Primaire / Accent / Fond / **Texte** (nouveau) : palette + hex
- [ ] Sauvegarde → couleur primaire appliquée en temps réel dans l'app
- [ ] Vérifier que les couleurs se reflètent sur la page publique du salon

## 8. App mobile — Notifications push 📱
- [ ] Permission demandée au 1er lancement
- [ ] Nouvelle réservation (depuis le web) → notif reçue avec titre + détail
- [ ] **Tap sur la notif RDV** → ouvre directement le bon rendez-vous
- [ ] Annulation client → notif reçue
- [ ] Nouvel avis → notif "⭐ Nouvel avis client", tap → écran Avis
- [ ] Rappel quotidien (8h) → notif du planning du jour
- [ ] Réglage iOS "Afficher les aperçus" = titre/corps visibles

## 9. Web — Réservation publique 🌐
- [ ] Page salon `kreno.ch/s/<slug>` : services, équipe, horaires, branding appliqué
- [ ] Flux de réservation complet → confirmation
- [ ] Email de confirmation reçu (client + propriétaire)
- [ ] Add to Calendar (iCal + Google) sur l'écran succès
- [ ] Paiement en ligne (si service payant) via Stripe → booking confirmé
- [ ] Annulation via lien email → statut annulé + notif push au salon

## 10. Web — Avis 🌐
- [ ] Email demande d'avis envoyé ~2h après le RDV
- [ ] Formulaire `/review/:id` : étoiles + commentaire
- [ ] Soumission → "Merci", impossible de re-soumettre
- [ ] Après publication par le salon : avis **avec commentaire** visible sur la page
- [ ] Avis sans commentaire : compte dans la note, pas de carte (comportement voulu)

## 11. Web — Portail pro 🌐
- [ ] Login owner → dashboard, bookings, stats
- [ ] Modération des avis (cohérent avec l'app mobile)
- [ ] Gestion abonnement / crédits SMS
- [ ] Page `/privacy`, `/support`, `/saas/faq.html`, `/saas/cgu.html` accessibles

## 12. Transverse / sécurité ⚙️
- [ ] Isolation multi-tenant : un salon ne voit jamais les données d'un autre
- [ ] JWT expiré → redirection login propre
- [ ] Rate limiting OTP / contact actif
- [ ] Headers de sécurité présents (CSP, HSTS, X-Frame-Options)
- [ ] HTTPS partout

## 13. Déploiement ⚙️
- [ ] **Render** : `main` déployé → `GET /api/health` OK + `GET /support` = 200
- [ ] Auto-deploy Render activé (ou penser au Manual Deploy)
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` configuré (push)
- [ ] **Codemagic** : build iOS depuis `main` → TestFlight OK
- [ ] App testée sur **device réel** (pas que simulateur) — surtout le push

## 14. App Store Connect ⚙️
- [ ] Fiche app créée, icône 1024×1024 (sans alpha)
- [ ] Screenshots 6.9" (suivre `screenshot-guide.md`)
- [ ] Métadonnées (suivre `app-store-copy.md`)
- [ ] Questionnaire confidentialité (suivre `privacy-disclosures.md`)
- [ ] Compte démo renseigné dans App Review Information
- [ ] URLs : support `kreno.ch/saas/faq.html` (ou `/support`), privacy `kreno.ch/privacy`
- [ ] Classification d'âge 4+

---

## Bugs connus / à surveiller
- `login_screen.dart:206` : warning `use_build_context_synchronously` (pré-existant, non bloquant)
- `main.dart:2` : import `foundation.dart` inutile (cosmétique)
- Notif "logo sans texte" sur iPhone → réglage iOS "Afficher les aperçus", pas un bug code
