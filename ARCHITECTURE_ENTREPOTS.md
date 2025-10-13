# 🏢 Architecture Professionnelle des Entrepôts

## ✅ **Système Complet Implémenté !**

Basé sur les **meilleures pratiques de l'industrie** (WMS - Warehouse Management Systems), voici l'architecture professionnelle mise en place.

---

## 📊 **Architecture de Données**

### **1. Locations (Emplacements)** 🏢
```typescript
// Collection Firebase: locations
{
  id: "location-001",                           // ID Firebase (= ID local après sync)
  name: "Entrepôt Central",                     // Nom de l'emplacement
  address: "123 Rue Principale, Bamako",        // Adresse complète
  location_type: "warehouse",                   // warehouse | store | supplier
  contact_person: "Jean Dupont",                // Contact (optionnel)
  phone: "+223 XX XX XX XX",                    // Téléphone (optionnel)
  is_active: true,                              // Actif ou non
  created_at: "...",
  updated_at: "...",
  sync_status: "synced",
  firebase_id: "location-001"
}
```

**Types d'emplacements :**
- 🏢 **Warehouse (Entrepôt)** : Stockage principal
- 🏪 **Store (Magasin)** : Point de vente
- 📦 **Supplier (Fournisseur)** : Source d'approvisionnement

---

### **2. Inventory (Inventaire par Emplacement)** 📦
```typescript
// Collection Firebase: inventory
{
  id: "inventory-001",
  product_id: "product-123",                    // Produit
  location_id: "location-001",                  // Emplacement
  quantity_available: 500,                      // Quantité disponible
  quantity_reserved: 0,                         // Quantité réservée
  quantity_min: 50,                             // Seuil minimum (alerte)
  quantity_max: 5000,                           // Capacité maximum
  last_movement_date: "2025-10-09...",
  last_movement_type: "initial",                // initial | transfer | sale | purchase
  created_at: "...",
  updated_at: "...",
  sync_status: "synced",
  firebase_id: "inventory-001"
}
```

---

### **3. Transfers (Transferts - Futur)** 🔄
```typescript
// Collection Firebase: transfers (optionnel pour l'instant)
{
  id: "transfer-001",
  from_location_id: "location-001",             // Entrepôt source
  to_location_id: "location-002",               // Magasin destination
  product_id: "product-123",
  quantity: 50,
  transfer_date: "2025-10-09...",
  status: "completed",                          // pending | completed | cancelled
  notes: "Réapprovisionnement urgent",
  created_by: "user-123",
  sync_status: "synced"
}
```

---

## 🗂️ **Structure de Navigation**

```
app/
├── accueil/        → Tableau de bord
├── articles/       → Gestion des produits
├── stock/          → Stock magasin (vue simplifiée)
├── entrepots/      → Gestion des emplacements (NOUVEAU)
│   ├── _layout.tsx
│   ├── index.tsx   → Liste des entrepôts
│   └── [id].tsx    → Détails + Inventaire d'un entrepôt
├── ventes/         → Point de vente
└── parametres/     → Paramètres
```

---

## 🎯 **Fonctionnalités Implémentées**

### **Page Liste Entrepôts** (`app/entrepots/index.tsx`)

#### **Interface :**
```
┌─────────────────────────────────────────┐
│ Entrepôts                          🔍   │
│ Gestion des emplacements                │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐  │
│ │ 🏢 Entrepôt Central                │  │
│ │ 📍 123 Rue Principale, Bamako      │  │
│ │ 👤 Jean Dupont                     │  │
│ │ ─────────────────────────────────  │  │
│ │  15 Produits | 2.5M FCFA | 3 ⚠️   │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ 🏪 Magasin Principal               │  │
│ │ 📍 456 Avenue du Commerce          │  │
│ │ ─────────────────────────────────  │  │
│ │  8 Produits | 850K FCFA | 2 ⚠️    │  │
│ └───────────────────────────────────┘  │
│                                    [+]  │ ← FAB Button
└─────────────────────────────────────────┘
```

#### **Fonctionnalités :**
- ✅ Liste de tous les emplacements
- ✅ Stats par emplacement (produits, valeur, alertes)
- ✅ Icônes colorées par type
- ✅ Indicateur de synchronisation
- ✅ Recherche par nom ou adresse
- ✅ Bouton FAB pour créer

