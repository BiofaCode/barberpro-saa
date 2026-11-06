# Migrer un salon de WP Amelia vers Kreno (en gardant son site WordPress)

Le site WordPress du client reste tel quel. Seuls les boutons « Réserver » changent :
la réservation se fait dans une popup Kreno, sur son propre site.

## 1. Préparer le salon dans Kreno

1. Créer le salon (admin Kreno) et son compte propriétaire.
2. Recréer les **prestations** avec les **mêmes noms** que dans Amelia (Amelia → Services) :
   nom, durée, prix. Le script d'import fait le lien par le nom (accents et majuscules ignorés).
3. Recréer les **employés** avec les mêmes noms que dans Amelia (Amelia → Employés).
4. Horaires d'ouverture, couleurs, logo.

## 2. Exporter les données d'Amelia

Dans l'hébergement WordPress → **phpMyAdmin** → base du site → onglet **SQL**.
Le préfixe des tables est souvent `wp_` ; s'il est différent (ex. `wpxy_`), adaptez les requêtes.
Après chaque requête : **Exporter** → format **CSV** → cocher « Mettre les noms de colonnes en première ligne ».

**Clients** → `clients.csv`

```sql
SELECT CONCAT(firstName, ' ', lastName) AS name, email, phone, note AS notes
FROM wp_amelia_users
WHERE type = 'customer';
```

**Rendez-vous à venir** → `rdv.csv`

```sql
SELECT DATE(a.bookingStart)                              AS date,
       TIME_FORMAT(a.bookingStart, '%H:%i')               AS time,
       TIMESTAMPDIFF(MINUTE, a.bookingStart, a.bookingEnd) AS duration,
       s.name                                             AS service,
       cb.price                                           AS price,
       CONCAT(p.firstName, ' ', p.lastName)               AS employee,
       CONCAT(c.firstName, ' ', c.lastName)               AS client_name,
       c.email                                            AS client_email,
       c.phone                                            AS client_phone,
       cb.status                                          AS status,
       a.internalNotes                                    AS notes
FROM wp_amelia_appointments a
JOIN wp_amelia_customer_bookings cb ON cb.appointmentId = a.id
JOIN wp_amelia_users c              ON c.id = cb.customerId
LEFT JOIN wp_amelia_users p         ON p.id = a.providerId
LEFT JOIN wp_amelia_services s      ON s.id = a.serviceId
WHERE a.bookingStart >= CURDATE()
ORDER BY a.bookingStart;
```

Pour récupérer aussi l'historique (fiches clients complètes), retirez la ligne `WHERE`
et ajoutez `--include-past` à l'import.

Sans accès phpMyAdmin : tout fichier CSV avec ces colonnes convient (export Excel, autre outil).

## 3. Importer (simulation d'abord)

```bash
node scripts/import-bookings.js --salon dacutzz --clients clients.csv --bookings rdv.csv
```

La simulation n'écrit rien et affiche :
- le nombre de clients et de RDV à importer, les doublons, les annulés et les passés ignorés ;
- les **prestations et employés inconnus** de Kreno → les créer ou les renommer, puis relancer ;
- les **chevauchements** de créneaux, à vérifier avec le salon.

**Heures** : comparez 2-3 RDV de la simulation avec le calendrier Amelia. S'ils sont décalés
d'1 h ou 2 h, Amelia a stocké les heures en UTC : relancez avec `--utc`.

Quand le rapport est propre :

```bash
node scripts/import-bookings.js --salon dacutzz --clients clients.csv --bookings rdv.csv --commit
```

Le script peut être relancé sans créer de doublons. Il n'envoie **aucun** email ni SMS aux clients.

## 4. Brancher les boutons du site WordPress

**a. Ajouter le script une seule fois**, avant `</body>` :
extension « WPCode » / « Insert Headers and Footers » → *Footer*, ou le thème enfant :

```html
<script src="https://kreno.ch/embed.js" defer></script>
```

**b. Changer le lien de chaque bouton « Réserver »** (Elementor, Gutenberg, menu…) :

| Bouton | Lien |
|---|---|
| Réserver (général) | `https://kreno.ch/s/dacutzz` |
| Réserver une prestation précise | `https://kreno.ch/s/dacutzz?service=Coupe%20Homme` |

Le nom de la prestation doit être identique à celui de Kreno (espaces → `%20`).

- **Avec le script** : le clic ouvre la popup de réservation sur le site du client.
- **Sans le script**, ou s'il ne charge pas en 10 s : le lien ouvre simplement la page Kreno du salon.
  Le bouton ne peut donc jamais être cassé.
- Paiement en ligne : la popup laisse la place à la page de paiement Stripe (Stripe refuse
  d'être affiché dans une popup), puis le client revient sur la page Kreno du salon.

**c. Retirer Amelia** : supprimer les shortcodes/blocs `[ameliabooking]` et
`[ameliacatalog]` des pages, puis désactiver l'extension **après** la bascule (étape 5).

## 5. Le jour de la bascule

1. Dans Amelia, fermer les nouvelles réservations (désactiver les services ou passer le formulaire en maintenance).
2. Exporter → importer avec `--commit` (étapes 2-3) → vérifier le planning dans l'app Kreno.
3. Changer les boutons du site (étape 4), ainsi que les liens **Google Business**, **Instagram** et **Facebook**.
4. Tester une réservation depuis un téléphone, puis l'annuler.
5. Prévenir les clients qui ont un RDV à venir : leurs anciens liens Amelia (annuler/modifier)
   ne fonctionneront plus. Message type :
   > « Nous changeons de système de réservation. Votre RDV du [date] est bien maintenu.
   > Pour le modifier : [lien Kreno] ou appelez-nous au [tél]. »
6. Garder Amelia désactivée (pas supprimée) 1 mois, au cas où.
