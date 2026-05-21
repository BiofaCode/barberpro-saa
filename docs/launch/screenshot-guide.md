# Guide screenshots App Store — Kreno

> Objectif : 5 à 6 captures qui racontent une histoire (vue agenda → détail →
> clients → équipe → personnalisation). Apple exige **au moins 1** screenshot
> en 6.9" ; fournis-en 3+ pour un rendu pro.

## Tailles requises (portrait)
| Appareil | Résolution | Statut |
|---|---|---|
| iPhone 6.9" (15/16 Pro Max) | **1320 × 2868** | Obligatoire |
| iPhone 6.7" (14/15 Pro Max) | **1290 × 2796** | Recommandé |
| iPhone 6.5" (legacy) | 1242 × 2688 | Optionnel |

> Astuce : Apple ré-utilise les captures 6.9" pour les tailles inférieures si
> tu ne fournis qu'un set. Le plus simple : tout faire sur un **iPhone 16 Pro
> Max** (ou simulateur) en 1320×2868.

## Pré-requis
1. Lancer le seed démo : `node scripts/seed-demo.js`
2. Se connecter dans l'app avec `demo@kreno.ch` / `demo1234`
3. Mettre le téléphone en **mode clair**, batterie pleine, heure ~10:30
   (pour que la vue "Aujourd'hui" montre un RDV "en cours")

## Les captures à prendre (dans l'ordre du carrousel)

### 1 — Agenda du jour (écran héros)
- Onglet **RDV**, vue **Jour**, date = aujourd'hui
- Le seed remplit la journée : ~6 RDV de 09:00 à 17:00, statuts variés
- L'indicateur d'heure actuelle (ligne rouge) doit être visible
- **Légende suggérée** : « Toute votre journée en un coup d'œil »

### 2 — Détail d'un rendez-vous
- Toucher le RDV "Balayage — Inès Bonnet" (11:30)
- Le bottom sheet montre service, client, boutons d'action, infos
- **Légende** : « Confirmez, démarrez, reprogrammez en un geste »

### 3 — Tableau de bord (Accueil)
- Onglet **Accueil** : stats du jour + prochains RDV
- **Légende** : « Vos chiffres et vos rendez-vous à venir »

### 4 — Clients
- Onglet **Clients** : la liste des 8 clients démo avec initiales colorées
- **Légende** : « Votre clientèle, toujours à portée de main »

### 5 — Nouveau rendez-vous
- Bouton central **+** → feuille "Nouveau rendez-vous"
- Sélectionner une prestation + un créneau pour montrer le flux
- **Légende** : « Créez un rendez-vous en quelques secondes »

### 6 — Personnalisation (optionnel)
- **Salon → Branding** : le sélecteur de couleurs
- **Légende** : « Une app aux couleurs de votre salon »

## Finition (optionnel mais conseillé)
- Encadrer les captures dans un mockup d'iPhone + fond dégradé aux couleurs
  Kreno (#6366F1 → #818CF8) avec la légende en haut. Outils : `fastlane
  frameit`, Figma, ou Screenshots.pro.
- Garder une typo et un fond cohérents sur les 6 visuels.

## Pièges
- Pas de barre de statut avec notifs perso / faible batterie → utiliser le
  simulateur (`xcrun simctl status_bar` pour figer l'heure et le réseau) ou
  nettoyer l'écran avant capture.
- Vérifier que le branding affiché = couleurs Kreno par défaut (le seed les met
  déjà : indigo #6366F1).
