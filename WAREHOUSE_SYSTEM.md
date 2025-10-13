# 🏢 Système d'Entrepôt avec Alertes

## 📋 Vue d'Ensemble

Le système d'entrepôt permet de gérer **deux niveaux de stock** :

1. **Stock Magasin** (`stock`) : Produits disponibles pour la vente
2. **Stock Entrepôt** (`warehouse`) : Réserve de produits pour réapprovisionner le magasin

---

## 🗄️ Structure de Données

### Collection `warehouse` (Entrepôt)

```typescript
{
  id: "abc123",                      // ID Firebase (identique au local après sync)
  product_id: "product-xyz",         // Référence au produit
  quantity_available: 500,           // Quantité disponible en entrepôt
  quantity_reserved: 0,              // Quantité réservée (en cours de transfert)
  warehouse_min: 50,                 // Seuil minimum (alerte si < 50)
  warehouse_max: 5000,               // Capacité maximum
  location: "Entrepôt Principal",    // Localisation
  last_restock_date: "2025-10-09",   // Dernier réapprovisionnement fournisseur
  last_transfer_date: "2025-10-09",  // Dernier transfert vers magasin
  created_at: "...",
  updated_at: "...",
  sync_status: "synced",             // pending | synced | error
  firebase_id: "abc123"              // Même que id
}
```

### Collection `stock` (Magasin - Existante)

```typescript
{
  id: "def456",
  product_id: "product-xyz",
  quantity_current: 10,              // Quantité en magasin
  quantity_min: 5,                   // Seuil minimum magasin
  quantity_max: 100,                 // Capacité maximum magasin
  last_movement_date: "...",
  last_movement_type: "transfer",    // initial | sale | transfer
  sync_status: "synced"
}
```

---

## 🔄 Flux de Réapprovisionnement

### 1️⃣ **Cliquer sur "📦 Réapprovisionner"**

```
┌─────────────────────────────────────┐
│ 📦 Réapprovisionnement               │
├─────────────────────────────────────┤
│ Sélectionnez les produits...        │
│                                      │
│ ☐ Produit A                          │
│   🏪 Magasin: 5 / 100                │
│   🏢 Entrepôt: 500 disponibles       │
│                                      │
│ ☐ Produit B                          │
│   🏪 Magasin: 0 / 50 (Rupture)       │
│   🏢 Entrepôt: 30 disponibles        │
│   ⚠️ Entrepôt faible (min: 50)      │
│                                      │
│ [Annuler] [Confirmer le Transfert]  │
└─────────────────────────────────────┘
```

### 2️⃣ **Sélectionner un Produit**

```
☑ Produit A
  🏪 Magasin: 5 / 100
  🏢 Entrepôt: 500 disponibles
  
  Quantité à transférer:
  [-10] [-] [50] [+] [+10] [MAX]
```

### 3️⃣ **Confirmer le Transfert**

**Opérations effectuées :**

1. **Réduire l'entrepôt** :
   ```typescript
   warehouse.quantity_available = 500 - 50 = 450
   ```

2. **Augmenter le stock magasin** :
   ```typescript
   stock.quantity_current = 5 + 50 = 55
   ```

3. **Ajouter à la queue de synchronisation** (offline-first) :
   ```typescript
   syncQueue.push({
     table: 'warehouse',
     operation: 'update',
     data: { quantity_available: 450 }
   });
   
   syncQueue.push({
     table: 'stock',
     operation: 'update',
     data: { quantity_current: 55 }
   });
   ```

4. **Synchroniser si online** :
   - Envoyer les modifications à Firebase
   - Remplacer les IDs locaux par les IDs Firebase

---

## 🚨 Système d'Alertes

### **Alerte Stock Magasin Faible** (Rouge)
```
⚠️ 3 produits nécessitent attention
```
- Déclenché quand : `quantity_current <= quantity_min`
- Action : Réapprovisionner depuis l'entrepôt

### **Alerte Entrepôt Faible** (Orange)
```
🏢 2 entrepôts faibles - Réapprovisionnement fournisseur nécessaire
```
- Déclenché quand : `quantity_available < warehouse_min`
- Action : Commander auprès du fournisseur

---

## 📱 Mode Offline-First

### **Scénario : Transfert en Mode Offline**

1. **Utilisateur fait un transfert sans internet**
   - ✅ Entrepôt réduit localement
   - ✅ Stock magasin augmenté localement
   - ✅ Opérations ajoutées à la `sync_queue`

