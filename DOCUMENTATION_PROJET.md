# 📚 Documentation Complète du Projet - Application de Gestion de Stock et Ventes

## 🎯 Vue d'Ensemble

Cette application est un **système de gestion de stock et de point de vente (POS)** développé avec React Native et Expo. Elle permet de gérer les produits, le stock, les ventes, les clients, les remboursements et offre une synchronisation bidirectionnelle avec Firebase Firestore.

**Version :** 1.0.0  
**Type :** Application mobile multiplateforme (iOS, Android, Web)  
**Framework :** React Native avec Expo Router

---

## 🏗️ Architecture Technique

### Stack Technologique

#### Frontend
- **React Native** 0.81.4
- **Expo** ~54.0.13 (SDK 54)
- **Expo Router** ~6.0.11 (navigation basée sur les fichiers)
- **React** 19.1.0
- **TypeScript** ~5.9.2

#### Gestion d'État
- **Redux Toolkit** ^2.9.0
- **Redux Persist** ^6.0.0
- **React Redux** ^9.2.0

#### Backend & Synchronisation
- **Firebase** ^12.4.0
  - Authentication (email/password)
  - Firestore (base de données NoSQL)
- **AsyncStorage** ^2.2.0 (stockage local)

#### Autres Bibliothèques
- **@expo/vector-icons** : Icônes (Ionicons, MaterialCommunityIcons)
- **expo-camera** : Scanner QR code
- **expo-image-picker** : Sélection d'images
- **expo-print** : Impression de reçus
- **react-native-safe-area-context** : Gestion des zones sûres
- **react-native-gesture-handler** : Gestes tactiles

---

## 📁 Structure du Projet

```
test/
├── app/                      # Pages de l'application (Expo Router)
│   ├── _layout.tsx          # Layout principal avec navigation tabs
│   ├── accueil/             # Dashboard / Page d'accueil
│   ├── articles/            # Gestion des produits/articles
│   ├── categories/          # Gestion des catégories
│   ├── entrepots/           # Gestion des entrepôts/emplacements
│   ├── stock/               # Gestion du stock/inventaire
│   ├── ventes/              # Point de vente (POS)
│   └── parametres/          # Paramètres et configurations
│       ├── client.tsx       # Gestion des clients
│       ├── recu.tsx         # Historique des ventes
│       ├── remboursement.tsx # Historique des remboursements
│       └── devis.tsx        # Gestion des devis
│
├── components/               # Composants réutilisables
│   ├── QRScanner.tsx       # Scanner QR code
│   ├── EntrepotsTab.tsx    # Composant pour les entrepôts
│   ├── LoginForm.tsx       # Formulaire de connexion
│   ├── RegisterForm.tsx    # Formulaire d'inscription
│   └── ui/                 # Composants UI (ZohoButton, ZohoCard, etc.)
│
├── services/                 # Services métier
│   ├── DatabaseService.ts   # Service de base de données locale (AsyncStorage)
│   ├── FirebaseService.ts   # Service Firebase/Firestore
│   ├── SyncService.ts       # Service de synchronisation périodique
│   ├── RealtimeSyncService.ts # Synchronisation en temps réel
│   ├── NetworkService.ts    # Détection de connexion réseau
│   └── AppInitializer.ts   # Initialisation de l'application
│
├── store/                    # Redux Store
│   ├── index.ts             # Configuration du store
│   └── slices/              # Redux slices
│       ├── authSlice.ts     # Authentification
│       ├── productSlice.ts  # Produits
│       ├── categorySlice.ts # Catégories
│       ├── stockSlice.ts    # Stock
│       ├── salesSlice.ts    # Ventes
│       ├── customerSlice.ts # Clients
│       ├── syncSlice.ts     # Synchronisation
│       └── networkSlice.ts  # Réseau
│
├── contexts/                 # React Contexts
│   └── AuthContext.tsx      # Contexte d'authentification
│
└── utils/                   # Utilitaires
    ├── idGenerator.ts       # Génération d'IDs uniques
    └── userInfo.ts          # Informations utilisateur
```

---

## 🔑 Fonctionnalités Principales

