---
description: Comment déployer BarberPro en production sur Render.com
---
// turbo-all

# 🚀 Déploiement BarberPro sur Render

## Prérequis
- Un compte GitHub (gratuit) : https://github.com
- Un compte Render (gratuit) : https://render.com

## Étape 1 : Mettre le code sur GitHub

1. Va sur https://github.com/new
2. Nom du repo : `barberpro-saas`
3. Mets en **Private** (ton code est privé)
4. Clique **Create repository**
5. Dans ton terminal, tape :

```bash
cd c:\Users\fabio\CascadeProjects\barber-salon
git init
git add .
git commit -m "BarberPro SaaS v2.0"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/barberpro-saas.git
git push -u origin main
```

## Étape 2 : Déployer sur Render

1. Va sur https://dashboard.render.com
2. Clique **New > Web Service**
3. Connecte ton GitHub et sélectionne le repo `barberpro-saas`
4. Configure :
   - **Name** : barberpro
   - **Environment** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free (gratuit)
5. Ajoute les **Environment Variables** :
   - `PORT` = `10000` (Render utilise ce port)
   - `JWT_SECRET` = (génère un secret long et aléatoire)
   - `NODE_ENV` = `production`
6. Clique **Create Web Service**
7. Attend 2-3 minutes, ton site sera live sur `https://barberpro.onrender.com`

## Étape 3 (optionnel) : Domaine personnalisé

1. Dans Render > Settings > Custom Domains
2. Ajoute `barberpro.fr` ou un autre nom de domaine
3. Configure les DNS chez ton registrar (OVH, Gandi, etc.)

## Notes
- Le plan gratuit de Render met le site en veille après 15 min d'inactivité
- Pour un site toujours en ligne, passe au plan payant (~7$/mois)
- Les données sont stockées dans un fichier JSON (data/database.json)
- Pour plus de fiabilité, passe à MongoDB Atlas plus tard