2. **Utilisateur repasse en ligne**
   - ✅ Synchronisation automatique déclenchée
   - ✅ Entrepôt mis à jour dans Firebase
   - ✅ Stock mis à jour dans Firebase
   - ✅ IDs locaux remplacés par IDs Firebase

3. **Résultat**
   - ✅ Données cohérentes partout
   - ✅ Aucune perte de données
   - ✅ IDs identiques (local = Firebase)

---

## 🎯 Fonctionnalités Implémentées

### ✅ **Gestion Entrepôt**
- [x] Collection `warehouse` dans Firebase
- [x] Interface `Warehouse` dans DatabaseService
- [x] Méthodes CRUD Firebase (create, get, update, delete)
- [x] Règles Firestore déployées

### ✅ **Modale de Réapprovisionnement**
- [x] Liste des produits en stock faible/rupture
- [x] Cases à cocher pour sélection
- [x] Affichage stock magasin + stock entrepôt
- [x] Contrôles de quantité (-10, -1, input, +1, +10, MAX)
- [x] Validation et confirmation

### ✅ **Logique de Transfert**
- [x] Réduction de `warehouse.quantity_available`
- [x] Augmentation de `stock.quantity_current`
- [x] Vérification stock entrepôt suffisant
- [x] Gestion des erreurs par produit
- [x] Récapitulatif après transfert

### ✅ **Système d'Alertes**
- [x] Alerte stock magasin faible (rouge)
- [x] Alerte entrepôt faible (orange)
- [x] Compteur d'alertes
- [x] Affichage dans la modale

### ✅ **Synchronisation Offline-First**
- [x] Support `warehouse` dans SyncService
- [x] Opérations CREATE, UPDATE, DELETE
- [x] Remplacement ID local par ID Firebase
- [x] Queue de synchronisation
- [x] Gestion des erreurs

---

## 🧪 Test du Système

### **Test 1 : Créer un Entrepôt**
```typescript
import { initializeWarehouse } from './services/DatabaseService';

// Créer un entrepôt pour un produit
await initializeWarehouse('product-123', 1000);
// Résultat: Entrepôt avec 1000 unités disponibles
```

### **Test 2 : Réapprovisionner en Mode Online**
1. Aller sur la page Stock
2. Cliquer sur "📦 Réapprovisionner"
3. Sélectionner un produit en stock faible
4. Saisir la quantité (ex: 50)
5. Cliquer sur "Confirmer le Transfert"
6. Vérifier :
   - Stock magasin augmenté
   - Entrepôt réduit
   - Firebase mis à jour

### **Test 3 : Réapprovisionner en Mode Offline**
1. Activer le mode test offline
2. Faire un transfert (même processus)
3. Vérifier :
   - Modifications locales effectuées
   - Opérations dans `sync_queue`
4. Repasser en mode online
5. Vérifier :
   - Synchronisation automatique
   - Firebase mis à jour

---

## 📊 Logs Attendus

### **Transfert Réussi**
```
LOG  🏢 2 entrées d'entrepôt chargées
LOG  🔍 [STOCK UPDATE] Recherche stock par product_id: product-xyz
LOG  ✅ [STOCK UPDATE] Stock trouvé dans Firebase: abc123
LOG  ✅ Transfert réussi: 50 unités de Produit A
LOG  ✅ Entrepôt mis à jour dans Firebase: def456
LOG  ✅ Stock mis à jour dans Firebase pour product_id: product-xyz
```

### **Alerte Entrepôt Faible**
```
LOG  🏢 2 entrées d'entrepôt chargées
LOG  ⚠️ Entrepôt faible pour Produit B: 30 < 50 (min)
```

---

## 🎯 Prochaines Étapes (Optionnel)

### **Améliorations Possibles**
1. **Page Entrepôt dédiée** : Gérer les entrepôts séparément
2. **Commandes fournisseurs** : Réapprovisionner l'entrepôt
3. **Multi-entrepôts** : Plusieurs localisations
4. **Historique des transferts** : Traçabilité complète
5. **Rapports avancés** : Analyse des mouvements

---

## ✅ Système Complet et Fonctionnel !

Le système d'entrepôt est maintenant **opérationnel** avec :
- ✅ Gestion séparée entrepôt/magasin
- ✅ Réapprovisionnement sélectif
- ✅ Alertes à deux niveaux
- ✅ Synchronisation offline-first
- ✅ IDs cohérents (local = Firebase)