### 1. **Authentification et Isolation des Données**
- Connexion/Inscription avec Firebase Authentication
- Isolation complète des données par utilisateur (`created_by`, `user_id`)
- Nettoyage automatique d'AsyncStorage lors du changement d'utilisateur
- Gestion de profil utilisateur

### 2. **Gestion des Produits**
- Création, modification, suppression de produits
- Support des catégories
- Images produits
- Codes-barres et SKU
- Prix d'achat et de vente avec calcul automatique de marge
- QR code pour identification rapide

### 3. **Gestion du Stock**
- Suivi du stock par produit et par entrepôt
- Alertes de stock faible
- Approvisionnement depuis les entrepôts
- Historique des mouvements de stock
- Taux de rotation du stock

### 4. **Gestion des Entrepôts/Emplacements**
- Création et gestion de multiples entrepôts
- Inventaire par entrepôt
- Transferts de stock entre entrepôts

### 5. **Point de Vente (POS)**
- Interface de caisse moderne
- Scanner QR code pour ajout rapide de produits
- Panier avec gestion des quantités
- Sélection de client (détail/gros)
- Calcul automatique du total, taxes, remises
- Modes de paiement multiples
- Création et gestion de clients directement depuis le POS

### 6. **Gestion des Clients**
- Création, modification, suppression de clients
- Types de clients (Détail/Gros)
- Limite de crédit et solde crédit
- Historique des clients par utilisateur

### 7. **Historique des Ventes**
- Visualisation de toutes les ventes
- Détails complets de chaque vente
- Partage et impression de reçus
- Filtrage par période

### 8. **Système de Remboursements**
- Remboursement de ventes
- Restauration automatique du stock
- Historique des remboursements
- Suppression de la vente remboursée de l'historique

### 9. **Dashboard / Accueil**
- Vue d'ensemble des métriques (ventes, produits, stock)
- Graphiques de ventes hebdomadaires
- Alertes de stock faible
- Taux de rotation du stock
- Activités récentes
- **Historique complet** : Modal accessible via l'icône de cloche affichant toutes les activités (ventes, remboursements, créations, mouvements de stock)

### 10. **Synchronisation**
- **Double système de synchronisation** :
  - **SyncService** : Synchronisation périodique en queue (create, update, delete)
  - **RealtimeSyncService** : Synchronisation en temps réel via Firestore `onSnapshot`
- Mode offline/online automatique
- Gestion des conflits et prévention des doublons
- Queue de synchronisation pour les opérations en attente

---

## 🔄 Flux de Synchronisation

### Architecture de Synchronisation

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ Local  │ │  RealtimeSync    │
│ Storage│ │  (onSnapshot)     │
│(Async) │ └──────────────────┘
└────┬───┘           │
     │               │
     ▼               ▼
┌──────────────────────────┐
│    SyncService (Queue)   │
└─────────────┬────────────┘
              │
              ▼
      ┌──────────────┐
      │   Firebase   │
      │   Firestore  │
      └──────────────┘
