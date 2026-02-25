---
description: Roadmap complète pour passer BarberPro SaaS en production
---

# 🚀 BarberPro SaaS — Roadmap vers la Production

## Phase 1 : Fondations (MAINTENANT)
// turbo-all

### 1.1 ✅ Base de données MongoDB
- Remplacer database.json par MongoDB (gratuit avec MongoDB Atlas)
- Installer `mongoose` pour le mapping objet-document
- Créer les modèles : Salon, Owner, Employee, Client, Booking
- Migration des données existantes

### 1.2 ✅ Upload de logo
- Endpoint d'upload d'image côté serveur
- Stockage local (dossier `uploads/`) puis migration vers cloud (Cloudinary/S3)
- Le barbier peut uploader le logo depuis l'admin barbier
- Le site du salon affiche le logo ou le texte en fallback

### 1.3 ✅ Variables d'environnement
- Créer un fichier `.env` pour les secrets (port, DB URL, etc.)
- Utiliser `dotenv` pour charger les variables

## Phase 2 : Sécurité & Auth (PRIORITAIRE)

### 2.1 Hashage de mots de passe
- Utiliser `bcrypt` pour hasher les mots de passe
- Ne plus stocker les mots de passe en clair

### 2.2 JWT Authentication
- Tokens JWT pour l'authentification barbier et super admin
- Middleware de vérification sur les routes protégées
- Refresh tokens

### 2.3 CORS & Headers de sécurité
- Configurer CORS pour les domaines autorisés
- Ajouter les headers de sécurité (helmet)

## Phase 3 : Fonctionnalités Métier

### 3.1 📱 Rappels SMS (EN DÉVELOPPEMENT)
- Intégration Twilio ou OVH SMS
- Rappel automatique 24h avant le RDV
- Rappel 1h avant le RDV
- Interface pour activer/désactiver les rappels
- **Statut : 🔶 En développement**

### 3.2 📧 Emails transactionnels
- Confirmation de réservation
- Rappel par email
- Email de bienvenue pour les nouveaux salons
- Utiliser Resend, SendGrid ou Brevo

### 3.3 💳 Paiements & Abonnements
- Intégration Stripe pour les abonnements mensuels des salons
- Plans : Starter (gratuit/limité), Pro, Premium
- Webhooks Stripe pour gérer les changements de plan

## Phase 4 : Déploiement

### 4.1 Hébergement
- **Backend** : Railway, Render, ou VPS (OVH/Hetzner)
- **Base de données** : MongoDB Atlas (gratuit pour commencer)
- **Fichiers/logos** : Cloudinary (gratuit jusqu'à 25GB)
- **Domaine** : barberpro.fr ou barberpro.app

### 4.2 CI/CD
- GitHub pour le code source
- Auto-deploy via Railway/Render quand tu push sur main

### 4.3 Monitoring
- Logs structurés
- Alertes en cas d'erreur

## Phase 5 : App Mobile

### 5.1 Flutter App
- Build APK (Android) et IPA (iOS)
- Publication sur Play Store / App Store
- Push notifications pour les nouveaux RDV

---

## Ce qu'on fait MAINTENANT (dans cette session) :
1. ✅ Upload de logo pour les barbiers
2. ✅ Migration vers MongoDB
3. ✅ Variables d'environnement (.env)
4. ✅ Section "Rappels SMS" marquée "En développement"
