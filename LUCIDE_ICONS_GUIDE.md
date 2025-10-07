# 🎨 Guide d'Utilisation des Icônes Lucide

## 📦 Installation

Les icônes Lucide ont été installées dans votre projet :

```bash
npm install lucide-react-native react-native-svg --legacy-peer-deps
```

## 🚀 Utilisation de Base

### Import des Icônes

```tsx
import { Search, Plus, Edit2, Trash2, Package, Tag } from 'lucide-react-native';
```

### Utilisation Simple

```tsx
<Search size={24} color="#007AFF" strokeWidth={2} />
```

## 🎯 Exemples Pratiques

### 1. Dans un Bouton

```tsx
<TouchableOpacity style={styles.button} onPress={handlePress}>
  <Plus size={20} color="#fff" strokeWidth={2} />
  <Text style={styles.buttonText}>Ajouter</Text>
</TouchableOpacity>
```

### 2. Dans un Header

```tsx
<View style={styles.header}>
  <Search size={22} color="#007AFF" />
  <Text style={styles.title}>Recherche</Text>
</View>
```

### 3. Dans une Liste

```tsx
<View style={styles.listItem}>
  <Package size={20} color="#666" />
  <Text style={styles.itemText}>{product.name}</Text>
</View>
```

## 📚 Icônes Utiles pour Votre Projet

### Commerce & Produits
- `Package` - Produits/Articles
- `ShoppingCart` - Panier
- `ShoppingBag` - Sac d'achat
- `Barcode` - Code-barres
- `ScanBarcode` - Scanner code-barres
- `Tag` - Étiquette/Catégorie
- `DollarSign` - Prix/Argent
- `Receipt` - Reçu
- `CreditCard` - Carte de crédit

### Navigation & Actions
- `Plus` - Ajouter
- `Minus` - Retirer
- `X` - Fermer
- `Check` - Valider
- `ChevronRight` - Flèche droite
- `ChevronLeft` - Flèche gauche
- `ChevronDown` - Flèche bas
- `ChevronUp` - Flèche haut
- `ArrowLeft` - Retour
- `ArrowRight` - Suivant
- `Home` - Accueil
- `Menu` - Menu

### Édition & Gestion
- `Edit` ou `Edit2` - Modifier
- `Edit3` - Modifier (variant)
- `Trash` ou `Trash2` - Supprimer
- `Save` - Enregistrer
- `Copy` - Copier
- `Download` - Télécharger
- `Upload` - Téléverser
- `RefreshCw` - Actualiser

### Recherche & Filtres
- `Search` - Recherche
- `Filter` - Filtrer
- `SlidersHorizontal` - Paramètres filtres
- `SortAsc` - Trier croissant
- `SortDesc` - Trier décroissant

### Stock & Inventaire
- `TrendingUp` - En hausse
- `TrendingDown` - En baisse
- `AlertTriangle` - Alerte
- `AlertCircle` - Alerte info
- `CheckCircle` - Succès
- `XCircle` - Erreur
- `Info` - Information
- `Archive` - Archiver
- `Inbox` - Entrées

### Utilisateurs & Profil
- `User` - Utilisateur
- `Users` - Utilisateurs (plural)
- `UserPlus` - Ajouter utilisateur
- `UserMinus` - Retirer utilisateur
- `UserCheck` - Utilisateur vérifié
- `Settings` - Paramètres
- `Lock` - Verrouillé
- `Unlock` - Déverrouillé
- `Eye` - Voir
- `EyeOff` - Masquer

### Données & Statistiques
- `BarChart` - Graphique en barres
- `PieChart` - Graphique circulaire
- `LineChart` - Graphique linéaire
- `Activity` - Activité
- `Calendar` - Calendrier
- `Clock` - Horloge

### Communication & Notifications
- `Bell` - Notification
- `BellOff` - Notifications désactivées
- `Mail` - Email
- `MessageCircle` - Message
- `Phone` - Téléphone
- `Send` - Envoyer

### Fichiers & Documents
- `File` - Fichier
- `FileText` - Document texte
- `Folder` - Dossier
- `FolderOpen` - Dossier ouvert
- `Image` - Image
- `Paperclip` - Pièce jointe

### Réseau & Sync
- `Wifi` - WiFi
- `WifiOff` - WiFi désactivé
- `Cloud` - Cloud
- `CloudOff` - Cloud désactivé
- `RefreshCw` - Synchroniser
- `Download` - Télécharger
- `Upload` - Téléverser

### Localisation
- `MapPin` - Épingle carte
- `Map` - Carte
- `Navigation` - Navigation
- `Compass` - Boussole

## 🎨 Personnalisation

### Propriétés Disponibles