```

### Processus de Synchronisation

1. **Création Locale** :
   - Données créées dans AsyncStorage avec `sync_status: 'pending'`
   - ID local généré (format: `id-xxxxx-xxxxx`)

2. **Synchronisation en Ligne** :
   - Si connecté : création directe dans Firebase
   - Récupération de l'ID Firebase
   - Mise à jour locale avec `firebase_id` et `sync_status: 'synced'`

3. **Synchronisation Hors Ligne** :
   - Ajout à la queue de synchronisation
   - Synchronisation automatique quand la connexion est rétablie

4. **Synchronisation en Temps Réel** :
   - RealtimeSync écoute les changements Firestore
   - Détection automatique des doublons
   - Mise à jour locale automatique

---

## 🔒 Sécurité et Isolation des Données

### Isolation par Utilisateur

Toutes les entités incluent :
- `created_by` : UID de l'utilisateur qui a créé l'entité
- `created_by_name` : Nom/email de l'utilisateur
- `user_id` : ID de l'utilisateur (pour les ventes)

### Filtrage Automatique

- `DatabaseService.getAllByUser()` : Filtre automatique par `created_by` ou `user_id`
- Toutes les requêtes Firebase utilisent `where('created_by', '==', userId)`
- Règles Firestore pour isolation complète en production

---

## 📊 Entités de Données

### Produits (products)
```typescript
{
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  price_buy: number;
  price_sell: number;
  margin: number;
  unit: string;
  images?: string;
  is_active: boolean;
  created_by: string;
  created_by_name: string;
  sync_status: 'synced' | 'pending' | 'error';
}
```

### Stock (stock)
```typescript
{
  id: string;
  product_id: string;
  location_id: string;
  quantity_current: number;
  quantity_min: number;
  quantity_max: number;
  last_movement_date?: string;
  last_movement_type?: string;
  created_by: string;
  sync_status: 'synced' | 'pending' | 'error';
}
```

### Ventes (sales)
```typescript
{
  id: string;
  user_id: string;
  customer_id?: string;
  location_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status?: 'paid' | 'pending' | 'refunded';
  sale_date: string;
  created_by: string;
  sync_status: 'synced' | 'pending' | 'error';
}
```

### Clients (customers)
```typescript
{
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'retail' | 'wholesale';
  credit_limit: number;
  credit_balance: number;
  created_by: string;
  created_by_name: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string; // ID Firebase si synchronisé
}
```

### Remboursements (refunds)
```typescript
{
  id: string;
  sale_id: string;
  user_id: string;
  customer_id?: string;
  location_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  refund_date: string;
  created_by: string;
  created_by_name: string;
  sync_status: 'synced' | 'pending' | 'error';
}
```

---

## 🎨 Interface Utilisateur

### Navigation
- **5 onglets principaux** :
  1. Accueil (Dashboard)
  2. Articles (Produits)
  3. Inventaire (Stock)
  4. Ventes (POS)
  5. Paramètres

### Design
- Style moderne inspiré iOS
- Couleur principale : `#007AFF` (bleu iOS)
- Responsive design
- Support du mode sombre (partiel)
- Animations fluides

---

## 🔧 Services Principaux

### DatabaseService
- **Rôle** : Gestion de la base de données locale (AsyncStorage)
- **Fonctions** :
  - `insert()`, `update()`, `delete()`, `getAll()`, `getById()`
  - `getAllByUser()` : Filtre par utilisateur
  - Cache en mémoire (5 secondes)
  - Invalidation de cache

### FirebaseService
- **Rôle** : Interface avec Firebase Firestore
- **Fonctions** :
  - CRUD pour toutes les entités
  - Filtrage automatique par `created_by`
  - Timeout de 3 secondes pour éviter les blocages

### SyncService
- **Rôle** : Synchronisation périodique en queue
- **Fonctions** :
  - Queue de synchronisation (`sync_queue`)
  - Traitement par batch
  - Retry automatique en cas d'erreur
  - Gestion des opérations : create, update, delete

### RealtimeSyncService
- **Rôle** : Synchronisation en temps réel via Firestore listeners
- **Fonctions** :
  - Écoute des changements Firestore (`onSnapshot`)
  - Détection et prévention des doublons
  - Mise à jour automatique de l'UI
  - Gestion des événements : added, modified, removed

### NetworkService
- **Rôle** : Détection de l'état de connexion
- **Fonctions** :
  - `isConnected()` : Vérifie la connexion réseau
  - Écoute des changements d'état réseau

---

## ⚡ Points Forts du Projet

1. **Architecture Solide**
   - Séparation claire des responsabilités
   - Services modulaires et réutilisables
   - TypeScript pour la sécurité des types

2. **Synchronisation Robuste**
   - Double système (périodique + temps réel)
   - Gestion offline/online
   - Prévention des doublons
   - Queue de synchronisation fiable

3. **Isolation des Données**
   - Isolation complète par utilisateur
   - Filtrage automatique
   - Sécurité au niveau Firestore

4. **UX Moderne**
   - Interface intuitive
   - Design cohérent
   - Animations fluides
   - Responsive design

5. **Fonctionnalités Complètes**
   - Gestion complète du cycle de vente
   - Système de remboursement
   - Historique détaillé
   - Scanner QR code

