# Firebase Cloud Messaging — Setup pas à pas

Ce guide explique tout ce qu'il faut faire **côté Firebase + Apple Developer + Render** pour activer les notifications push de l'app mobile Kreno. Le code (backend + Flutter) est déjà en place — il manque seulement les fichiers de configuration et les clés.

Temps estimé : **45-60 minutes** (la création de l'APNs Auth Key peut être la partie la plus lente si tu n'as jamais utilisé Apple Developer).

---

## 1. Créer le projet Firebase (5 min)

1. Aller sur https://console.firebase.google.com
2. Cliquer **"Ajouter un projet"** → nommer **Kreno**
3. Désactiver Google Analytics (pas nécessaire pour des notifications)
4. Cliquer **Créer le projet**

---

## 2. Ajouter l'app Android (10 min)

1. Dans le projet, cliquer l'icône **Android** → "Ajouter une application"
2. **Package name** : récupère-le dans `barber_app/android/app/build.gradle` (cherche `applicationId`). Par défaut probablement `com.example.barber_app` — **change-le** dans `build.gradle` pour `ch.kreno.app` ou similaire avant de continuer (l'App Store/Play ne te laissera pas publier avec `com.example.*`)
3. **Pseudo de l'app** : `Kreno` (optionnel)
4. **SHA-1** : pas requis pour FCM basique, ignore
5. Télécharger **`google-services.json`**
6. Déposer le fichier dans `barber_app/android/app/google-services.json`
7. Dans `barber_app/android/build.gradle` (le root, pas celui de /app), ajouter dans `plugins {}` :
   ```groovy
   id "com.google.gms.google-services" version "4.4.2" apply false
   ```
8. Dans `barber_app/android/app/build.gradle`, ajouter en haut :
   ```groovy
   apply plugin: 'com.google.gms.google-services'
   ```

---

## 3. Ajouter l'app iOS (10 min)

1. Dans Firebase Console, cliquer l'icône **iOS**
2. **Bundle ID** : récupère-le dans Xcode (`ios/Runner.xcworkspace` → Runner → General → Bundle Identifier). Par défaut probablement `com.example.barberApp` — **change-le** pour `ch.kreno.app` (doit être unique, en reverse-DNS)
3. Télécharger **`GoogleService-Info.plist`**
4. Ouvrir Xcode, glisser le fichier dans le dossier `Runner` (cocher "Copy items if needed")
5. Dans Xcode, sélectionner Runner → onglet **Signing & Capabilities** → cliquer **+ Capability** → ajouter **Push Notifications**
6. Cliquer encore **+ Capability** → ajouter **Background Modes** → cocher **Remote notifications**

---

## 4. Créer la clé APNs Apple Developer (10-15 min)

C'est la partie qui demande un compte **Apple Developer Program** ($99/an). Sans ça, pas de push sur iOS.

1. Aller sur https://developer.apple.com/account/resources/authkeys/list
2. Cliquer le **+** pour créer une nouvelle clé
3. Nommer : `Kreno APNs`
4. Cocher **Apple Push Notifications service (APNs)**
5. Continuer → Register → **télécharger le fichier `.p8`** (tu ne pourras le télécharger qu'**une seule fois**, garde-le précieusement)
6. Noter le **Key ID** (10 caractères affichés à côté de la clé)
7. Noter ton **Team ID** : visible en haut à droite de la page Apple Developer

---

## 5. Uploader la clé APNs dans Firebase (2 min)

1. Firebase Console → ⚙️ Paramètres du projet → onglet **Cloud Messaging**
2. Dans **Configuration de l'application Apple**, cliquer **Importer** sous **Clé d'authentification APN**
3. Sélectionner le fichier `.p8` téléchargé
4. Coller le **Key ID** et le **Team ID**
5. Cliquer **Importer**

---

## 6. Générer le service account JSON (backend) (3 min)

1. Firebase Console → ⚙️ Paramètres du projet → onglet **Comptes de service**
2. Cliquer **Générer une nouvelle clé privée** → **Générer la clé**
3. Un fichier `.json` est téléchargé — c'est le secret qui permet au serveur Node d'envoyer des pushs
4. **Ne pas le commiter dans Git.** Le contenu va dans une variable d'environnement.

---

## 7. Configurer Render (5 min)

1. Aller sur https://dashboard.render.com → service Kreno
2. Onglet **Environment**
3. Ajouter une nouvelle variable :
   - **Key** : `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value** : ouvrir le fichier `.json` téléchargé à l'étape 6 et copier **tout son contenu** dans la valeur (sur une seule ligne — Render le gère)
4. Sauvegarder → le service redémarre automatiquement
5. Dans les logs, tu dois voir `🔔 Firebase Cloud Messaging initialized`

Optionnel : ajouter la même variable dans ton `.env` local pour tester en dev.

---

## 8. Tester (5 min)

1. Lancer `flutter pub get` puis `flutter run` sur un **vrai appareil** (simulateurs iOS ne reçoivent pas de push)
2. Se connecter
3. Vérifier dans les logs du serveur : `📩 Push token enregistré`
4. Faire une réservation de test sur ton site (`/s/{slug}`)
5. La notification doit apparaître sur l'appareil en quelques secondes

---

## Récap des fichiers à ajouter (jamais commités dans Git)

```
barber_app/android/app/google-services.json   ← étape 2
barber_app/ios/Runner/GoogleService-Info.plist ← étape 3
```

Render env var :
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Troubleshooting

**Le serveur log "📵 Push notifications disabled"**
→ La variable `FIREBASE_SERVICE_ACCOUNT_JSON` n'est pas définie ou pas du JSON valide. Vérifier qu'elle est bien dans Render et que tu as copié l'intégralité du fichier `.json`.

**iOS : pas de notif reçue mais Android OK**
→ Vérifier que la clé APNs a bien été uploadée dans Firebase, et que les capabilities "Push Notifications" + "Background Modes / Remote notifications" sont cochées dans Xcode.

**Token enregistré mais pas de push reçu**
→ Vérifier que le bundle ID dans Xcode = celui dans Firebase = celui dans Apple Developer. Une faute de frappe et rien ne marche.

**`com.example.*` refusé par App Store**
→ Tu dois changer le bundle ID et le package name **avant** de pousser sur l'App Store. Voir étapes 2 et 3.
