-- ============================================================
-- Export des RDV Amelia (WordPress) → CSV pour scripts/import-bookings-csv.js
-- ============================================================
-- Où : hébergeur du site → phpMyAdmin → base WordPress → onglet SQL.
-- Puis « Exporter » le résultat en CSV (séparateur ; ou , — les deux sont acceptés).
-- ⚠️ Le préfixe des tables peut être différent de « wp_ » (voir wp-config.php : $table_prefix).
-- ⚠️ Schéma Amelia à vérifier sur la version installée (noms de colonnes stables depuis Amelia 1.x).
-- Lecture seule : cette requête ne modifie rien.

SELECT
  a.id                                         AS id,
  DATE(a.bookingStart)                         AS date,
  DATE_FORMAT(a.bookingStart, '%H:%i')         AS time,
  TIMESTAMPDIFF(MINUTE, a.bookingStart, a.bookingEnd) AS duration,
  s.name                                       AS service,
  TRIM(CONCAT(p.firstName, ' ', p.lastName))   AS staff,
  TRIM(CONCAT(c.firstName, ' ', c.lastName))   AS client_name,
  c.email                                      AS client_email,
  c.phone                                      AS client_phone,
  cb.price                                     AS price,
  -- annulé côté RDV OU côté client = annulé
  CASE WHEN cb.status IN ('canceled','rejected','no-show') THEN cb.status ELSE a.status END AS status,
  a.internalNotes                              AS notes
FROM wp_amelia_appointments a
JOIN wp_amelia_customer_bookings cb ON cb.appointmentId = a.id
JOIN wp_amelia_users c              ON c.id = cb.customerId
LEFT JOIN wp_amelia_users p         ON p.id = a.providerId
LEFT JOIN wp_amelia_services s      ON s.id = a.serviceId
WHERE a.bookingStart >= CURDATE()
ORDER BY a.bookingStart;
