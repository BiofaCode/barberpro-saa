# Refonte visuelle de l'app mobile — « sobre et pro »

Date : 24 nov. 2026 · Branche : `feat/mobile-design-system` · App : `barber_app/`

## Intention
Fabio et Enzo trouvent que l'app « fait générée par IA ». **L'usage leur convient**
(écrans, parcours, fonctions) : seul le **look** doit devenir plus **sobre, simple et
professionnel**. Premier utilisateur réel : Divio (Da Cutzz, barbier), qui teste
l'app actuelle avant son lancement du 7 déc. 2026.

## Diagnostic (code actuel)
- `theme/app_theme.dart` : la couleur du salon (`branding.primaryColor`, Da Cutzz = rose
  `#ff66c4`) remplace bien le violet sur les éléments actifs, **mais** fonds, gris,
  bordures et teintes claires sont des constantes **teintées violet**
  (`bgMain #F8F8FC`, `bgSurface #F1F1F8`, `bgElevated #EEEDFD`, `textMuted #9898B5`,
  `primaryLight #EEEDFD`…) → mélange « rose sur base violette ».
- Deux polices mélangées (DM Sans + Bricolage Grotesque), 273 `fontSize:` écrits à la
  main, rayons d'angle dispersés (2 à 20), dégradés (~12), ombres, emojis décoratifs dans
  12 écrans, boutons en pilule (radius 30).

## Objectifs
1. Base **neutre** (blanc / gris chauds / texte quasi noir) : plus aucune teinte violette.
2. La **couleur du salon** reste l'unique couleur d'accent, réservée aux actions
   principales et à l'état actif/sélectionné (l'app « porte » l'identité du salon).
3. **Une seule famille de police**, une échelle de tailles courte et fixe.
4. Surfaces **plates** : cartes blanches + bordure fine 1 px, ombres quasi absentes,
   plus de dégradés décoratifs, emojis remplacés par des icônes Material sobres
   (outlined) ou supprimés.
5. Rayons cohérents : 8 (petits éléments), 12 (cartes, champs, boutons), 20 (feuilles).
6. Styles **centralisés** (tokens dans `app_theme.dart`) pour que la cohérence tienne.

## Non-objectifs
- Pas de changement de parcours, d'écrans, de navigation ni de logique.
- Pas de mode sombre (plus tard éventuellement).
- Pas de changement du site web / portail pro (autre chantier).

## Anti-objectifs (échec même si « ça marche »)
- Casser une fonction pendant que Divio teste → tout se fait sur la branche, fusion
  **après le 7 déc.** sauf si prêt et testé avant.
- Remplacer le look IA par un autre look générique (glassmorphism, néon, dégradés).
- Perte de lisibilité : contraste texte ≥ 4.5:1, couleur du salon jamais utilisée comme
  couleur de texte sur fond blanc si son contraste est insuffisant (ex. rose clair) →
  texte sur accent calculé blanc/noir selon la luminance.

## Approches considérées
- **A. Thème global seul** (couleurs/polices) — rapide, mais ~300 styles en dur dans
  les écrans garderaient l'ancien look → résultat à moitié fait.
- **B. Mini système de design + passage écran par écran** — *choisie par Fabio*. Tokens
  centralisés, puis chaque écran migré vers les tokens. ~2–3 jours.
- **C. Refonte des mises en page** — écartée : la base et l'usage conviennent.

## Le système (décisions)
- **Couleurs neutres** (tokens) : fond app `#F7F7F5`, carte `#FFFFFF`, surface
  secondaire `#F0F0EE`, bordure `#E4E4E0`, texte `#161616`, texte secondaire `#55554F`,
  texte discret `#6E6E67`. États : succès `#1A7A43`, alerte `#8F5E12`, erreur `#C2362F`
  (moins saturés que l'actuel).
- **Accent** = couleur du salon (inchangé : `primaryNotifier`), + `onPrimary` calculé
  (blanc ou noir selon luminance) et une teinte légère dérivée (fond de sélection).
- **Police** : une seule famille (Inter, via google_fonts déjà présent), graisses 400 /
  500 / 600 / 700 ; titres en 600–700, pas de police « display » fantaisie.
  Échelle : 12 · 13 · 15 · 17 · 20 · 28. Chiffres tabulaires pour heures/montants.
- **Boutons** : radius 12 (plus de pilule), hauteur 48–52, primaire plein (accent),
  secondaire bordé neutre.
- **Barre du bas** : fond blanc, bordure haute 1 px, icône active à l'accent, bouton
  « + » central conservé mais plat.

## Méthode de mise en œuvre
1. Tokens + `ThemeData` dans `app_theme.dart` (sans casser les noms existants : les
   anciennes constantes pointent vers les nouvelles valeurs neutres).
2. Helpers de texte (`AppText.title/body/caption…`) pour remplacer les `GoogleFonts.*`
   écrits à la main.
3. **Écran témoin d'abord : Accueil (dashboard)** + barre du bas → build TestFlight →
   Fabio/Enzo valident la direction avant de migrer le reste.
4. Puis : RDV (liste/agenda), détail RDV, nouveau RDV, clients, salon/réglages,
   prestations, employés, pauses, avis, connexion, console admin.
5. `flutter analyze` à zéro (la CI échoue même sur les « info »).
6. Skills utilisés pendant la mise en œuvre : `ui-ux-pro-max` (contrastes, espacements,
   règles UX mobiles) et `frontend-design` (éviter les choix génériques).

## Laissé au constructeur
Valeurs fines d'espacement, choix d'icônes de remplacement, détail de chaque écran,
tant que les règles ci-dessus sont respectées.