---

### **Modale Création Emplacement**

```
┌─────────────────────────────────────┐
│ 🏢 Nouvel Emplacement          [X]  │
├─────────────────────────────────────┤
│ Nom de l'emplacement *              │
│ [Entrepôt Central]                  │
│                                     │
│ Adresse *                           │
│ [123 Rue de la Paix, Bamako]        │
│                                     │
│ Type d'emplacement *                │
│ [🏢 Entrepôt] [🏪 Magasin] [📦 Fournisseur]
│                                     │
│ Personne de contact (optionnel)     │
│ [Jean Dupont]                       │
│                                     │
│ Téléphone (optionnel)               │
│ [+223 XX XX XX XX]                  │
│                                     │
│ [Annuler]  [Créer l'Emplacement]    │
└─────────────────────────────────────┘
```

#### **Synchronisation Offline-First :**
1. **Mode Online** :
   - ✅ Crée d'abord dans Firebase
   - ✅ Récupère l'ID Firebase
   - ✅ Crée localement avec cet ID
   - ✅ ID local = ID Firebase

2. **Mode Offline** :
   - ✅ Crée localement avec ID généré
   - ✅ Ajoute à la sync_queue
   - ✅ Synchronise quand online
   - ✅ ID remplacé par ID Firebase

---

### **Page Détails Entrepôt** (`app/entrepots/[id].tsx`)

#### **Interface :**
```
┌─────────────────────────────────────────┐
│ ← Détails Entrepôt                      │
├─────────────────────────────────────────┤
│        🏢 Entrepôt Central               │
│    📍 123 Rue Principale, Bamako        │
│    👤 Jean Dupont                        │
│    📞 +223 XX XX XX XX                   │
├─────────────────────────────────────────┤
│  15 Produits | 2.5M FCFA | 3 Alertes   │
├─────────────────────────────────────────┤
│ Inventaire                    + Ajouter │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ Produit A                          │  │
│ │ SKU-12345                          │  │
│ │ ─────────────────────────────────  │  │
│ │ Disponible: 500 | Réservé: 0       │  │
│ │ Min/Max: 50 / 5000                 │  │
│ │ [🗑️ Retirer]                       │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### **Fonctionnalités :**
- ✅ Informations détaillées de l'emplacement
- ✅ Statistiques (produits, valeur, alertes)
- ✅ Liste de l'inventaire de cet emplacement
- ✅ Ajouter des produits à l'inventaire
- ✅ Retirer des produits
- ✅ Synchronisation offline-first

---

### **Modale Ajout Produit à l'Inventaire**

```
┌─────────────────────────────────────┐
│ 📦 Ajouter un Produit          [X]  │
├─────────────────────────────────────┤
│ Produit *                           │
│ ┌─────────────────────────────────┐ │
│ │ Produit A - SKU-12345           │ │ ← Sélectionnable
│ │ Produit B - SKU-67890           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quantité Initiale *                 │
│ [100]                               │
│                                     │
│ Seuil Minimum (Alerte)              │
│ [10]                                │
│                                     │
│ Capacité Maximum                    │
│ [1000]                              │
│                                     │
│ [Annuler]  [Ajouter]                │
└─────────────────────────────────────┘
```

---

## 🔄 **Flux de Travail Complet**

### **Scénario : Création d'un Entrepôt et Ajout de Produits**

#### **Étape 1 : Créer un Emplacement**
1. Aller sur **Entrepôts**
2. Cliquer sur le bouton **+**
3. Remplir le formulaire :
   - Nom : "Entrepôt Central"
   - Adresse : "123 Rue Principale, Bamako"
   - Type : Entrepôt
4. Cliquer sur **"Créer l'Emplacement"**

**Résultat :**
- ✅ Emplacement créé dans Firebase (si online)
- ✅ ID Firebase utilisé comme ID local
- ✅ Emplacement affiché dans la liste

#### **Étape 2 : Ajouter des Produits à l'Entrepôt**
1. Cliquer sur **"Entrepôt Central"**
2. Cliquer sur **"+ Ajouter"**
3. Sélectionner **"Produit A"**
4. Saisir **Quantité : 500**
5. Cliquer sur **"Ajouter"**

**Résultat :**
- ✅ Inventaire créé dans Firebase (si online)
- ✅ ID Firebase utilisé comme ID local
- ✅ Produit affiché dans l'inventaire de l'entrepôt

#### **Étape 3 : Réapprovisionner le Magasin (depuis Stock)**
1. Aller sur **Stock**
2. Cliquer sur **"📦 Réapprovisionner"**
3. Sélectionner un produit en stock faible
4. Choisir la quantité à transférer
5. Confirmer le transfert

**Résultat :**
- ✅ Quantité retirée de l'entrepôt
- ✅ Quantité ajoutée au stock magasin
- ✅ Synchronisé avec Firebase

---

## 📱 **Mode Offline-First**

### **Création en Mode Offline :**

```typescript
// Mode OFFLINE
┌──────────────────────┐
│ 1. Créer localement  │ → ID local: id-abc-xyz
│    avec ID généré    │
├──────────────────────┤
│ 2. Ajouter à         │ → sync_queue: {table: 'locations', 
│    sync_queue        │                operation: 'create'}
└──────────────────────┘