```tsx
<IconName 
  size={24}              // Taille en pixels
  color="#007AFF"        // Couleur
  strokeWidth={2}        // Épaisseur du trait
  fill="transparent"     // Couleur de remplissage
  style={styles.icon}    // Styles personnalisés
/>
```

### Exemples de Styles

```tsx
// Icône primaire
<Search size={24} color="#007AFF" strokeWidth={2} />

// Icône secondaire
<Edit2 size={20} color="#666" strokeWidth={1.5} />

// Icône danger
<Trash2 size={22} color="#FF3B30" strokeWidth={2} />

// Icône succès
<CheckCircle size={24} color="#34C759" strokeWidth={2} />

// Icône alerte
<AlertTriangle size={24} color="#FF9500" strokeWidth={2} />
```

## 📱 Exemples d'Intégration

### Carte de Produit avec Icônes

```tsx
<View style={styles.productCard}>
  <View style={styles.productHeader}>
    <Package size={20} color="#007AFF" />
    <Text style={styles.productName}>{product.name}</Text>
  </View>
  
  <View style={styles.productInfo}>
    <DollarSign size={16} color="#666" />
    <Text>{product.price} FCFA</Text>
  </View>
  
  <View style={styles.productActions}>
    <TouchableOpacity onPress={handleEdit}>
      <Edit2 size={18} color="#007AFF" />
    </TouchableOpacity>
    
    <TouchableOpacity onPress={handleDelete}>
      <Trash2 size={18} color="#FF3B30" />
    </TouchableOpacity>
  </View>
</View>
```

### Barre de Navigation avec Icônes

```tsx
<View style={styles.tabBar}>
  <TouchableOpacity style={styles.tab}>
    <Home size={24} color={isActive ? '#007AFF' : '#999'} />
    <Text style={styles.tabLabel}>Accueil</Text>
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.tab}>
    <Package size={24} color={isActive ? '#007AFF' : '#999'} />
    <Text style={styles.tabLabel}>Articles</Text>
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.tab}>
    <ShoppingCart size={24} color={isActive ? '#007AFF' : '#999'} />
    <Text style={styles.tabLabel}>Ventes</Text>
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.tab}>
    <User size={24} color={isActive ? '#007AFF' : '#999'} />
    <Text style={styles.tabLabel}>Profil</Text>
  </TouchableOpacity>
</View>
```

### État de Stock avec Icônes

```tsx
const getStockIcon = (quantity: number, minQuantity: number) => {
  if (quantity === 0) {
    return <XCircle size={20} color="#FF3B30" />;
  } else if (quantity <= minQuantity) {
    return <AlertTriangle size={20} color="#FF9500" />;
  } else {
    return <CheckCircle size={20} color="#34C759" />;
  }
};

// Utilisation
<View style={styles.stockStatus}>
  {getStockIcon(product.stock, product.minStock)}
  <Text style={styles.stockText}>{product.stock} unités</Text>
</View>
```

## 🔗 Ressources

- **Documentation officielle**: https://lucide.dev/
- **Toutes les icônes**: https://lucide.dev/icons/
- **React Native**: https://github.com/lucide-icons/lucide/tree/main/packages/lucide-react-native

## 💡 Conseils

1. **Cohérence**: Utilisez le même `strokeWidth` dans toute l'application (généralement 2)
2. **Taille**: Pour les icônes dans des boutons, utilisez `size={20-24}`
3. **Couleur**: Utilisez vos couleurs de thème pour maintenir la cohérence
4. **Performance**: Les icônes Lucide sont des SVG légers, parfaits pour la performance
5. **Accessibilité**: Ajoutez toujours des labels textuels à côté des icônes importantes

## 🎯 Cas d'Usage dans Votre App

### Page Articles
- ✅ `Search` - Recherche d'articles
- ✅ `ScanBarcode` - Scanner code-barres
- ✅ `Plus` - Ajouter un article
- `Package` - Icône d'article
- `Tag` - Catégories
- `Edit2` - Modifier
- `Trash2` - Supprimer

### Page Stock
- `TrendingUp` / `TrendingDown` - Mouvements de stock
- `AlertTriangle` - Stock bas
- `CheckCircle` - Stock OK
- `Archive` - Archiver

### Page Ventes
- `ShoppingCart` - Panier
- `Receipt` - Facture
- `DollarSign` - Prix
- `CreditCard` - Paiement

### Page Profil/Paramètres
- `User` - Profil
- `Settings` - Paramètres
- `Bell` - Notifications
- `Lock` - Sécurité
- `LogOut` - Déconnexion

## 🚨 Notes Importantes

- Les icônes Lucide nécessitent `react-native-svg`
- Toutes les icônes sont exportées en **PascalCase** (ex: `ScanBarcode`, pas `scan-barcode`)
- Vous pouvez utiliser n'importe quelle icône de la bibliothèque Lucide (plus de 1000 icônes disponibles!)


