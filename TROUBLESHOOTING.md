# 🔧 GUIDE DE DÉPANNAGE

## ❌ Erreur: "Config file contains no configuration data"

### **Cause**
Cette erreur survient quand le cache de Metro Bundler est corrompu ou désynchronisé avec la configuration Firebase.

### **Solution Rapide** ✅

```bash
# 1. Nettoyer le cache et redémarrer
npx expo start --clear

# OU

# 2. Nettoyer complètement
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

---

## ❌ Erreur: "Network request failed"

### **Cause**
L'adresse IP du backend ne correspond pas à votre réseau local actuel.

### **Solution** ✅

1. **Trouver votre IP locale :**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Ou utilisez le script fourni
bash scripts/get-ip.sh
```

2. **Mettre à jour `/services/api.ts` :**
```typescript
const API_BASE_URL = 'http://VOTRE_IP:3000';
const fallbackUrls = [
  'http://localhost:3000',
  'http://VOTRE_IP:3000',
];
```

3. **Redémarrer le backend :**
```bash
cd Backend
npm start
```

---

## ❌ Erreur: "Module not found"

### **Solution** ✅

```bash
# Nettoyer et réinstaller
rm -rf node_modules
rm package-lock.json
npm install
```

---

## ❌ Erreur: Firebase "Missing or insufficient permissions"

### **Cause**
Les règles Firestore sont trop restrictives pour le développement.

### **Solution Temporaire** ✅

Dans `firestore.rules`, utilisez les règles permissives pour le développement :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // DÉVELOPPEMENT UNIQUEMENT
    }
  }
}
```

**⚠️ IMPORTANT** : En production, utilisez les règles sécurisées dans `firestore.rules.production`

### **Déployer les règles :**
```bash
firebase deploy --only firestore:rules
```

---

## ❌ L'application ne se met pas à jour

### **Solution** ✅

1. **Sur le téléphone :**
   - Secouer le téléphone
   - Appuyer sur "Reload"

2. **OU, redémarrer complètement :**
```bash
# Tuer tous les processus
lsof -ti:8081 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Nettoyer
npx expo start --clear
```

---

## ❌ "Produit inconnu" ou "Magasin Principal" apparaissent

### **Cause**
Données de test en cache dans AsyncStorage.

### **Solution** ✅

**Option 1 - Dans l'app :**
1. Aller dans Entrepôts
2. Utiliser le bouton "🗑️ Tout supprimer" (si disponible)

**Option 2 - Depuis le code :**
```bash
# Utiliser le script de nettoyage
node scripts/clear-storage.js
```

**Option 3 - Réinitialisation complète :**
- Sur iOS : Supprimer et réinstaller l'app Expo Go
- Sur Android : Vider le cache d'Expo Go dans les paramètres

---

## 🔥 Commandes Utiles

### **Redémarrage Complet**
```bash
# Tout arrêter
lsof -ti:8081,3000 | xargs kill -9

# Nettoyer
rm -rf node_modules/.cache .expo

# Redémarrer
npm start
cd Backend && npm start &
```

### **Voir les logs en temps réel**
```bash
# Frontend
npx expo start

# Backend
cd Backend && npm start

# Logs Firebase (si déployé)
firebase functions:log --only <function-name>
```

### **Tester la connexion réseau**
```bash
# Depuis votre ordinateur
curl http://localhost:3000/health

# Depuis votre téléphone (remplacer par votre IP)
curl http://192.168.8.120:3000/health
```

---

## 📱 Problèmes Spécifiques Expo Go

### **"Unable to resolve module"**
```bash
npx expo install <package-name>
```

### **"Invariant Violation: Module AppRegistry is not a registered callable module"**
```bash
watchman watch-del-all
rm -rf node_modules
npm install
npx expo start --clear
```

---

## 🆘 Réinitialisation Totale (Dernier Recours)

```bash
# 1. Arrêter tout
lsof -ti:8081,3000 | xargs kill -9

# 2. Nettoyer tout
rm -rf node_modules
rm -rf Backend/node_modules
rm -rf .expo
rm -rf node_modules/.cache
rm package-lock.json
rm Backend/package-lock.json

# 3. Réinstaller
npm install
cd Backend && npm install && cd ..

# 4. Redémarrer
npx expo start --clear
cd Backend && npm start &
```

---

## 📞 Contacts Utiles

- **Documentation Expo**: https://docs.expo.dev
- **Firebase Console**: https://console.firebase.google.com
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/expo

---

## ✅ Checklist de Démarrage

Avant de commencer à développer :

- [ ] Backend démarré (`cd Backend && npm start`)
- [ ] Frontend démarré (`npm start`)
- [ ] IP locale à jour dans `services/api.ts`
- [ ] Téléphone sur le même réseau WiFi
- [ ] Pas d'erreurs dans la console
- [ ] Test de connexion réussi

---

**💡 Astuce** : Gardez toujours un terminal ouvert pour le backend et un pour le frontend pour voir les logs en temps réel !