// Mode ONLINE (après reconnexion)
┌──────────────────────┐
│ 3. Synchronisation   │ → Firebase crée: location-firebase-123
│    automatique       │
├──────────────────────┤
│ 4. Remplacement ID   │ → Supprime id-abc-xyz
│                      │ → Crée avec location-firebase-123
├──────────────────────┤
│ 5. ID cohérent       │ → ID local = ID Firebase ✅
└──────────────────────┘
```

---

## 🚀 **Utilisation du Système**

### **1️⃣ Créer un Entrepôt**

**Navigation :**
```
Accueil → Entrepôts → [+] → Formulaire de création
```

**Formulaire :**
- ✅ **Nom** : Ex: "Entrepôt Central" (requis)
- ✅ **Adresse** : Ex: "123 Rue..., Bamako" (requis, saisie manuelle)
- ✅ **Type** : Entrepôt / Magasin / Fournisseur (requis)
- ✅ **Contact** : Ex: "Jean Dupont" (optionnel)
- ✅ **Téléphone** : Ex: "+223..." (optionnel)

**Validation :**
- ❌ Nom vide → Erreur
- ❌ Adresse vide → Erreur
- ✅ Contact et téléphone optionnels

---

### **2️⃣ Ajouter des Produits à l'Entrepôt**

**Navigation :**
```
Entrepôts → Cliquer sur un entrepôt → [+ Ajouter]
```

**Sélection Produit :**
- Liste des produits **non encore** dans cet emplacement
- Produits déjà présents = cachés

**Formulaire :**
- ✅ **Produit** : Sélection dans la liste (requis)
- ✅ **Quantité Initiale** : Ex: 100 (requis)
- ✅ **Seuil Minimum** : Ex: 10 (alerte si en-dessous)
- ✅ **Capacité Maximum** : Ex: 1000

---

### **3️⃣ Réapprovisionner le Magasin**

**Navigation :**
```
Stock → [📦 Réapprovisionner] → Modale
```

**Fonctionnement :**
1. Affiche les produits en **stock faible ou rupture**
2. Pour chaque produit :
   - 🏪 Stock magasin actuel
   - 🏢 Stock entrepôt disponible
3. Sélectionner les produits à transférer
4. Saisir les quantités
5. Confirmer le transfert

**Opérations :**
- ⬇️ Réduit l'inventaire de l'entrepôt
- ⬆️ Augmente le stock du magasin
- 🔄 Synchronise avec Firebase

---

## 📊 **Avantages de cette Architecture**

### **✅ Séparation Claire**
- Emplacements = Entités indépendantes
- Inventaire = Stock par emplacement
- Pas de confusion entre entrepôt et magasin

### **✅ Scalabilité**
- Multi-entrepôts facile
- Multi-magasins supporté
- Ajout de fournisseurs possible

### **✅ Traçabilité**
- Chaque mouvement tracé
- Historique complet (avec transfers)
- Audit possible

### **✅ Alertes à Deux Niveaux**
- 🏪 **Stock magasin faible** → Réapprovisionner depuis entrepôt
- 🏢 **Stock entrepôt faible** → Commander au fournisseur

### **✅ Offline-First Complet**
- Création offline supportée
- Synchronisation automatique
- IDs cohérents partout

---

## 🔧 **Synchronisation Offline-First**

### **Collections Synchronisées :**
- ✅ `locations` (emplacements)
- ✅ `inventory` (inventaire par emplacement)
- ✅ `transfers` (transferts - futur)

### **Opérations Supportées :**
- ✅ **CREATE** : Création avec ID Firebase si online
- ✅ **UPDATE** : Mise à jour synchronisée
- ✅ **DELETE** : Suppression synchronisée

### **Gestion des IDs :**
```typescript
// Mode Online
Location créée → Firebase ID: abc123
                → Local ID: abc123 (identique)

