# 🛠️ SCRIPTS UTILITAIRES

## 📋 **LISTE DES SCRIPTS FIREBASE**

Depuis le dossier `/scripts` :

### **Gestion des utilisateurs :**

```bash
# Créer un utilisateur Firebase Auth
node create-firebase-user.js email@example.com motdepasse

# Lister tous les utilisateurs
node list-firebase-users.js

# Réinitialiser un mot de passe
node reset-firebase-password.js email@example.com nouveaumotdepasse
```

### **Gestion des données :**

```bash
# Vérifier les données Firestore
node check-firestore-data.js

# Nettoyer les documents sans created_by
node clean-firestore-no-created-by.js

# Mettre à jour created_by en masse
node fix-created-by.js email@example.com UID
```

---

## ⚙️ **CONFIGURATION**

Ces scripts utilisent `firebase-admin-config.js` qui lit les variables d'environnement depuis `Backend/.env`.

**Variables requises dans `Backend/.env` :**
```env
FIREBASE_PROJECT_ID=gestion-94304
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
```

---

## 📝 **SCRIPTS APP (ANCIENS)**

Ces scripts sont pour l'application et peuvent être exécutés depuis la racine :

```bash
# Nettoyer les données locales
node scripts/clear-storage.js

# Tester l'authentification
node scripts/test-auth-flow.js

# Mettre à jour l'IP du réseau
node scripts/update-ip.js
```

---

**Note :** Le dossier `Backend/` n'est plus nécessaire depuis la migration vers Firebase Auth uniquement.

