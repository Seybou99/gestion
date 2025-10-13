# 🏢 Guide Complet du Système d'Entrepôts

## 🎯 **Vue d'Ensemble**

Vous disposez maintenant d'un **système professionnel de gestion d'entrepôts** basé sur les standards de l'industrie (WMS - Warehouse Management Systems).

---

## 📊 **Concept Clé : Séparation des Emplacements**

### **Avant (Ancien Système)**
```
Stock unique par produit
❌ Pas de distinction entrepôt/magasin
❌ Difficile de gérer plusieurs localisations
```

### **Maintenant (Nouveau Système)**
```
Emplacements séparés
✅ Entrepôts, Magasins, Fournisseurs distincts
✅ Inventaire par emplacement
✅ Transferts entre emplacements
```

---

## 🗂️ **Architecture de Données**

### **1. LOCATIONS (Emplacements)**

**Qu'est-ce qu'un emplacement ?**
- Un **lieu physique** où sont stockés des produits
- Peut être : Entrepôt, Magasin, ou Fournisseur

**Exemple :**
```
📍 Entrepôt Central
   📍 123 Rue Principale, Bamako
   👤 Jean Dupont
   📞 +223 XX XX XX XX
```

---

### **2. INVENTORY (Inventaire)**

**Qu'est-ce que l'inventaire ?**
- Le **stock d'un produit** dans un **emplacement spécifique**

**Exemple :**
```
Produit A existe dans :
├── 🏢 Entrepôt Central : 500 unités
├── 🏪 Magasin Principal : 10 unités
└── 🏪 Magasin Secondaire : 5 unités
```

Chaque ligne = 1 entrée d'inventaire

---

## 🚀 **Guide d'Utilisation Pas à Pas**

### **ÉTAPE 1 : Créer votre Premier Entrepôt**

1. **Ouvrir l'application**
2. **Aller sur l'onglet "Entrepôts"** (navigation du bas)
3. **Cliquer sur le bouton [+]** (en bas à droite)
4. **Remplir le formulaire :**

```
┌─────────────────────────────────────┐
│ Nom: Entrepôt Central               │ ← Requis
│ Adresse: 123 Rue..., Bamako        │ ← Requis (saisie manuelle)
│ Type: [🏢 Entrepôt]                 │ ← Sélectionner
│ Contact: Jean Dupont                │ ← Optionnel
│ Téléphone: +223...                  │ ← Optionnel
└─────────────────────────────────────┘
```

5. **Cliquer sur "Créer l'Emplacement"**

**Résultat :**
- ✅ Entrepôt créé dans Firebase (si online)
- ✅ ID Firebase = ID local
- ✅ Visible dans la liste

---

### **ÉTAPE 2 : Ajouter des Produits à l'Entrepôt**

1. **Dans la liste des entrepôts**, cliquer sur **"Entrepôt Central"**
2. **Page de détails s'ouvre**
3. **Cliquer sur "+ Ajouter"** (en haut à droite de "Inventaire")
4. **Sélectionner un produit** dans la liste
5. **Remplir les quantités :**

```
┌─────────────────────────────────────┐
│ Produit: Produit A ✓                │
│ Quantité Initiale: 500              │
│ Seuil Minimum: 50                   │ ← Alerte si < 50
│ Capacité Maximum: 5000              │
└─────────────────────────────────────┘
```

6. **Cliquer sur "Ajouter"**

**Résultat :**
- ✅ Produit ajouté à l'inventaire de l'entrepôt
- ✅ 500 unités disponibles
- ✅ Synchronisé avec Firebase

---

### **ÉTAPE 3 : Créer un Magasin**

**Même processus qu'un entrepôt :**

1. Onglet **"Entrepôts"** → **[+]**
2. Remplir :
   - Nom : "Magasin Principal"
   - Adresse : "456 Avenue du Commerce, Bamako"
   - Type : **[🏪 Magasin]**
3. Créer

---

### **ÉTAPE 4 : Ajouter des Produits au Magasin**

1. Cliquer sur **"Magasin Principal"**
2. **"+ Ajouter"**
3. Sélectionner **"Produit A"**
4. Quantité : **10** (stock initial magasin)
5. Ajouter

**Résultat Actuel :**
```
Produit A :
├── 🏢 Entrepôt Central : 500 unités
└── 🏪 Magasin Principal : 10 unités
```

---

### **ÉTAPE 5 : Réapprovisionner le Magasin depuis l'Entrepôt**

1. Aller sur **"Stock"**
2. **Vendre des produits** jusqu'à ce que le stock magasin soit faible
3. **Cliquer sur "📦 Réapprovisionner"**
4. **Modale s'ouvre** :

```
┌─────────────────────────────────────┐
│ ☑ Produit A                          │
│   🏪 Magasin: 3 / 100 (Stock faible) │
│   🏢 Entrepôt: 500 disponibles       │
│                                      │
│   Quantité à transférer:             │
│   [-10] [-] [50] [+] [+10] [MAX]    │
└─────────────────────────────────────┘
```

5. **Saisir la quantité** : 50
6. **"Confirmer le Transfert"**

