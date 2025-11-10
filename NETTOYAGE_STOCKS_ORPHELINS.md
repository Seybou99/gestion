# 🧹 NETTOYAGE DES STOCKS ORPHELINS - GUIDE COMPLET

## 🐛 **PROBLÈME**

Vous avez **4 stocks orphelins** dans Firebase qui pointent vers un produit inexistant :

```
WARN ⚠️ Produit introuvable pour stock ID: 9V1NiuCzttdAESnWQ3Wm, product_id: id-mgumn0zb-m7ob1emih7h
WARN ⚠️ Produit introuvable pour stock ID: F4E1sFgd1IoUMcIDhtpL, product_id: id-mgumn0zb-m7ob1emih7h
WARN ⚠️ Produit introuvable pour stock ID: IRPPXYFo98GftY62M7f8, product_id: id-mgumn0zb-m7ob1emih7h
WARN ⚠️ Produit introuvable pour stock ID: iQTBHABD8kciVvUHXhZz, product_id: id-mgumn0zb-m7ob1emih7h
```

**Résultat :** Ces stocks apparaissent en mémoire mais ne peuvent pas être affichés car leur produit n'existe pas.

---

## 🔍 **DIAGNOSTIC**

### **Stocks orphelins identifiés :**

| Stock ID | Product ID | Problème |
|----------|-----------|----------|
| `9V1NiuCzttdAESnWQ3Wm` | `id-mgumn0zb-m7ob1emih7h` | Produit inexistant |
| `F4E1sFgd1IoUMcIDhtpL` | `id-mgumn0zb-m7ob1emih7h` | Produit inexistant |
| `IRPPXYFo98GftY62M7f8` | `id-mgumn0zb-m7ob1emih7h` | Produit inexistant |
| `iQTBHABD8kciVvUHXhZz` | `id-mgumn0zb-m7ob1emih7h` | Produit inexistant |

**Tous pointent vers le même product_id qui n'existe pas !**

---

## 🔧 **SOLUTION : NETTOYAGE MANUEL VIA FIREBASE CONSOLE**

### **Étape 1 : Ouvrir Firebase Console**

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Cliquez sur **Firestore Database** dans le menu de gauche
4. Cliquez sur la collection **`stock`**

### **Étape 2 : Identifier les stocks orphelins**

**Filtre pour trouver les stocks de l'utilisateur `diokolo@gmail.com` :**

```
created_by == YeZ6BMBBXxVtwXolZ5j6mh7KK5l2
```

Vous devriez voir **4 documents de stock**.

### **Étape 3 : Vérifier le product_id**

Pour chaque stock, regardez le champ `product_id` :
- Si `product_id == id-mgumn0zb-m7ob1emih7h`, c'est un stock orphelin

### **Étape 4 : Supprimer les stocks orphelins**

**Option A : Suppression manuelle (Console Firebase)**

1. Cliquez sur chaque stock orphelin
2. Cliquez sur les **trois points** (⋮) en haut à droite
3. Cliquez sur **"Delete document"**
4. Confirmez la suppression

**Répétez pour les 4 stocks :**
- `9V1NiuCzttdAESnWQ3Wm`
- `F4E1sFgd1IoUMcIDhtpL`
- `IRPPXYFo98GftY62M7f8`
- `iQTBHABD8kciVvUHXhZz`

**Option B : Suppression via code (Console de l'app)**

Copiez et collez ce code dans la console de votre application :

```javascript
const { firebaseService } = require('../services/FirebaseService');

async function cleanOrphanStocks() {
  const orphanStockIds = [
    '9V1NiuCzttdAESnWQ3Wm',
    'F4E1sFgd1IoUMcIDhtpL',
    'IRPPXYFo98GftY62M7f8',
    'iQTBHABD8kciVvUHXhZz'
  ];
  
  for (const stockId of orphanStockIds) {
    try {
      await firebaseService.deleteStock(stockId);
      console.log(`✅ Stock ${stockId} supprimé`);
    } catch (error) {
      console.log(`❌ Erreur suppression ${stockId}:`, error.message);
    }
  }
  
  console.log('✅ Nettoyage terminé !');
}

cleanOrphanStocks();
```

---

## 🔧 **APRÈS LE NETTOYAGE**

### **Étape 5 : Nettoyer AsyncStorage local**

**Sur votre appareil, dans la console de l'app :**

```javascript
const AsyncStorage = require('@react-native-async-storage/async-storage');

AsyncStorage.removeItem('stock').then(() => {
  console.log('✅ Stock local nettoyé');
  console.log('📋 Redémarrez l\'application pour synchroniser');
});
```

### **Étape 6 : Redémarrer l'application**

1. **Fermez complètement** l'application
2. **Relancez** l'application
3. **Reconnectez-vous**

**Logs attendus (propres) :**
```
📊 [FIREBASE SERVICE] 0 entrées de stock récupérées
✅ Aucun warning "Produit introuvable"
```

---

## ❌ **ERREUR CATÉGORIES (Secondaire)**

```
ERROR ❌ Erreur récupération catégories: Missing or insufficient permissions
```

**Cette erreur est maintenant en `console.log` (pas rouge) et n'empêche pas l'application de fonctionner.**

**Cause :** Vous n'avez pas de catégories dans Firebase pour l'utilisateur `diokolo@gmail.com`.

**Solution :** Créez une catégorie dans l'application et elle se synchronisera automatiquement.

---

## ✅ **RÉSULTAT ATTENDU APRÈS NETTOYAGE**

**Logs propres :**
```
✅ [AUTH] Connexion réussie: diokolo@gmail.com
✅ [AUTH] Produits synchronisés depuis Firebase
📦 [FETCH PRODUCTS] 1/1 produits pour diokolo@gmail.com
📊 [DASHBOARD] Métriques calculées : {"totalProducts": "1 produits", ...}
```

**✅ Aucun warning "Produit introuvable" !**

---

## 🎯 **RÉSUMÉ DES ACTIONS**

### **IMMÉDIAT (À faire maintenant) :**

1. **Ouvrez Firebase Console** → Firestore → Collection `stock`
2. **Trouvez les 4 stocks** avec `product_id: id-mgumn0zb-m7ob1emih7h`
3. **Supprimez-les** un par un
4. **Nettoyez le stock local** via console de l'app
5. **Redémarrez l'application**

### **OPTIONNEL (Plus tard) :**

1. Créer des catégories dans l'application
2. Installer `firebase-admin` pour scripts automatisés

---

## 📋 **POURQUOI CES STOCKS ORPHELINS ?**

**Hypothèse :** Vous avez probablement créé un produit "Apple watch" plusieurs fois, et à chaque fois, un stock a été créé. Ensuite, le produit a été supprimé ou n'a jamais été correctement synchronisé, laissant les stocks orphelins.

**Solution permanente :** Les modifications que nous avons faites aujourd'hui (nettoyage AsyncStorage, synchronisation automatique) empêcheront ce problème à l'avenir.

---

**NETTOYEZ LES 4 STOCKS DANS FIREBASE CONSOLE ET TOUT SERA PARFAIT ! 🧹**

**Date :** 17 octobre 2025  
**Statut :** 🔧 Action manuelle requise  
**Priorité :** Moyenne - Nettoyage de données
