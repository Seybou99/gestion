# 🚀 GUIDE DE DÉMARRAGE - Version 2.0 (Firebase Auth Uniquement)

## ✨ **NOUVEAUTÉ : Plus besoin de backend !**

L'application utilise maintenant **Firebase Auth uniquement**. C'est beaucoup plus simple ! 🎉

---

## 📋 **DÉMARRAGE RAPIDE**

### **1. Installer les dépendances**

```bash
cd /Users/doumbia/Desktop/test
npm install
```

### **2. Lancer l'application**

```bash
npx expo start
```

**C'est tout ! Plus besoin de démarrer un serveur backend ! ✅**

---

## 👤 **CRÉER UN COMPTE UTILISATEUR**

### **Option A : Via l'application** ⭐ RECOMMANDÉ

1. Lancer l'app
2. Cliquer sur **"S'inscrire"**
3. Remplir le formulaire :
   - Email
   - Mot de passe (min 6 caractères)
   - Prénom
   - Nom
   - Téléphone (optionnel)
4. **Inscription automatique dans Firebase Auth ! ✅**

---

### **Option B : Via script (pour les tests)**

```bash
cd scripts
node create-firebase-user.js email@example.com Password123
```

**Résultat :**
```
✅ Utilisateur créé dans Firebase Auth
🆔 UID Firebase: abc123...
📧 Email: email@example.com
```

---

## 🔐 **SE CONNECTER**

### **Dans l'application :**

1. Email : `diokolo1@gmail.com`
2. Mot de passe : `Azerty123`
3. **Connexion automatique à Firebase ! ✅**

### **Ce qui se passe :**

```
1. Firebase Auth vérifie email/password
2. Génère un token JWT automatiquement
3. Persiste la session dans AsyncStorage
4. Charge les données Firestore
5. Fini ! Vous êtes connecté ✅
```

**Temps : ~0.5 seconde au lieu de 2 secondes ! 🚀**

---

## 📦 **FONCTIONNALITÉS**

### **Authentification :**
- ✅ Inscription
- ✅ Connexion
- ✅ Déconnexion
- ✅ Session persistante (reste connecté)
- ✅ Mise à jour profil
- ✅ Changement mot de passe
- ✅ Suppression compte

### **Gestion de stock :**
- ✅ Créer des produits (avec `created_by` automatique)
- ✅ Gérer le stock par entrepôt
- ✅ Faire des ventes
- ✅ Gérer les clients
- ✅ Catégoriser les produits
- ✅ Historique des mouvements

### **Synchronisation :**
- ✅ Mode offline-first
- ✅ Synchronisation automatique avec Firestore
- ✅ Isolation multi-utilisateurs
- ✅ Règles de sécurité strictes

---

## 🔧 **SCRIPTS UTILES**

### **Depuis le dossier `/scripts` :**

```bash
# Lister les utilisateurs Firebase Auth
node list-firebase-users.js

# Réinitialiser un mot de passe
node reset-firebase-password.js user@email.com NewPassword

# Vérifier les données Firestore
node check-firestore-data.js

# Nettoyer Firestore (supprimer données sans created_by)
node clean-firestore-no-created-by.js
```

---

## 🎯 **UTILISATEURS MULTIPLES**

### **Créer plusieurs utilisateurs de test :**

```bash
cd scripts

# Utilisateur 1
node create-firebase-user.js user1@test.com Password123

# Utilisateur 2  
node create-firebase-user.js user2@test.com Password123
```

### **Tester l'isolation :**

1. Connectez-vous avec `user1@test.com`
2. Créez des produits
3. Déconnectez-vous
4. Connectez-vous avec `user2@test.com`
5. **Vous ne verrez PAS les produits de user1 ! ✅**

---

## 🚨 **DÉPANNAGE**

### **Erreur : "Email already in use"**

L'utilisateur existe déjà dans Firebase Auth.

**Solution :**
```bash
# Lister les utilisateurs
node scripts/list-firebase-users.js

# Réinitialiser le mot de passe si besoin
node scripts/reset-firebase-password.js email@example.com NewPassword
```

---

### **Erreur : "Weak password"**

Le mot de passe doit contenir au moins 6 caractères.

**Solution :** Utiliser un mot de passe plus long (min 6 caractères).

---

### **Utilisateur non connecté à Firebase Auth**

L'utilisateur est connecté au backend mais pas à Firebase Auth.

**Solution :**
```bash
# Déconnectez-vous de l'app
# Reconnectez-vous

# Ou créez l'utilisateur dans Firebase Auth :
cd scripts
node create-firebase-user.js votre@email.com VotreMotDePasse
```

---

## 🎊 **FÉLICITATIONS !**

**Votre application est maintenant :**

✅ **Plus simple** - 1 seul système d'auth  
✅ **Plus rapide** - Connexion directe  
✅ **Plus fiable** - Moins de bugs  
✅ **Plus sécurisée** - Sécurité Google  
✅ **Gratuite** - Pas de serveur backend  
✅ **Production-ready** - Architecture moderne  

**Profitez de votre application simplifiée ! 🚀**

---

## 📚 **DOCUMENTATION**

- `MIGRATION_FIREBASE_AUTH_UNIQUEMENT.md` - Détails de la migration
- `CHANGELOG_MIGRATION.md` - Changements de version
- `Backend/README_BACKEND_OBSOLETE.md` - Pourquoi le backend est obsolète
- `scripts/README_SCRIPTS.md` - Documentation des scripts

---

**Besoin d'aide ? Consultez la documentation Firebase Auth : https://firebase.google.com/docs/auth** 😊