**Résultat :**
```
Produit A :
├── 🏢 Entrepôt Central : 450 unités (500 - 50)
└── 🏪 Magasin Principal : 53 unités (3 + 50)
```

---

## 🔄 **Synchronisation Offline-First**

### **Scénario : Créer un Entrepôt SANS Internet**

```
Mode OFFLINE activé
        ↓
1. Créer "Entrepôt Nord"
   → ID local: id-mgj-abc123
   → Sauvegardé localement
   → Ajouté à sync_queue
        ↓
2. Ajouter "Produit B" (200 unités)
   → ID local: id-mgj-def456
   → Sauvegardé localement
   → Ajouté à sync_queue
        ↓
3. Continuer à travailler...
        ↓
Mode ONLINE (reconnexion)
        ↓
4. Synchronisation automatique
   → Entrepôt créé dans Firebase: loc-xyz789
   → ID local remplacé: loc-xyz789
   → Inventaire créé dans Firebase: inv-abc123
   → ID local remplacé: inv-abc123
        ↓
5. Résultat: ID local = ID Firebase ✅
```

---

## 🚨 **Système d'Alertes**

### **Alerte Niveau 1 : Stock Magasin Faible** (Rouge)
```
⚠️ 3 produits nécessitent attention
```
- **Quand ?** Stock magasin < seuil minimum
- **Action ?** Réapprovisionner depuis l'entrepôt

### **Alerte Niveau 2 : Stock Entrepôt Faible** (Orange)
```
🏢 2 entrepôts faibles - Réapprovisionnement fournisseur nécessaire
```
- **Quand ?** Stock entrepôt < seuil minimum
- **Action ?** Commander auprès du fournisseur

---

## 📱 **Différences entre les Pages**

### **Page "Stock"** (Vue Magasin)
- Affiche le **stock du magasin principal** uniquement
- Vue simplifiée pour les ventes
- Bouton réapprovisionnement (transfert depuis entrepôt)

### **Page "Entrepôts"** (Vue Globale)
- Affiche **tous les emplacements**
- Gestion complète des inventaires
- Création/modification des emplacements
- Vue détaillée par emplacement

---

## 🎯 **Cas d'Usage Typiques**

### **Cas 1 : Nouvelle Boutique**
1. Créer un emplacement "Magasin Principal" (type: Magasin)
2. Créer un emplacement "Entrepôt Central" (type: Entrepôt)
3. Ajouter des produits à l'entrepôt (grandes quantités)
4. Ajouter des produits au magasin (petites quantités)
5. Réapprovisionner le magasin depuis l'entrepôt quand nécessaire

### **Cas 2 : Multi-Magasins**
1. 1 Entrepôt Central
2. 3 Magasins (Nord, Sud, Centre)
3. Chaque magasin a son propre inventaire
4. Réapprovisionner chaque magasin indépendamment

### **Cas 3 : Gestion Fournisseurs**
1. Créer des emplacements de type "Fournisseur"
2. Suivre les produits disponibles chez chaque fournisseur
3. Créer des transferts (fournisseur → entrepôt)

---

## 📊 **Collections Firebase**

```
gestion-94304 (Firebase)
├── locations
│   ├── loc-001 (Entrepôt Central)
│   ├── loc-002 (Magasin Principal)
│   └── loc-003 (Fournisseur ABC)
│
├── inventory
│   ├── inv-001 (Produit A @ Entrepôt: 500)
│   ├── inv-002 (Produit A @ Magasin: 10)
│   ├── inv-003 (Produit B @ Entrepôt: 200)
│   └── inv-004 (Produit B @ Magasin: 5)
│
├── products (existant)
├── stock (existant - à migrer progressivement)
├── sales (existant)
└── customers (existant)
```

---

## ⚠️ **Migration Progressive**

### **Coexistence des Systèmes**

Pour l'instant, **deux systèmes coexistent** :

1. **Ancien système `stock`** :
   - Utilisé dans la page "Stock"
   - Stock unique par produit
   - Fonctionnel pour les ventes

2. **Nouveau système `locations + inventory`** :
   - Utilisé dans la page "Entrepôts"
   - Stock par emplacement
   - Plus flexible et professionnel

### **Migration Future (Optionnel)**

Pour migrer complètement vers le nouveau système :

1. Créer un emplacement "Magasin Principal"
2. Migrer les données de `stock` vers `inventory`
3. Mettre à jour la page "Stock" pour utiliser `inventory`
4. Supprimer la collection `stock`

**Pour l'instant, les deux systèmes fonctionnent en parallèle.**

---

## ✅ **Système Complet et Opérationnel !**

Vous pouvez maintenant :

1. ✅ **Créer des entrepôts** avec nom et adresse
2. ✅ **Ajouter des produits** à chaque entrepôt
3. ✅ **Gérer plusieurs emplacements** (entrepôts, magasins)
4. ✅ **Réapprovisionner** le magasin depuis l'entrepôt
5. ✅ **Tout fonctionne en mode offline et online**
6. ✅ **IDs cohérents** (local = Firebase)

**Testez dès maintenant en créant votre premier entrepôt ! 🚀**