// Mode Offline
Location créée → Local ID: id-xyz-123
                → Queue: {table: 'locations', operation: 'create'}
                → Online → Firebase ID: abc123
                → Local ID remplacé: abc123
```

---

## 📋 **Règles Firestore Déployées**

```javascript
// firestore.rules
match /locations/{document} {
  allow read, write: if true;  // Développement
}

match /inventory/{document} {
  allow read, write: if true;  // Développement
}
```

---

## 🧪 **Comment Tester**

### **Test 1 : Créer un Entrepôt en Mode Online**
1. S'assurer d'être connecté (mode online activé)
2. Aller sur **Entrepôts**
3. Cliquer sur **[+]**
4. Remplir :
   - Nom: "Test Entrepôt"
   - Adresse: "Bamako, Mali"
   - Type: Entrepôt
5. Cliquer sur **"Créer l'Emplacement"**
6. **Vérifier dans Firebase Console** :
   - Collection `locations`
   - Document créé avec un ID court (ex: `abc123XYZ`)
7. **Vérifier localement** :
   - L'ID affiché est le même que dans Firebase

### **Test 2 : Créer un Entrepôt en Mode Offline**
1. Activer le **mode test offline**
2. Créer un emplacement (même processus)
3. **Vérifier** :
   - ID local généré (ex: `id-mgj-abc`)
   - Opération dans `sync_queue`
4. **Repasser en mode online**
5. **Vérifier** :
   - Synchronisation automatique
   - ID local remplacé par ID Firebase
   - Document dans Firebase

### **Test 3 : Ajouter un Produit à l'Entrepôt**
1. Cliquer sur un entrepôt
2. Cliquer sur **"+ Ajouter"**
3. Sélectionner un produit
4. Saisir quantité: 100
5. Cliquer sur **"Ajouter"**
6. **Vérifier** :
   - Produit affiché dans l'inventaire
   - Synchronisé avec Firebase

---

## 📝 **Logs Attendus**

### **Création Emplacement (Online)**
```
LOG  🚀 [FIREBASE DEBUG] Début createLocation
LOG  ✅ [FIREBASE DEBUG] Emplacement créé dans Firestore: abc123XYZ
LOG  ✅ Emplacement créé avec ID Firebase: abc123XYZ
LOG  🏢 1 emplacements chargés
```

### **Création Inventaire (Online)**
```
LOG  🚀 [FIREBASE DEBUG] Début createInventory
LOG  ✅ [FIREBASE DEBUG] Inventaire créé dans Firestore: def456ABC
LOG  ✅ Inventaire créé avec ID Firebase: def456ABC
LOG  📦 1 produits dans l'emplacement
```

### **Synchronisation Offline → Online**
```
LOG  📤 Envoi create pour locations:id-mgj-abc
LOG  ✅ Emplacement créé dans Firebase: xyz789
LOG  🗑️ [ID SYNC] Ancien emplacement local supprimé: id-mgj-abc
LOG  ✅ [ID SYNC] Emplacement recréé avec ID Firebase: xyz789
```

---

## 🎯 **Prochaines Étapes**

Le système est maintenant **complet et fonctionnel**. Vous pouvez :

1. **Créer des emplacements** (entrepôts, magasins)
2. **Ajouter des produits** à chaque emplacement
3. **Réapprovisionner le magasin** depuis l'entrepôt
4. **Tout fonctionne en mode online et offline**

### **Améliorations Futures (Optionnel) :**
- Collection `transfers` pour tracer tous les mouvements
- Rapports avancés par emplacement
- Dashboard avec graphiques
- Gestion des fournisseurs
- Commandes d'achat

**Le système est prêt à être utilisé ! 🎉**