---

## 🔍 Points d'Attention / Améliorations Possibles

1. **Performance**
   - Cache : durée de 5 secondes peut être optimisée
   - Chargement initial : pourrait bénéficier d'un lazy loading
   - Images : pas de compression visible

2. **Gestion d'Erreurs**
   - Certaines erreurs ne sont pas toujours catchées
   - Messages d'erreur utilisateur pourraient être plus explicites

3. **Tests**
   - Tests unitaires présents mais limités
   - Pas de tests E2E visibles

4. **Documentation**
   - Code bien commenté dans certaines parties
   - README.md très basique
   - Manque de documentation API

5. **Sécurité**
   - Règles Firestore bien configurées
   - Validation côté client à renforcer
   - Pas de chiffrement des données sensibles en local visible

---

## 📈 Métriques et Statistiques

### Code
- **Langages** : TypeScript (principal), JavaScript
- **Lignes de code** : ~15,000+ (estimation)
- **Composants** : ~50+ composants
- **Services** : 6 services principaux
- **Redux Slices** : 9 slices

### Fonctionnalités
- **5 écrans principaux**
- **3 systèmes de synchronisation** (local, queue, temps réel)
- **10+ entités de données** gérées
- **Support multi-plateforme** (iOS, Android, Web)

---

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo CLI
- Compte Firebase configuré

### Installation
```bash
npm install
```

### Configuration Firebase
1. Créer un projet Firebase
2. Activer Authentication (Email/Password)
3. Créer une base Firestore
4. Configurer `firebase-config.ts`

### Lancement
```bash
npm start
# Puis choisir iOS, Android ou Web
```

---

## 📝 Notes Techniques Importantes

### Identifiants
- **ID Local** : Format `id-xxxxx-xxxxx` (généré localement)
- **Firebase ID** : Format alphanumérique (généré par Firestore)
- **Mapping** : `firebase_id` dans les entités locales pour la correspondance

### Cache
- Durée : 5 secondes par défaut
- Invalidation automatique après modifications
- Invalidation manuelle possible via `invalidateCache()`

### Synchronisation
- **Temps réel** : Via `RealtimeSyncService` (onSnapshot)
- **Périodique** : Via `SyncService` (queue toutes les X secondes)
- **Manuelle** : Bouton de synchronisation disponible

---

## ✅ État Actuel du Projet

### ✅ Fonctionnel
- ✅ Authentification Firebase
- ✅ Gestion des produits
- ✅ Gestion du stock
- ✅ Point de vente
- ✅ Gestion des clients
- ✅ Historique des ventes
- ✅ Système de remboursements
- ✅ Synchronisation bidirectionnelle
- ✅ Mode offline
- ✅ Scanner QR code
- ✅ Dashboard avec métriques
- ✅ Historique complet des activités

### 🔄 En Amélioration Continue
- Optimisation des performances
- Gestion des erreurs
- Tests automatisés
- Documentation utilisateur

---

## 📞 Support et Maintenance

### Logs de Débogage
Le projet utilise un système de logging détaillé :
- `📊` : Données/Métriques
- `✅` : Succès
- `❌` : Erreurs
- `⚠️` : Avertissements
- `🔄` : Synchronisation
- `📱` : Mode offline
- `🌐` : Mode online

### Fichiers de Documentation
Plus de 50 fichiers `.md` documentent les différentes fonctionnalités, corrections et guides.

---

## 🎯 Conclusion

Ce projet est une **application de gestion de stock et de point de vente complète et fonctionnelle**, avec une architecture solide, une synchronisation robuste, et une isolation sécurisée des données. Le code est bien structuré, modulaire et prêt pour la production.

**Note Globale : 8.5/10** ⭐⭐⭐⭐

**Points Forts :**
- Architecture claire et modulaire
- Synchronisation bidirectionnelle fiable
- Isolation des données sécurisée
- Interface utilisateur moderne

**Points à Améliorer :**
- Documentation API plus détaillée
- Tests automatisés plus complets
- Optimisation des performances sur grandes quantités de données

---

*Documentation générée le : 02 novembre 2025*

