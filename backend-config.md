# Configuration Backend pour l'Authentification

## 🚀 Démarrage Rapide

Pour utiliser le système d'authentification, vous devez configurer un backend. Voici les options :

### Option 1 : Utiliser le Backend du Projet new-project

1. **Naviguez vers le dossier backend :**
   ```bash
   cd /Users/doumbia/Documents/Documents\ -\ MacBook\ Pro\ de\ Doumbia/DOUMBIA/CODE/new-project/backend
   ```

2. **Installez les dépendances :**
   ```bash
   npm install
   ```

3. **Configurez les variables d'environnement :**
   ```bash
   cp env.example .env
   ```
   
   Puis éditez le fichier `.env` avec vos clés Firebase :
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key
   ALLOWED_ORIGINS=http://localhost:19006,http://localhost:3000
   ```

4. **Démarrez le serveur :**
   ```bash
   npm run dev
   ```

### Option 2 : Backend Mock Intégré (RECOMMANDÉ)

Un backend mock complet est déjà inclus dans le projet :

1. **Démarrez le serveur mock :**
   ```bash
   node mock-backend.js
   ```

2. **Le serveur mock inclut :**
   - ✅ **Inscription** avec validation complète
   - ✅ **Connexion** avec vérification
   - ✅ **Vérification de token** JWT mock
   - ✅ **Mise à jour de profil**
   - ✅ **Changement de mot de passe**
   - ✅ **Suppression de compte**
   - ✅ **Base de données en mémoire**
   - ✅ **Gestion d'erreurs complète**

3. **Fonctionnalités du mock :**
   - Validation des données côté serveur
   - Génération de tokens JWT mock
   - Persistance des données en session
   - Messages d'erreur détaillés
   - Support complet de l'API

### Option 3 : Désactiver l'Authentification (Mode Démo)

Si vous voulez tester l'interface sans backend, modifiez le service API :

1. **Éditez `services/api.ts` :**
   ```typescript
   // Ajoutez cette propriété à la classe ApiService
   private mockMode = true; // Passez à false pour utiliser le vrai backend
   
   // Modifiez la méthode testConnectivity
   async testConnectivity(): Promise<boolean> {
     if (this.mockMode) {
       console.log('🔧 Mode mock activé - Pas de connexion backend requise');
       return true;
     }
     
     // ... reste du code existant
   }
   ```

## 🔧 Configuration de l'URL Backend

Dans le fichier `services/api.ts`, modifiez l'URL selon votre configuration :

```typescript
// Pour backend local
const API_BASE_URL = 'http://localhost:3000';

// Pour backend sur votre réseau local
const API_BASE_URL = 'http://192.168.1.100:3000'; // Remplacez par votre IP

// Pour backend de production
const API_BASE_URL = 'https://your-backend.herokuapp.com';
```

## 📱 Test de l'Application

1. **Démarrez l'application Expo :**
   ```bash
   npx expo start
   ```

2. **Testez l'inscription :**
   - Créez un nouveau compte
   - Vérifiez que vous êtes redirigé vers l'interface principale

3. **Testez la connexion :**
   - Déconnectez-vous
   - Reconnectez-vous avec vos identifiants

4. **Testez la gestion du profil :**
   - Modifiez vos informations
   - Changez votre mot de passe
   - Supprimez votre compte

## 🎯 Fonctionnalités Disponibles

- ✅ **Inscription** avec validation complète
- ✅ **Connexion** sécurisée
- ✅ **Gestion du profil** utilisateur
- ✅ **Changement de mot de passe**
- ✅ **Suppression de compte**
- ✅ **Persistance de session** avec AsyncStorage
- ✅ **Interface responsive** conservant le design Expo UI

Le système d'authentification est maintenant intégré dans votre projet Expo UI Playground ! 🎉
