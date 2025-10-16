# 📚 GUIDE : COMMIT ET PUSH SUR GITHUB

## 🎯 ÉTAPES COMPLÈTES

### **Étape 1 : Créer un repository sur GitHub** 

1. **Aller sur GitHub :**
   - Ouvrir https://github.com dans votre navigateur
   - Se connecter avec votre compte

2. **Créer un nouveau repository :**
   - Cliquer sur le bouton **"+"** en haut à droite
   - Sélectionner **"New repository"**
   
3. **Configurer le repository :**
   ```
   Repository name : gestion-stock-app  (ou le nom de votre choix)
   Description : Application de gestion de stock avec React Native & Firebase
   Visibilité : Private (recommandé) ou Public
   
   ❌ NE PAS cocher "Add a README file"
   ❌ NE PAS ajouter .gitignore
   ❌ NE PAS choisir de license
   ```

4. **Cliquer sur "Create repository"**

5. **Copier l'URL du repository :**
   - GitHub va afficher une URL comme : `https://github.com/votre-username/gestion-stock-app.git`
   - **Copier cette URL** (vous en aurez besoin à l'étape 2)

---

### **Étape 2 : Configurer Git localement**

Ouvrir le terminal et exécuter ces commandes **dans cet ordre** :

```bash
# 1. Aller dans le dossier du projet
cd /Users/doumbia/Desktop/test

# 2. Configurer votre identité Git (si pas encore fait)
git config --global user.name "Votre Nom"
git config --global user.email "votre-email@example.com"

# 3. Ajouter GitHub comme remote
git remote add origin https://github.com/votre-username/gestion-stock-app.git

# 4. Vérifier que le remote est bien configuré
git remote -v
```

**Remplacer :**
- `Votre Nom` par votre vrai nom
- `votre-email@example.com` par votre email GitHub
- `https://github.com/votre-username/gestion-stock-app.git` par l'URL copiée à l'étape 1

---

### **Étape 3 : Préparer les fichiers pour le commit**

```bash
# Ajouter TOUS les fichiers au staging
git add .

# Vérifier les fichiers ajoutés
git status
```

---

### **Étape 4 : Créer le commit**

```bash
# Créer le commit avec un message descriptif
git commit -m "🎉 Migration Firebase Auth + Isolation multi-utilisateurs

- Migration Firebase Auth uniquement (backend Express supprimé)
- Isolation complète des données par utilisateur (created_by)
- Filtrage des produits et statistiques par utilisateur
- Nettoyage cache au changement d'utilisateur
- Suppression bouton sync cloud (synchronisation automatique)
- Documentation complète (11 fichiers MD)
- Application production-ready"
```

---

### **Étape 5 : Pousser sur GitHub**

```bash
# Pousser le code sur GitHub
git push -u origin master

# Ou si vous êtes sur la branche 'main'
git push -u origin main
```

**Note :** La première fois, GitHub vous demandera peut-être de vous authentifier.

---

## 🚀 COMMANDES RAPIDES POUR LES PROCHAINS COMMITS

Après la première configuration, pour les commits suivants :

```bash
# 1. Ajouter les fichiers modifiés
git add .

# 2. Créer le commit
git commit -m "Description des changements"

# 3. Pousser sur GitHub
git push
```

---

## 📝 EXEMPLES DE MESSAGES DE COMMIT

**Bonnes pratiques :**

```bash
# Ajout de fonctionnalité
git commit -m "✨ Ajout système de notifications push"

# Correction de bug
git commit -m "🐛 Fix erreur affichage dashboard en mode offline"

# Amélioration de performance
git commit -m "⚡ Optimisation requêtes Firestore (cache)"

# Mise à jour documentation
git commit -m "📚 Mise à jour guide utilisateur"

# Refactoring
git commit -m "♻️ Refactoring isolation utilisateurs"

# Suppression de code
git commit -m "🔥 Suppression backend Express.js obsolète"
```

---

## 🔍 COMMANDES UTILES

### **Voir l'état des fichiers :**
```bash
git status
```

### **Voir l'historique des commits :**
```bash
git log --oneline
```

### **Voir les différences :**
```bash
# Différences non stagées
git diff

# Différences stagées
git diff --staged
```

### **Annuler des changements :**
```bash
# Annuler un fichier non stagé
git restore nom-du-fichier

# Retirer un fichier du staging
git restore --staged nom-du-fichier

# Annuler le dernier commit (garde les changements)
git reset --soft HEAD~1
```

---

## 🔐 AUTHENTIFICATION GITHUB

### **Option 1 : Personal Access Token (recommandé)**

1. **Créer un token :**
   - Aller sur https://github.com/settings/tokens
   - Cliquer "Generate new token" → "Generate new token (classic)"
   - Donner un nom : `gestion-stock-app`
   - Cocher : `repo` (accès complet au repository)
   - Cliquer "Generate token"
   - **COPIER LE TOKEN** (vous ne le reverrez plus !)

2. **Utiliser le token :**
   ```bash
   # Lors du push, GitHub demandera :
   Username: votre-username
   Password: <COLLER LE TOKEN ICI>
   ```

### **Option 2 : SSH (avancé)**

1. **Générer une clé SSH :**
   ```bash
   ssh-keygen -t ed25519 -C "votre-email@example.com"
   ```

2. **Ajouter la clé à GitHub :**
   - Copier la clé publique : `cat ~/.ssh/id_ed25519.pub`
   - Aller sur https://github.com/settings/keys
   - Cliquer "New SSH key"
   - Coller la clé

3. **Changer l'URL du remote :**
   ```bash
   git remote set-url origin git@github.com:votre-username/gestion-stock-app.git
   ```

---

## ⚠️ FICHIERS À NE PAS COMMITER

Vérifier que votre `.gitignore` contient :

```
# Secrets
.env
.env.local
firebase-adminsdk-*.json
service-account-key.json

# Node modules
node_modules/
Backend/node_modules/

# Builds
.expo/
dist/
build/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
logs/
```

---

## 🎯 WORKFLOW RECOMMANDÉ

### **Avant de coder :**
```bash
git pull  # Récupérer les dernières modifications
```

### **Pendant le développement :**
```bash
# Commits fréquents avec messages clairs
git add .
git commit -m "Message descriptif"
```

### **À la fin de la journée :**
```bash
git push  # Envoyer sur GitHub
```

---

## 📊 STRUCTURE DE VOTRE REPOSITORY

Après le push, votre GitHub devrait ressembler à :

```
gestion-stock-app/
├── app/                         # Pages React Native
├── components/                  # Composants réutilisables
├── services/                    # Firebase, Database, Sync
├── store/                       # Redux (slices)
├── utils/                       # Utilitaires
├── scripts/                     # Scripts Firebase Admin
├── assets/                      # Images, fonts
├── Backend/                     # Backend obsolète (à documenter)
├── *.md                        # Documentation (11 fichiers)
├── package.json                # Dépendances
├── firebase.json               # Config Firebase
├── firestore.rules            # Règles Firestore
└── README.md                   # Guide principal
```

---

## 🎉 COMMANDES COMPLÈTES (COPIER-COLLER)

### **Configuration initiale (une seule fois) :**

```bash
cd /Users/doumbia/Desktop/test
git config --global user.name "Votre Nom"
git config --global user.email "votre-email@example.com"
git remote add origin https://github.com/votre-username/gestion-stock-app.git
git add .
git commit -m "🎉 Initial commit - Application gestion stock

- React Native + Expo
- Firebase Auth (migration terminée)
- Firestore avec isolation multi-utilisateurs
- Mode offline-first avec synchronisation
- Documentation complète
- Production-ready"
git push -u origin master
```

### **Pour les commits suivants :**

```bash
cd /Users/doumbia/Desktop/test
git add .
git commit -m "Description de vos changements"
git push
```

---

## ✅ VÉRIFICATION FINALE

Après le push, vérifier sur GitHub :

1. **Aller sur** : https://github.com/votre-username/gestion-stock-app
2. **Vérifier que tous les fichiers sont présents**
3. **Vérifier le README.md s'affiche correctement**
4. **Vérifier la documentation (fichiers .md)**

---

## 🆘 EN CAS DE PROBLÈME

### **Erreur "remote origin already exists" :**
```bash
git remote remove origin
git remote add origin https://github.com/votre-username/gestion-stock-app.git
```

### **Erreur "authentication failed" :**
- Utiliser un Personal Access Token au lieu du mot de passe
- Vérifier les permissions du token

### **Erreur "failed to push" :**
```bash
git pull --rebase origin master
git push
```

---

**Besoin d'aide ?** Consultez la documentation GitHub : https://docs.github.com/fr

---

**Date :** 16 octobre 2025  
**Auteur :** Guide Git pour projet gestion-stock-app

