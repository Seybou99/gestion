import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import EntrepotsTab from '../../components/EntrepotsTab';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { syncService } from '../../services/SyncService';
import { AppDispatch, RootState } from '../../store';
import { fetchProducts } from '../../store/slices/productSlice';
import { getCurrentUser } from '../../utils/userInfo';

const { width, height } = Dimensions.get('window');

// Breakpoints responsive
const isTablet = width > 768;
const isDesktop = width > 1024;
const isLargeScreen = width > 1200;

// Tailles dynamiques basées sur la largeur d'écran
const dynamicSizes = {
  fontSize: {
    small: Math.max(12, width * 0.03),
    medium: Math.max(14, width * 0.035),
    large: Math.max(16, width * 0.04),
    xlarge: Math.max(18, width * 0.045),
  },
  spacing: {
    xs: Math.max(4, width * 0.01),
    sm: Math.max(8, width * 0.02),
    md: Math.max(12, width * 0.03),
    lg: Math.max(16, width * 0.04),
    xl: Math.max(20, width * 0.05),
  },
  button: {
    size: Math.max(24, width * 0.06),
    padding: Math.max(8, width * 0.02),
  }
};

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity_current: number;
  quantity_min: number;
  quantity_max: number;
  last_movement_date: string;
  last_movement_type: string;
  status: 'Normal' | 'Stock faible' | 'Rupture';
  sync_status: 'synced' | 'pending' | 'error';
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: 'Entrée' | 'Sortie';
  quantity: number;
  date: string;
  reason: string;
  user: string;
}

/**
 * Écran Stock - Gestion du Stock
 * 
 * Affiche l'état du stock avec alertes, réapprovisionnements
 * et historique des mouvements.
 */
export default function StockScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { products } = useSelector((state: RootState) => state.products);
  const { isConnected } = useSelector((state: RootState) => state.network);
  
  const [activeTab, setActiveTab] = useState<'magasin' | 'entrepots'>('magasin');
  const [selectedFilter, setSelectedFilter] = useState('Tous');
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: {selected: boolean, quantity: number}}>({});
  
  // États pour le modal de réapprovisionnement individuel
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('0');
  
  // États pour les entrepôts
  const [locations, setLocations] = useState<any[]>([]);
  const [showCreateLocationModal, setShowCreateLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    location_type: 'warehouse' as 'warehouse' | 'store' | 'supplier',
    contact_person: '',
    phone: '',
  });

  // Charger les données du stock
  useEffect(() => {
    loadStockData();
    loadLocations();
    // Synchronisation automatique depuis Firebase au démarrage
    autoSyncFromFirebase();
  }, []);

  // Charger les emplacements
  const loadLocations = async () => {
    try {
      console.log('🏢 [LOAD LOCATIONS STOCK] Début chargement emplacements pour l\'onglet Entrepôts');
      
      const allLocations = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ [LOAD LOCATIONS STOCK] Utilisateur non connecté pour locations');
          return [];
        }
        const locations = await databaseService.getAllByUser('locations', user.uid);
        console.log(`🏢 [LOAD LOCATIONS STOCK] ${locations.length} locations chargées pour l'utilisateur ${user.uid}`);
        if (locations.length === 0) {
          // Charger toutes les locations pour debug
          const allLocs = await databaseService.getAll('locations');
          console.log(`🏢 [DEBUG STOCK] Total locations dans la BDD: ${allLocs.length}`);
          allLocs.forEach((loc: any) => {
            console.log(`🏢 [DEBUG STOCK] Location: ${loc.name}, created_by: ${loc.created_by}`);
          });
        }
        return locations;
      })() as any[];
      
      const inventory = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ [LOAD LOCATIONS STOCK] Utilisateur non connecté pour inventory');
          return [];
        }
        const inv = await databaseService.getAllByUser('inventory', user.uid);
        console.log(`📦 [LOAD LOCATIONS STOCK] ${inv.length} inventaires chargés pour l'utilisateur ${user.uid}`);
        if (inv.length === 0) {
          // Charger tous les inventaires pour debug
          const allInv = await databaseService.getAll('inventory');
          console.log(`📦 [DEBUG STOCK] Total inventaires dans la BDD: ${allInv.length}`);
          allInv.forEach((invItem: any) => {
            console.log(`📦 [DEBUG STOCK] Inventory: product_id=${invItem.product_id}, location_id=${invItem.location_id}, created_by=${invItem.created_by}`);
          });
        }
        return inv;
      })() as any[];
      
      const allProducts = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ [LOAD LOCATIONS STOCK] Utilisateur non connecté pour products');
          return [];
        }
        return await databaseService.getAllByUser('products', user.uid);
      })() as any[];
      
      console.log(`🏢 [LOAD LOCATIONS STOCK] Calcul des statistiques pour ${allLocations.length} locations`);
      
      const locationsWithStats = allLocations.map(location => {
        const locationInventory = inventory.filter(inv => inv.location_id === location.id);
        const productsCount = locationInventory.length;
        const lowStockCount = locationInventory.filter(inv => 
          inv.quantity_available < inv.quantity_min
        ).length;
        const totalValue = locationInventory.reduce((sum, inv) => {
          const product = allProducts.find(p => p.id === inv.product_id);
          return sum + (inv.quantity_available * (product?.price_sell || 0));
        }, 0);
        
        console.log(`🏢 [LOAD LOCATIONS STOCK] Location "${location.name}": ${productsCount} produits, ${lowStockCount} alertes, valeur: ${totalValue}`);
        
        return {
          ...location,
          products_count: productsCount,
          total_value: totalValue,
          low_stock_count: lowStockCount,
        };
      });
      
      setLocations(locationsWithStats);
      console.log(`🏢 [LOAD LOCATIONS STOCK] ${locationsWithStats.length} emplacements chargés avec statistiques`);
    } catch (error) {
      console.error('❌ [LOAD LOCATIONS STOCK] Erreur chargement emplacements:', error);
    }
  };

  // Recharger les données quand on revient sur cette page (AppState)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 [STOCK REFRESH] Application active, rechargement du stock');
        databaseService.invalidateCache('stock');
        databaseService.invalidateCache('products');
        loadStockData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  // Recharger les données quand la page reprend le focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 [STOCK REFRESH] Page stock en focus, rechargement des données');
      databaseService.invalidateCache('stock');
      databaseService.invalidateCache('products');
      loadStockData();
    });

    return unsubscribe;
  }, [navigation]);

  // Synchronisation automatique périodique (réduite pour éviter les réactualisations constantes)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [STOCK AUTO SYNC] Synchronisation automatique périodique');
      autoSyncFromFirebase();
    }, 60000); // Synchroniser toutes les 60 secondes (1 minute)

    return () => clearInterval(interval);
  }, []);

  // Synchronisation automatique quand l'application reprend le focus
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 [AUTO SYNC] Application active, synchronisation automatique');
        autoSyncFromFirebase();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  const autoSyncFromFirebase = async () => {
    try {
      console.log('🔄 [AUTO SYNC] Début synchronisation automatique depuis Firebase');
      
      // Vérifier si l'utilisateur est connecté (mode production)
      const user = await getCurrentUser();
      if (!user) {
        console.log('👤 [AUTO SYNC] Utilisateur non connecté, synchronisation ignorée (mode production)');
        return;
      }
      
      console.log(`✅ [AUTO SYNC] Utilisateur local détecté: ${user.email} (UID: ${user.uid})`);
      console.log('🔄 [AUTO SYNC] Appel de firebaseService.getStock()...');
      
      // Récupérer le stock depuis Firebase
      const stockFromFirebase = await firebaseService.getStock();
      
      if (stockFromFirebase.length === 0) {
        console.log('📊 [AUTO SYNC] Aucun stock dans Firebase, synchronisation ignorée');
        return;
      }
      
      // Récupérer le stock local actuel
      const localStock = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour stock');
          return [];
        }
        return await databaseService.getAllByUser('stock', user.uid);
      })() as any[];
      
      // Vérifier s'il y a des différences
      const hasDifferences = checkStockDifferences(localStock, stockFromFirebase);
      
      if (!hasDifferences) {
        console.log('✅ [AUTO SYNC] Stock local et Firebase identiques, pas de synchronisation nécessaire');
        return;
      }
      
      console.log(`🔄 [AUTO SYNC] Différences détectées, synchronisation de ${stockFromFirebase.length} éléments`);
      
      // Synchroniser en évitant les doublons
      await syncStockWithoutDuplicates(stockFromFirebase);
      
      // Recharger les données
      await loadStockData();
      
      console.log('✅ [AUTO SYNC] Synchronisation automatique terminée');
    } catch (error) {
      console.error('❌ [AUTO SYNC] Erreur synchronisation automatique:', error);
      // Ne pas afficher d'erreur à l'utilisateur pour la sync automatique
    }
  };

  const checkStockDifferences = (localStock: any[], firebaseStock: any[]): boolean => {
    // Si les tailles sont différentes, il y a des différences
    if (localStock.length !== firebaseStock.length) {
      console.log(`🔍 [DIFF CHECK] Tailles différentes: local=${localStock.length}, firebase=${firebaseStock.length}`);
      return true;
    }
    
    // Vérifier si tous les éléments Firebase existent localement
    for (const firebaseItem of firebaseStock) {
      const existsLocally = localStock.some(localItem => 
        localItem.firebase_id === firebaseItem.id || 
        localItem.id === firebaseItem.id ||
        localItem.product_id === firebaseItem.product_id
      );
      
      if (!existsLocally) {
        console.log(`🔍 [DIFF CHECK] Stock Firebase manquant localement: ${firebaseItem.product_id} (ID: ${firebaseItem.id})`);
        return true;
      }
    }
    
    // Vérifier si tous les éléments locaux existent dans Firebase
    for (const localItem of localStock) {
      const existsInFirebase = firebaseStock.some(firebaseItem => 
        firebaseItem.id === localItem.firebase_id ||
        firebaseItem.id === localItem.id ||
        firebaseItem.product_id === localItem.product_id
      );
      
      if (!existsInFirebase) {
        console.log(`🔍 [DIFF CHECK] Stock local manquant dans Firebase: ${localItem.product_id} (ID: ${localItem.id})`);
        return true;
      }
    }
    
    console.log(`✅ [DIFF CHECK] Stock local et Firebase identiques`);
    return false;
  };

  const syncStockWithoutDuplicates = async (firebaseStock: any[]) => {
    console.log('🔄 [SYNC NO DUPLICATES] Début synchronisation sans doublons');
    
    // Récupérer le stock local actuel
    const localStock = await (async () => {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('⚠️ Utilisateur non connecté pour stock');
        return [];
      }
      return await databaseService.getAllByUser('stock', user.uid);
    })() as any[];
    
    // Récupérer les opérations de suppression en attente
    const syncQueue = await databaseService.getAll('sync_queue') as any[];
    const pendingDeletes = syncQueue.filter(op => 
      op.table_name === 'stock' && 
      op.operation === 'delete' && 
      op.status === 'pending'
    );
    
    // Créer un set des product_id qui sont en attente de suppression
    const pendingDeleteProductIds = new Set();
    pendingDeletes.forEach(op => {
      if (op.data && op.data.product_id) {
        pendingDeleteProductIds.add(op.data.product_id);
      }
    });
    
    console.log(`🗑️ [SYNC NO DUPLICATES] ${pendingDeleteProductIds.size} suppressions en attente détectées`);
    
    // Créer un map des éléments locaux par firebase_id et product_id
    const localMap = new Map();
    localStock.forEach(item => {
      if (item.firebase_id) {
        localMap.set(item.firebase_id, item);
      }
      localMap.set(item.product_id, item);
    });
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const firebaseItem of firebaseStock) {
      const { id, ...stockWithoutId } = firebaseItem;
      
      // Vérifier si ce product_id est en attente de suppression
      if (pendingDeleteProductIds.has(firebaseItem.product_id)) {
        console.log(`⏭️ [SYNC NO DUPLICATES] Stock ignoré (suppression en attente): ${firebaseItem.product_id}`);
        skippedCount++;
        continue;
      }
      
      // Vérifier si l'élément existe déjà par firebase_id
      const existingByFirebaseId = localMap.get(id);
      
      // Vérifier si l'élément existe déjà par product_id
      const existingByProductId = localMap.get(firebaseItem.product_id);
      
      if (existingByFirebaseId) {
        // Mettre à jour l'élément existant
        await databaseService.update('stock', existingByFirebaseId.id, {
          ...stockWithoutId,
          firebase_id: id,
          sync_status: 'synced'
        });
        updatedCount++;
        console.log(`🔄 [SYNC NO DUPLICATES] Stock mis à jour: ${firebaseItem.product_id}`);
      } else if (existingByProductId && !existingByProductId.firebase_id) {
        // Mettre à jour l'élément local avec le firebase_id
        await databaseService.update('stock', existingByProductId.id, {
          ...stockWithoutId,
          firebase_id: id,
          sync_status: 'synced'
        });
        updatedCount++;
        console.log(`🔄 [SYNC NO DUPLICATES] Stock local mis à jour avec firebase_id: ${firebaseItem.product_id}`);
      } else if (!existingByProductId) {
        // Ajouter le nouvel élément avec l'ID Firebase comme ID local
        const newStockItem = {
          id: id, // Utiliser l'ID Firebase comme ID local
          ...stockWithoutId,
          firebase_id: id,
          sync_status: 'synced'
        };
        
        // Insérer directement dans AsyncStorage pour garder l'ID Firebase
        const existing = await AsyncStorage.getItem('stock');
        const items = existing ? JSON.parse(existing) : [];
        items.push(newStockItem);
        await AsyncStorage.setItem('stock', JSON.stringify(items));
        
        // Invalider le cache
        databaseService.invalidateCache('stock');
        
        addedCount++;
        console.log(`➕ [SYNC NO DUPLICATES] Nouveau stock ajouté avec ID Firebase: ${firebaseItem.product_id} (ID: ${id})`);
      }
    }
    
    console.log(`✅ [SYNC NO DUPLICATES] Synchronisation terminée: ${addedCount} ajoutés, ${updatedCount} mis à jour, ${skippedCount} ignorés`);
    
    // IMPORTANT: Recharger les données SILENCIEUSEMENT (sans loader) uniquement si nécessaire
    if (addedCount > 0 || updatedCount > 0) {
      console.log('🔄 [SYNC NO DUPLICATES] Rechargement silencieux des données après synchronisation');
      databaseService.invalidateCache('stock');
      databaseService.invalidateCache('products');
      // Recharger silencieusement sans afficher le loader
      await loadStockDataSilently();
    }
  };

  // Fonction pour charger les données SILENCIEUSEMENT (sans loader, utilisée pour la sync en arrière-plan)
  const loadStockDataSilently = async () => {
    try {
      // Charger les données SANS afficher le loader pour éviter le "bougement" de la page
      
      // Charger le stock depuis la base de données
      const stockItems = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour stock');
          return [];
        }
        return await databaseService.getAllByUser('stock', user.uid);
      })() as any[];
      const allProducts = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour products');
          return [];
        }
        return await databaseService.getAllByUser('products', user.uid);
      })() as any[];
      
      // Créer un map des produits pour récupérer les noms et catégories
      const productMap = new Map();
      allProducts.forEach(product => {
        productMap.set(product.id, {
          name: product.name,
          category: product.category_id || 'Non catégorisé'
        });
      });
      
      // ✅ DÉDUPLICATION ET NETTOYAGE DES STOCKS ORPHELINS
      console.log(`🔍 [STOCK CLEANUP] Début nettoyage des stocks orphelins...`);
      
      // Supprimer les stocks orphelins de la base de données
      const orphanStocks = stockItems.filter(stock => !productMap.has(stock.product_id));
      if (orphanStocks.length > 0) {
        console.log(`🗑️ [STOCK CLEANUP] Suppression de ${orphanStocks.length} stocks orphelins`);
        for (const orphan of orphanStocks) {
          console.log(`🗑️ [STOCK CLEANUP] Suppression stock orphelin: ${orphan.id} (product_id: ${orphan.product_id})`);
          await databaseService.delete('stock', orphan.id);
        }
      }
      
      // Filtrer les stocks valides (qui ont un produit correspondant)
      const validStocks = stockItems.filter(stock => productMap.has(stock.product_id));
      
      // Transformer les données de stock avec déduplication
      const transformedStock: StockItem[] = validStocks
        .map(stock => {
          const product = productMap.get(stock.product_id);
          const status = getStockStatus(stock.quantity_current, stock.quantity_min);
          
          return {
            id: stock.id,
            product_id: stock.product_id,
            product_name: product.name,
            product_category: product.category || 'Non catégorisé',
            quantity_current: stock.quantity_current,
            quantity_min: stock.quantity_min,
            quantity_max: stock.quantity_max,
            last_movement_date: stock.last_movement_date,
            last_movement_type: stock.last_movement_type,
            status,
            sync_status: stock.sync_status || 'synced'
          };
        })
        // ✅ DÉDUPLICATION : Garder seulement le premier stock avec chaque ID unique
        .reduce((unique: StockItem[], stock) => {
          if (!unique.find(s => s.id === stock.id)) {
            unique.push(stock);
          }
          return unique;
        }, []);
      
      console.log(`✅ [STOCK CLEANUP] ${transformedStock.length} stocks valides après nettoyage`);
      
      // Mettre à jour UNIQUEMENT si les données ont vraiment changé
      setStockData(prev => {
        // Comparer les données pour éviter les mises à jour inutiles
        if (JSON.stringify(prev) === JSON.stringify(transformedStock)) {
          console.log('✅ [SILENT RELOAD] Données identiques, pas de mise à jour UI');
          return prev; // Pas de changement, pas de re-render
        }
        console.log('🔄 [SILENT RELOAD] Données mises à jour silencieusement');
        return transformedStock;
      });
      
      // Générer des mouvements fictifs basés sur les données réelles
      const generatedMovements: StockMovement[] = transformedStock
        .filter(item => item.last_movement_date)
        .slice(0, 10) // Limiter à 10 mouvements récents
        .map((item, index) => ({
          id: `movement-${index}`,
          product_id: item.product_id,
          product_name: item.product_name,
          type: item.last_movement_type === 'initial' ? 'Entrée' : 
                item.last_movement_type === 'sale' ? 'Sortie' : 'Entrée',
          quantity: Math.floor(Math.random() * 10) + 1,
          date: new Date(item.last_movement_date).toLocaleString('fr-FR'),
          reason: item.last_movement_type === 'sale' ? 'Vente' : 'Réapprovisionnement',
          user: 'Admin'
        }));
      
      setMovements(generatedMovements);
      
    } catch (error) {
      console.error('Erreur chargement silencieux du stock:', error);
      // Ne pas afficher d'alerte pour un chargement en arrière-plan
    }
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      
      // Charger les produits
      await dispatch(fetchProducts());
      
      // Charger le stock depuis la base de données
      const stockItems = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour stock');
          return [];
        }
        return await databaseService.getAllByUser('stock', user.uid);
      })() as any[];
      const allProducts = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour products');
          return [];
        }
        return await databaseService.getAllByUser('products', user.uid);
      })() as any[];
      
      // Créer un map des produits pour récupérer les noms et catégories
      const productMap = new Map();
      allProducts.forEach(product => {
        productMap.set(product.id, {
          name: product.name,
          category: product.category_id || 'Non catégorisé'
        });
      });
      
      // ✅ DÉDUPLICATION ET NETTOYAGE DES STOCKS ORPHELINS
      console.log(`🔍 [STOCK CLEANUP] Début nettoyage des stocks orphelins...`);
      
      // Supprimer les stocks orphelins de la base de données
      const orphanStocks = stockItems.filter(stock => !productMap.has(stock.product_id));
      if (orphanStocks.length > 0) {
        console.log(`🗑️ [STOCK CLEANUP] Suppression de ${orphanStocks.length} stocks orphelins`);
        for (const orphan of orphanStocks) {
          console.log(`🗑️ [STOCK CLEANUP] Suppression stock orphelin: ${orphan.id} (product_id: ${orphan.product_id})`);
          await databaseService.delete('stock', orphan.id);
        }
      }
      
      // Filtrer les stocks valides (qui ont un produit correspondant)
      const validStocks = stockItems.filter(stock => productMap.has(stock.product_id));
      
      // ✅ DÉDUPLICATION PAR PRODUCT_ID : Garder seulement le stock le plus récent pour chaque produit
      const stockByProductId = new Map<string, any>();
      validStocks.forEach(stock => {
        const existing = stockByProductId.get(stock.product_id);
        if (!existing) {
          stockByProductId.set(stock.product_id, stock);
        } else {
          // Garder le stock le plus récent (par updated_at ou last_movement_date)
          const existingDate = existing.updated_at || existing.last_movement_date || existing.created_at || '';
          const currentDate = stock.updated_at || stock.last_movement_date || stock.created_at || '';
          if (currentDate > existingDate) {
            console.log(`🔄 [STOCK DEDUP] Remplacement stock pour product_id ${stock.product_id}: ancien ID ${existing.id} -> nouveau ID ${stock.id}`);
            stockByProductId.set(stock.product_id, stock);
            // Supprimer l'ancien stock de la base de données
            databaseService.delete('stock', existing.id).catch(err => {
              console.warn(`⚠️ Impossible de supprimer le doublon ${existing.id}:`, err);
            });
          } else {
            // Supprimer le stock plus ancien
            console.log(`🔄 [STOCK DEDUP] Suppression doublon pour product_id ${stock.product_id}: ID ${stock.id} (plus ancien)`);
            databaseService.delete('stock', stock.id).catch(err => {
              console.warn(`⚠️ Impossible de supprimer le doublon ${stock.id}:`, err);
            });
          }
        }
      });
      
      // Transformer les données de stock avec déduplication par ID unique
      const transformedStock: StockItem[] = Array.from(stockByProductId.values())
        .map(stock => {
          const product = productMap.get(stock.product_id);
          const status = getStockStatus(stock.quantity_current, stock.quantity_min);
          
          return {
            id: stock.id,
            product_id: stock.product_id,
            product_name: product.name,
            product_category: product.category || 'Non catégorisé',
            quantity_current: stock.quantity_current,
            quantity_min: stock.quantity_min,
            quantity_max: stock.quantity_max,
            last_movement_date: stock.last_movement_date,
            last_movement_type: stock.last_movement_type,
            status,
            sync_status: stock.sync_status || 'synced'
          };
        })
        // ✅ DÉDUPLICATION FINALE : Garder seulement le premier stock avec chaque ID unique (sécurité)
        .reduce((unique: StockItem[], stock) => {
          if (!unique.find(s => s.id === stock.id)) {
            unique.push(stock);
          }
          return unique;
        }, []);
      
      console.log(`✅ [STOCK CLEANUP] ${transformedStock.length} stocks valides après nettoyage`);
      
      setStockData(transformedStock);
      
      console.log(`📊 [STOCK DEBUG] ${transformedStock.length} éléments de stock chargés`);
      console.log(`📊 [STOCK DEBUG] Détails:`, transformedStock.map(item => ({
        id: item.id,
        product_name: item.product_name,
        quantity_current: item.quantity_current
      })));
      
      // Générer des mouvements fictifs basés sur les données réelles
      const generatedMovements: StockMovement[] = transformedStock
        .filter(item => item.last_movement_date)
        .slice(0, 10) // Limiter à 10 mouvements récents
        .map((item, index) => ({
          id: `movement-${index}`,
          product_id: item.product_id,
          product_name: item.product_name,
          type: item.last_movement_type === 'initial' ? 'Entrée' : 
                item.last_movement_type === 'sale' ? 'Sortie' : 'Entrée',
          quantity: Math.floor(Math.random() * 10) + 1,
          date: new Date(item.last_movement_date).toLocaleString('fr-FR'),
          reason: item.last_movement_type === 'sale' ? 'Vente' : 'Réapprovisionnement',
          user: 'Admin'
        }));
      
      setMovements(generatedMovements);
      
    } catch (error) {
      console.error('Erreur chargement stock:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du stock');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current: number, min: number): 'Normal' | 'Stock faible' | 'Rupture' => {
    if (current === 0) return 'Rupture';
    if (current <= min) return 'Stock faible';
    return 'Normal';
  };

  const filters = ['Tous', 'Stock faible', 'Rupture', 'Normal'];

  const filteredStock = stockData
    .filter(item => {
      // Filtre par statut
      const statusMatch = selectedFilter === 'Tous' || item.status === selectedFilter;
      
      // Filtre par recherche
      const searchMatch = !searchQuery || 
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_category.toLowerCase().includes(searchQuery.toLowerCase());
      
      return statusMatch && searchMatch;
    })
    // ✅ DÉDUPLICATION : Garder seulement le premier stock avec chaque ID unique
    .reduce((unique: StockItem[], stock) => {
      if (!unique.find(s => s.id === stock.id)) {
        unique.push(stock);
      }
      return unique;
    }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return '#34C759';
      case 'Stock faible': return '#FF9500';
      case 'Rupture': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'Normal': return '#E8F5E8';
      case 'Stock faible': return '#FFF4E6';
      case 'Rupture': return '#FFEBEB';
      default: return '#F0F0F0';
    }
  };

  const getMovementColor = (movement: string) => {
    return movement.startsWith('+') ? '#34C759' : '#FF3B30';
  };

  const getStockPercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  // Handler pour ouvrir le modal de détails et réapprovisionnement
  const handleProductPress = async (item: StockItem) => {
    try {
      setSelectedProduct(item);
      setRestockQuantity('0');
      
      // Charger les données de l'entrepôt
      await loadWarehouseData();
      
      // Ouvrir le modal
      setShowProductDetailModal(true);
    } catch (error) {
      console.error('Erreur chargement détails produit:', error);
    }
  };

  // Réapprovisionner un produit individuel
  const handleRestockProduct = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);
      
      const quantity = parseInt(restockQuantity) || 0;
      
      if (quantity <= 0) {
        Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
        return;
      }
      
      // Vérifier si le produit existe dans l'entrepôt
      const warehouse = warehouseData.find(w => w.product_id === selectedProduct.product_id);
      
      console.log('🔍 [DEBUG RESTOCK] Recherche produit:', selectedProduct.product_id);
      console.log('🔍 [DEBUG RESTOCK] Nombre total d\'inventory chargés:', warehouseData.length);
      console.log('🔍 [DEBUG RESTOCK] Produits dans inventory:', warehouseData.map(w => ({ product_id: w.product_id })));
      
      if (!warehouse) {
        console.error('❌ [DEBUG RESTOCK] Produit non trouvé dans inventory');
        Alert.alert(
          'Erreur', 
          `Le produit "${selectedProduct.product_name}" n'existe pas dans votre entrepôt.\n\nVeuillez ajouter ce produit dans un entrepôt depuis l'onglet "Entrepôts".`
        );
        return;
      }
      
      console.log('✅ [DEBUG RESTOCK] Produit trouvé dans inventory:', warehouse);
      
      if (warehouse.quantity_available < quantity) {
        Alert.alert(
          'Erreur', 
          `Stock entrepôt insuffisant.\n\nDisponible: ${warehouse.quantity_available} unités\nDemandé: ${quantity} unités`
        );
        return;
      }
      
      // Récupérer l'utilisateur actuel
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }
      
      // Récupérer le produit pour obtenir le prix
      const allProducts = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour products');
          return [];
        }
        return await databaseService.getAllByUser('products', user.uid);
      })() as any[];
      const product = allProducts.find(p => p.id === selectedProduct.product_id);
      
      // 1. Réduire la quantité de l'entrepôt (dans inventory)
      await databaseService.update('inventory', warehouse.id, {
        quantity_available: warehouse.quantity_available - quantity,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'transfer',
        sync_status: 'pending'
      });
      
      // Ajouter à la queue de synchronisation pour l'inventory
      await syncService.addToSyncQueue('inventory', warehouse.id, 'update', {
        product_id: selectedProduct.product_id,
        location_id: warehouse.location_id,
        quantity_available: warehouse.quantity_available - quantity,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'transfer'
      });
      
      // 2. Augmenter la quantité du stock magasin
      const newStockQuantity = selectedProduct.quantity_current + quantity;
      
      // Invalider le cache AVANT la mise à jour pour forcer un rechargement depuis AsyncStorage
      databaseService.invalidateCache('stock');
      
      // Mettre à jour le stock dans AsyncStorage
      await databaseService.update('stock', selectedProduct.id, {
        quantity_current: newStockQuantity,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'transfer',
        sync_status: 'pending'
      });
      
      console.log(`✅ [RESTOCK DEBUG] Stock mis à jour localement: ${selectedProduct.product_name} -> ${newStockQuantity}`);
      
      // Mettre à jour immédiatement l'état local pour éviter l'affichage de l'ancien état
      setStockData(prevStock => {
        const updated = prevStock.map(item => 
          item.id === selectedProduct.id
            ? { ...item, quantity_current: newStockQuantity, last_movement_date: new Date().toISOString() }
            : item
        );
        return updated;
      });
      
      // Ajouter à la queue de synchronisation pour le stock
      await syncService.addToSyncQueue('stock', selectedProduct.id, 'update', {
        product_id: selectedProduct.product_id,
        quantity_current: newStockQuantity,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'transfer'
      });
      
      // 3. Créer un mouvement de stock
      const movementId = await databaseService.insert('stock_movements', {
        movement_number: `MV-${Date.now()}`,
        movement_date: new Date().toISOString(),
        movement_type: 'entry',
        location_id: warehouse.location_id || '',
        product_id: selectedProduct.product_id,
        product_name: selectedProduct.product_name,
        quantity: quantity,
        quantity_before: selectedProduct.quantity_current,
        quantity_after: newStockQuantity,
        reference_id: warehouse.id,
        reference_type: 'warehouse_transfer',
        notes: `Réapprovisionnement depuis entrepôt`,
        created_by: currentUser.uid,
        created_by_name: currentUser.email || 'Utilisateur',
        created_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      
      // Ajouter à la queue de synchronisation pour le mouvement
      await syncService.addToSyncQueue('stock_movements', movementId, 'create', {
        movement_number: `MV-${Date.now()}`,
        movement_date: new Date().toISOString(),
        movement_type: 'entry',
        location_id: warehouse.location_id || '',
        product_id: selectedProduct.product_id,
        product_name: selectedProduct.product_name,
        quantity: quantity,
        quantity_before: selectedProduct.quantity_current,
        quantity_after: newStockQuantity,
        reference_id: warehouse.id,
        reference_type: 'warehouse_transfer',
        notes: `Réapprovisionnement depuis entrepôt`,
        created_by: currentUser.uid,
        created_by_name: currentUser.email || 'Utilisateur',
      });
      
      // Invalider tous les caches liés
      databaseService.invalidateCache('inventory');
      databaseService.invalidateCache('stock_movements');
      
      // Recharger les données depuis AsyncStorage après un court délai pour s'assurer que tout est écrit
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadStockData();
      await loadWarehouseData();
      
      // Synchroniser APRÈS le rechargement pour éviter que le listener écrase nos données
      if (isConnected) {
        console.log(`🔄 [RESTOCK DEBUG] Démarrage synchronisation après ${new Date().getTime()}`);
        // Attendre un peu pour que l'UI se mette à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        await syncService.startSync();
        console.log(`✅ [RESTOCK DEBUG] Synchronisation terminée`);
      }
      
      // Fermer le modal
      setShowProductDetailModal(false);
      
      Alert.alert('Succès', `✅ ${quantity} unités de "${selectedProduct.product_name}" ont été transférées de l'entrepôt vers le magasin !`);
    } catch (error) {
      console.error('Erreur réapprovisionnement:', error);
      Alert.alert('Erreur', 'Impossible de réapprovisionner le produit');
    } finally {
      setLoading(false);
    }
  };

  // Actions fonctionnelles
  // Charger les données de l'entrepôt (depuis inventory au lieu de warehouse)
  const loadWarehouseData = async () => {
    try {
      const inventory = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour inventory');
          return [];
        }
        return await databaseService.getAllByUser('inventory', user.uid);
      })() as any[];
      
      // Transformer les données d'inventory en format compatible avec le code existant
      const warehouse = inventory.map(inv => ({
        id: inv.id,
        product_id: inv.product_id,
        quantity_available: inv.quantity_available,
        warehouse_min: inv.quantity_min,
        warehouse_max: inv.quantity_max,
        location_id: inv.location_id,
      }));
      
      console.log(`🏢 [LOAD WAREHOUSE] ${warehouse.length} entrées d'inventory chargées`);
      if (warehouse.length > 0) {
        console.log('🏢 [LOAD WAREHOUSE] Exemples de product_ids:', warehouse.slice(0, 3).map(w => w.product_id));
        console.log('🏢 [LOAD WAREHOUSE] Exemples de location_ids:', warehouse.slice(0, 3).map(w => w.location_id));
      } else {
        console.warn('⚠️ [LOAD WAREHOUSE] AUCUN inventory trouvé dans la BDD !');
        const allInv = await databaseService.getAll('inventory');
        console.log(`⚠️ [LOAD WAREHOUSE DEBUG] Total inventory dans la BDD: ${allInv.length}`);
        allInv.forEach((invItem: any) => {
          console.log(`⚠️ [LOAD WAREHOUSE DEBUG] Inventory: product_id=${invItem.product_id}, location_id=${invItem.location_id}, created_by=${invItem.created_by}`);
        });
      }
      
      setWarehouseData(warehouse);
      console.log(`🏢 [LOAD WAREHOUSE] ${warehouse.length} entrées d\'inventory chargées pour réapprovisionnement`);
    } catch (error) {
      console.error('Erreur chargement inventory:', error);
    }
  };

  // Ouvrir la modale de réapprovisionnement
  const handleReapprovision = async () => {
    try {
      setLoading(true);
      
      // Charger les données de l'entrepôt
      await loadWarehouseData();
      
      // Filtrer les produits en stock faible ou rupture
      const lowStockItems = stockData.filter(item => 
        item.status === 'Stock faible' || item.status === 'Rupture'
      );
      
      if (lowStockItems.length === 0) {
        Alert.alert('Information', 'Aucun produit en stock faible ou rupture');
        return;
      }
      
      // Initialiser la sélection
      const initialSelection: {[key: string]: {selected: boolean, quantity: number}} = {};
      lowStockItems.forEach(item => {
        initialSelection[item.id] = {
          selected: false,
          quantity: 0
        };
      });
      setSelectedProducts(initialSelection);
      
      // Ouvrir la modale
      setShowRestockModal(true);
    } catch (error) {
      console.error('Erreur ouverture modale:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la modale de réapprovisionnement');
    } finally {
      setLoading(false);
    }
  };

  // Transférer de l'entrepôt vers le stock magasin
  const handleTransferFromWarehouse = async () => {
    try {
      setLoading(true);
      
      // Récupérer les produits sélectionnés
      const selectedItems = Object.entries(selectedProducts)
        .filter(([_, data]) => data.selected && data.quantity > 0);
      
      if (selectedItems.length === 0) {
        Alert.alert('Attention', 'Veuillez sélectionner au moins un produit et une quantité');
        return;
      }
      
      let transferredCount = 0;
      let errors: string[] = [];
      
      // Récupérer l'utilisateur actuel pour les mouvements de stock
      const currentUser = await getCurrentUser();
      
      for (const [stockId, {quantity}] of selectedItems) {
        try {
          const stockItem = stockData.find(item => item.id === stockId);
          if (!stockItem) continue;
          
          // Récupérer l'entrepôt pour ce produit
          const warehouse = warehouseData.find(w => w.product_id === stockItem.product_id);
          
          if (!warehouse) {
            errors.push(`${stockItem.product_name}: Pas d'entrepôt trouvé`);
            continue;
          }
          
          if (warehouse.quantity_available < quantity) {
            errors.push(`${stockItem.product_name}: Stock entrepôt insuffisant (${warehouse.quantity_available} disponibles)`);
            continue;
          }
          
          // 1. Réduire la quantité de l'entrepôt (dans inventory)
          await databaseService.update('inventory', warehouse.id, {
            quantity_available: warehouse.quantity_available - quantity,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'transfer',
            sync_status: 'pending'
          });
          
          // Ajouter à la queue de synchronisation pour l'inventory
          await syncService.addToSyncQueue('inventory', warehouse.id, 'update', {
            product_id: stockItem.product_id,
            location_id: warehouse.location_id,
            quantity_available: warehouse.quantity_available - quantity,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'transfer'
          });
          
          // 2. Augmenter la quantité du stock magasin
          const newStockQuantity = stockItem.quantity_current + quantity;
          await databaseService.update('stock', stockId, {
            quantity_current: newStockQuantity,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'transfer',
            sync_status: 'pending'
          });
          
          // Ajouter à la queue de synchronisation pour le stock
          await syncService.addToSyncQueue('stock', stockId, 'update', {
            product_id: stockItem.product_id,
            quantity_current: newStockQuantity,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'transfer'
          });
          
          // 3. Créer un mouvement de stock
          if (currentUser) {
            const movementId = await databaseService.insert('stock_movements', {
              movement_number: `MV-${Date.now()}`,
              movement_date: new Date().toISOString(),
              movement_type: 'entry',
              location_id: warehouse.location_id || '',
              product_id: stockItem.product_id,
              product_name: stockItem.product_name,
              quantity: quantity,
              quantity_before: stockItem.quantity_current,
              quantity_after: newStockQuantity,
              reference_id: warehouse.id,
              reference_type: 'warehouse_transfer',
              notes: `Réapprovisionnement depuis entrepôt`,
              created_by: currentUser.uid,
              created_by_name: currentUser.email || 'Utilisateur',
              created_at: new Date().toISOString(),
              sync_status: 'pending'
            });
            
            // Ajouter à la queue de synchronisation pour le mouvement
            await syncService.addToSyncQueue('stock_movements', movementId, 'create', {
              movement_number: `MV-${Date.now()}`,
              movement_date: new Date().toISOString(),
              movement_type: 'entry',
              location_id: warehouse.location_id || '',
              product_id: stockItem.product_id,
              product_name: stockItem.product_name,
              quantity: quantity,
              quantity_before: stockItem.quantity_current,
              quantity_after: newStockQuantity,
              reference_id: warehouse.id,
              reference_type: 'warehouse_transfer',
              notes: `Réapprovisionnement depuis entrepôt`,
              created_by: currentUser.uid,
              created_by_name: currentUser.email || 'Utilisateur',
            });
          }
          
          transferredCount++;
          console.log(`✅ Transfert réussi: ${quantity} unités de ${stockItem.product_name}`);
        } catch (error) {
          const itemName = stockData.find(s => s.id === stockId)?.product_name || 'Produit inconnu';
          console.error(`Erreur transfert ${itemName}:`, error);
          errors.push(`${itemName}: Erreur transfert`);
        }
      }
      
      console.log(`✅ [RESTOCK GROUP DEBUG] Mise à jour locale terminée pour ${transferredCount} produits`);
      
      // Recharger les données AVANT la synchronisation pour éviter les conflits avec le listener
      databaseService.invalidateCache('stock');
      databaseService.invalidateCache('inventory');
      await loadStockData();
      await loadWarehouseData();
      
      // Synchroniser APRÈS le rechargement pour éviter que le listener écrase nos données
      if (isConnected) {
        console.log(`🔄 [RESTOCK GROUP DEBUG] Démarrage synchronisation après ${new Date().getTime()}`);
        // Attendre un peu pour que l'UI se mette à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        await syncService.startSync();
        console.log(`✅ [RESTOCK GROUP DEBUG] Synchronisation terminée`);
      }
      
      // Fermer la modale
      setShowRestockModal(false);
      
      // Afficher le résultat
      if (errors.length > 0) {
        Alert.alert(
          'Réapprovisionnement Partiel',
          `✅ ${transferredCount} produits réapprovisionnés\n\n❌ Erreurs:\n${errors.join('\n')}`
        );
      } else {
        Alert.alert('Succès', `✅ ${transferredCount} produits réapprovisionnés depuis l'entrepôt !`);
      }
    } catch (error) {
      console.error('Erreur transfert entrepôt:', error);
      Alert.alert('Erreur', 'Impossible de transférer depuis l\'entrepôt');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    const reportData = {
      totalProducts: stockData.length,
      lowStock: stockData.filter(item => item.status === 'Stock faible').length,
      outOfStock: stockData.filter(item => item.status === 'Rupture').length,
      normalStock: stockData.filter(item => item.status === 'Normal').length,
      totalValue: stockData.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (item.quantity_current * (product?.price_sell || 0));
      }, 0)
    };
    
    Alert.alert(
      'Rapport de Stock',
      `📊 Résumé du Stock:\n\n` +
      `• Total produits: ${reportData.totalProducts}\n` +
      `• Stock normal: ${reportData.normalStock}\n` +
      `• Stock faible: ${reportData.lowStock}\n` +
      `• Ruptures: ${reportData.outOfStock}\n` +
      `• Valeur totale: ${reportData.totalValue.toLocaleString('fr-FR')} FCFA`,
      [{ text: 'OK' }]
    );
  };

  const handleClearStockCache = () => {
    Alert.alert(
      'Nettoyer le Cache',
      'Voulez-vous nettoyer le cache du stock ? Cela forcera le rechargement des données.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nettoyer',
          onPress: async () => {
            try {
              // Nettoyer le cache du stock
              databaseService.invalidateCache('stock');
              databaseService.invalidateCache('products');
              
              // Recharger les données
              await loadStockData();
              
              Alert.alert('Succès', 'Cache du stock nettoyé et données rechargées ! 🧹');
            } catch (error) {
              console.error('Erreur nettoyage cache:', error);
              Alert.alert('Erreur', 'Impossible de nettoyer le cache');
            }
          }
        }
      ]
    );
  };

  const handleSyncFromFirebase = () => {
    Alert.alert(
      'Synchroniser depuis Firebase',
      'Voulez-vous synchroniser le stock depuis Firebase ? Les doublons seront évités automatiquement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Synchroniser',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Nettoyer le cache
              databaseService.invalidateCache('stock');
              databaseService.invalidateCache('products');
              
              // Vérifier si l'utilisateur est connecté (mode production)
              const user = await getCurrentUser();
              if (!user) {
                Alert.alert('Erreur', 'Utilisateur non connecté');
                return;
              }
              
              // Synchroniser depuis Firebase
              const stockFromFirebase = await firebaseService.getStock();
              
              if (stockFromFirebase.length === 0) {
                Alert.alert('Information', 'Aucun stock trouvé dans Firebase');
                return;
              }
              
              // Synchroniser en évitant les doublons
              await syncStockWithoutDuplicates(stockFromFirebase);
              
              // Forcer l'invalidation du cache après synchronisation
              databaseService.invalidateCache('stock');
              databaseService.invalidateCache('products');
              
              // Recharger les données
              await loadStockData();
              
              Alert.alert('Succès', `${stockFromFirebase.length} éléments de stock synchronisés depuis Firebase ! 🔄`);
            } catch (error) {
              console.error('Erreur synchronisation Firebase:', error);
              Alert.alert('Erreur', 'Impossible de synchroniser depuis Firebase');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleForceResetStock = () => {
    Alert.alert(
      'Reset Complet du Stock',
      'ATTENTION: Cette action va supprimer TOUTES les données de stock locales et les remplacer par les données Firebase. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reset Complet',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // 1. Supprimer complètement la clé stock d'AsyncStorage
              await AsyncStorage.removeItem('stock');
              console.log('🗑️ Clé stock supprimée d\'AsyncStorage');
              
              // 2. Invalider complètement le cache
              databaseService.invalidateCache();
              console.log('🗑️ Cache complètement invalidé');
              
              // 3. Attendre un peu pour s'assurer que les changements sont pris en compte
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // 4. Vérifier si l'utilisateur est connecté (mode production)
              const user = await getCurrentUser();
              if (!user) {
                Alert.alert('Erreur', 'Utilisateur non connecté');
                return;
              }
              
              // 5. Synchroniser depuis Firebase
              const stockFromFirebase = await firebaseService.getStock();
              
              // 5. Ajouter le stock de Firebase
              for (const stockItem of stockFromFirebase) {
                const { id, ...stockWithoutId } = stockItem;
                await databaseService.insert('stock', {
                  ...stockWithoutId,
                  firebase_id: id,
                  sync_status: 'synced'
                });
              }
              
              // 6. Invalider le cache une dernière fois
              databaseService.invalidateCache('stock');
              databaseService.invalidateCache('products');
              
              // 7. Recharger les données
              await loadStockData();
              
              Alert.alert('Succès', `Reset complet terminé ! ${stockFromFirebase.length} éléments de stock synchronisés depuis Firebase ! 🔄`);
            } catch (error) {
              console.error('Erreur reset complet:', error);
              Alert.alert('Erreur', 'Impossible de faire le reset complet');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteStock = async (stockId: string, productName: string) => {
    Alert.alert(
      'Supprimer le Stock',
      `Êtes-vous sûr de vouloir supprimer le stock pour "${productName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Récupérer les données du stock AVANT suppression
              const stockData = await databaseService.getById('stock', stockId);
              
              // Supprimer le stock localement
              await databaseService.delete('stock', stockId);
              
              // Ajouter à la queue de synchronisation pour suppression en ligne
              if (stockData) {
                // Si l'ID local est déjà un ID Firebase, l'utiliser directement
                const firebaseId = (stockData as any).firebase_id || stockId;
                await syncService.addToSyncQueue('stock', firebaseId, 'delete', stockData);
                console.log(`🗑️ Stock "${productName}" ajouté à la queue de suppression (ID: ${firebaseId})`);
              } else {
                console.log(`⚠️ Stock "${productName}" sans données, suppression locale uniquement`);
              }
              
              // Recharger les données
              await loadStockData();
              
              Alert.alert('Succès', 'Stock supprimé avec succès ! 🗑️');
            } catch (error) {
              console.error('Erreur suppression stock:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le stock');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderStockItem = ({ item }: { item: StockItem }) => (
    <View style={styles.stockCardContainer}>
      <TouchableOpacity 
        style={styles.stockCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
      <View style={styles.stockHeader}>
        <View style={styles.stockInfo}>
            <Text style={styles.stockName}>{item.product_name}</Text>
            <Text style={styles.stockCategory}>{item.product_category}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBackgroundColor(item.status) },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.stockLevels}>
        <View style={styles.stockBar}>
          <View
            style={[
              styles.stockFill,
              {
                  width: `${getStockPercentage(item.quantity_current, item.quantity_max)}%`,
                backgroundColor: getStatusColor(item.status),
              },
            ]}
          />
        </View>
        <Text style={styles.stockText}>
            {item.quantity_current} / {item.quantity_max} unités
        </Text>
      </View>

      <View style={styles.stockDetails}>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Min:</Text>
            <Text style={styles.detailValue}>{item.quantity_min}</Text>
        </View>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Dernier mouvement:</Text>
            <Text style={[styles.detailValue, { 
              color: item.last_movement_type === 'sale' ? '#FF3B30' : '#34C759' 
            }]}>
              {item.last_movement_type === 'sale' ? '-' : '+'}
          </Text>
        </View>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.last_movement_date).toLocaleDateString('fr-FR')}
            </Text>
        </View>
      </View>

        {/* Bouton de suppression intégré dans la card */}
        <TouchableOpacity
          style={styles.deleteButtonInCard}
          onPress={(e) => {
            e.stopPropagation(); // Empêcher l'ouverture du modal
            handleDeleteStock(item.id, item.product_name);
          }}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
    </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  const renderMovement = ({ item }: { item: StockMovement }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <Text style={styles.movementProduct}>{item.product_name}</Text>
        <View
          style={[
            styles.movementType,
            {
              backgroundColor: item.type === 'Entrée' ? '#E8F5E8' : '#FFEBEB',
            },
          ]}
        >
          <Text
            style={[
              styles.movementTypeText,
              {
                color: item.type === 'Entrée' ? '#34C759' : '#FF3B30',
              },
            ]}
          >
            {item.type}
          </Text>
        </View>
      </View>
      
      <View style={styles.movementDetails}>
        <Text style={styles.movementQuantity}>
          {item.type === 'Entrée' ? '+' : '-'}{item.quantity} unités
        </Text>
        <Text style={styles.movementReason}>{item.reason}</Text>
      </View>
      
      <View style={styles.movementFooter}>
        <Text style={styles.movementDate}>{item.date}</Text>
        <Text style={styles.movementUser}>par {item.user}</Text>
      </View>
    </View>
  );

  const renderFilter = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter && styles.filterTextActive,
        ]}
      >
        {filter}
      </Text>
    </TouchableOpacity>
  );

  const getAlertCount = () => {
    return stockData.filter(item => item.status !== 'Normal').length;
  };

  const getWarehouseAlertCount = () => {
    return warehouseData.filter(w => w.quantity_available < w.warehouse_min).length;
  };

  if (loading) {
  return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du stock...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Inventaire</Text>
          
          {/* Icône recherche */}
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => {
              setShowSearchBar(!showSearchBar);
            }}
          >
            <Ionicons name="search-outline" size={dynamicSizes.fontSize.large} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Gestion des stocks et emplacements</Text>
        
        {/* Tabs internes */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'magasin' && styles.tabActive]}
            onPress={() => setActiveTab('magasin')}
          >
            <Ionicons 
              name="storefront" 
              size={20} 
              color={activeTab === 'magasin' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'magasin' && styles.tabTextActive]}>
              Magasin
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'entrepots' && styles.tabActive]}
            onPress={() => setActiveTab('entrepots')}
          >
            <Ionicons 
              name="business" 
              size={20} 
              color={activeTab === 'entrepots' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'entrepots' && styles.tabTextActive]}>
              Entrepôts
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Barre de recherche - affichée conditionnellement */}
        {showSearchBar && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom ou catégorie..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Masquer la barre de recherche si le texte est vide
                if (text === '') {
                  setShowSearchBar(false);
                }
              }}
              placeholderTextColor="#999"
              autoFocus={true}
            />
          </View>
        )}
        
        {getAlertCount() > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ {getAlertCount()} produit{getAlertCount() > 1 ? 's' : ''} nécessite{getAlertCount() > 1 ? 'nt' : ''} attention
            </Text>
          </View>
        )}
        
        {getWarehouseAlertCount() > 0 && (
          <View style={[styles.alertBanner, {backgroundColor: '#FFF4E6', borderLeftColor: '#FF9500'}]}>
            <Text style={[styles.alertText, {color: '#B8860B'}]}>
              🏢 {getWarehouseAlertCount()} entrepôt{getWarehouseAlertCount() > 1 ? 's' : ''} faible{getWarehouseAlertCount() > 1 ? 's' : ''} - Réapprovisionnement fournisseur nécessaire
            </Text>
          </View>
        )}
      </View>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'magasin' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map(renderFilter)}
        </ScrollView>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stockData.length}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stockData.filter(item => item.status === 'Stock faible').length}
          </Text>
          <Text style={styles.statLabel}>Stock faible</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stockData.filter(item => item.status === 'Rupture').length}
          </Text>
          <Text style={styles.statLabel}>Ruptures</Text>
        </View>
      </View>

      {/* Liste du stock */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>État du Stock</Text>
        <FlatList
          data={filteredStock}
          renderItem={renderStockItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Mouvements récents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mouvements Récents</Text>
        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Actions rapides */}
      <View style={styles.actionsContainer}>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleGenerateReport}
        >
          <Text style={styles.actionButtonTextSecondary}>📊 Rapport Stock</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </Text>
      </View>
    </ScrollView>
      ) : (
        <EntrepotsTab />
      )}

      {/* Modale de Réapprovisionnement */}
      <Modal
        visible={showRestockModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRestockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Réapprovisionnement</Text>
              <TouchableOpacity onPress={() => setShowRestockModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Sélectionnez les produits à réapprovisionner depuis l'entrepôt
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {stockData
                .filter(item => item.status === 'Stock faible' || item.status === 'Rupture')
                .map((item) => {
                  const warehouse = warehouseData.find(w => w.product_id === item.product_id);
                  const isSelected = selectedProducts[item.id]?.selected || false;
                  const quantity = selectedProducts[item.id]?.quantity || 0;

                  return (
                    <View key={item.id} style={styles.restockItem}>
                      <TouchableOpacity
                        style={styles.restockCheckbox}
                        onPress={() => {
                          setSelectedProducts(prev => ({
                            ...prev,
                            [item.id]: {
                              selected: !isSelected,
                              quantity: prev[item.id]?.quantity || 0
                            }
                          }));
                        }}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.restockInfo}>
                        <Text style={styles.restockProductName}>{item.product_name}</Text>
                        <View style={styles.restockDetails}>
                          <Text style={styles.restockDetailText}>
                            🏪 Magasin: <Text style={{fontWeight: 'bold', color: getStatusColor(item.status)}}>{item.quantity_current}</Text> / {item.quantity_max}
                          </Text>
                          <Text style={styles.restockDetailText}>
                            🏢 Entrepôt: <Text style={{fontWeight: 'bold', color: warehouse ? '#34C759' : '#FF3B30'}}>
                              {warehouse ? warehouse.quantity_available : 0}
                            </Text> disponibles
                          </Text>
                          {warehouse && warehouse.quantity_available < warehouse.warehouse_min && (
                            <Text style={[styles.restockDetailText, {color: '#FF9500'}]}>
                              ⚠️ Entrepôt faible (min: {warehouse.warehouse_min})
                            </Text>
                          )}
                        </View>

                        {isSelected && (
                          <View style={styles.quantityInputContainer}>
                            <Text style={styles.quantityLabel}>Quantité à transférer:</Text>
                            <View style={styles.quantityControls}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => {
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.max(0, quantity - 10)
                                    }
                                  }));
                                }}
                              >
                                <Text style={styles.quantityButtonText}>-10</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => {
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.max(0, quantity - 1)
                                    }
                                  }));
                                }}
                              >
                                <Text style={styles.quantityButtonText}>-</Text>
                              </TouchableOpacity>

                              <TextInput
                                style={styles.quantityInput}
                                value={quantity.toString()}
                                onChangeText={(text) => {
                                  const num = parseInt(text) || 0;
                                  const maxTransfer = warehouse?.quantity_available || 0;
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.min(num, maxTransfer)
                                    }
                                  }));
                                }}
                                keyboardType="numeric"
                              />

                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => {
                                  const maxTransfer = warehouse?.quantity_available || 0;
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.min(quantity + 1, maxTransfer)
                                    }
                                  }));
                                }}
                              >
                                <Text style={styles.quantityButtonText}>+</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => {
                                  const maxTransfer = warehouse?.quantity_available || 0;
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.min(quantity + 10, maxTransfer)
                                    }
                                  }));
                                }}
                              >
                                <Text style={styles.quantityButtonText}>+10</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.quantityButton, styles.maxButton]}
                                onPress={() => {
                                  const maxTransfer = warehouse?.quantity_available || 0;
                                  setSelectedProducts(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: maxTransfer
                                    }
                                  }));
                                }}
                              >
                                <Text style={[styles.quantityButtonText, {color: '#007AFF'}]}>MAX</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRestockModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleTransferFromWarehouse}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Transfert...' : 'Confirmer le Transfert'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de détails et réapprovisionnement individuel */}
      <Modal
        visible={showProductDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Détails Produit</Text>
              <TouchableOpacity onPress={() => setShowProductDetailModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Informations produit */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Informations du Produit</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Nom:</Text>
                    <Text style={styles.detailRowValue}>{selectedProduct.product_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Catégorie:</Text>
                    <Text style={styles.detailRowValue}>{selectedProduct.product_category}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Statut:</Text>
                    <View style={[styles.detailBadge, { backgroundColor: getStatusBackgroundColor(selectedProduct.status) }]}>
                      <Text style={[styles.detailBadgeText, { color: getStatusColor(selectedProduct.status) }]}>
                        {selectedProduct.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stock actuel */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Stock Actuel</Text>
                  <View style={styles.stockInfoContainer}>
                    <View style={styles.stockInfoBox}>
                      <Text style={styles.stockInfoLabel}>Stock actuel</Text>
                      <Text style={styles.stockInfoValue}>{selectedProduct.quantity_current}</Text>
                    </View>
                    <View style={styles.stockInfoBox}>
                      <Text style={styles.stockInfoLabel}>Stock minimum</Text>
                      <Text style={styles.stockInfoValue}>{selectedProduct.quantity_min}</Text>
                    </View>
                    <View style={styles.stockInfoBox}>
                      <Text style={styles.stockInfoLabel}>Stock maximum</Text>
                      <Text style={styles.stockInfoValue}>{selectedProduct.quantity_max}</Text>
                    </View>
                  </View>
                </View>

                {/* Entrepôt */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Stock Entrepôt</Text>
                  {(() => {
                    const warehouse = warehouseData.find(w => w.product_id === selectedProduct.product_id);
                    return warehouse ? (
                      <View style={styles.warehouseInfo}>
                        <View style={styles.warehouseQuantityBox}>
                          <Text style={styles.warehouseQuantityLabel}>Quantité disponible</Text>
                          <Text style={[styles.warehouseQuantityValue, { 
                            color: warehouse.quantity_available < warehouse.quantity_available ? '#FF3B30' : '#34C759' 
                          }]}>
                            {warehouse.quantity_available} unités
                          </Text>
                        </View>
                        {warehouse.quantity_available < warehouse.warehouse_min && (
                          <Text style={styles.warehouseWarning}>
                            ⚠️ Stock entrepôt faible (min: {warehouse.warehouse_min})
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.warehouseInfo}>
                        <Text style={styles.noWarehouseWarning}>
                          ⚠️ Ce produit n'existe pas dans votre entrepôt
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Formulaire de réapprovisionnement */}
                {(() => {
                  const warehouse = warehouseData.find(w => w.product_id === selectedProduct.product_id);
                  if (!warehouse) return null;
                  
                  return (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Réapprovisionner</Text>
                      <View style={styles.restockForm}>
                        <Text style={styles.restockLabel}>Quantité à transférer</Text>
                        <View style={styles.quantityInputRow}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              const qty = parseInt(restockQuantity) || 0;
                              setRestockQuantity(Math.max(0, qty - 10).toString());
                            }}
                          >
                            <Text style={styles.quantityButtonText}>-10</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              const qty = parseInt(restockQuantity) || 0;
                              setRestockQuantity(Math.max(0, qty - 1).toString());
                            }}
                          >
                            <Text style={styles.quantityButtonText}>-</Text>
                          </TouchableOpacity>

                          <TextInput
                            style={styles.quantityInputMain}
                            value={restockQuantity}
                            onChangeText={(text) => {
                              const num = parseInt(text) || 0;
                              const maxTransfer = warehouse?.quantity_available || 0;
                              setRestockQuantity(Math.min(num, maxTransfer).toString());
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                          />

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              const qty = parseInt(restockQuantity) || 0;
                              const maxTransfer = warehouse?.quantity_available || 0;
                              setRestockQuantity(Math.min(qty + 1, maxTransfer).toString());
                            }}
                          >
                            <Text style={styles.quantityButtonText}>+</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              const qty = parseInt(restockQuantity) || 0;
                              const maxTransfer = warehouse?.quantity_available || 0;
                              setRestockQuantity(Math.min(qty + 10, maxTransfer).toString());
                            }}
                          >
                            <Text style={styles.quantityButtonText}>+10</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.quantityButton, styles.maxButton]}
                            onPress={() => {
                              const maxTransfer = warehouse?.quantity_available || 0;
                              setRestockQuantity(maxTransfer.toString());
                            }}
                          >
                            <Text style={[styles.quantityButtonText, { color: '#007AFF' }]}>MAX</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowProductDetailModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleRestockProduct}
                disabled={loading || parseInt(restockQuantity) <= 0}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Transfert...' : 'Réapprovisionner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: dynamicSizes.spacing.lg,
    paddingTop: isTablet ? 50 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: dynamicSizes.spacing.sm,
  },
  headerIcon: {
    width: dynamicSizes.button.size,
    height: dynamicSizes.button.size,
    borderRadius: dynamicSizes.button.size / 2,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerIconText: {
    fontSize: dynamicSizes.fontSize.medium,
  },
  searchContainer: {
    marginBottom: dynamicSizes.spacing.md,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: dynamicSizes.fontSize.large,
    color: '#666',
    marginTop: dynamicSizes.spacing.xs,
    marginBottom: dynamicSizes.spacing.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: dynamicSizes.spacing.sm,
    marginTop: dynamicSizes.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dynamicSizes.spacing.xs,
    paddingVertical: dynamicSizes.spacing.sm,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tabActive: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  alertBanner: {
    backgroundColor: '#FFF4E6',
    padding: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  alertText: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#B8860B',
    fontWeight: '500',
  },
  filtersContainer: {
    paddingVertical: dynamicSizes.spacing.lg,
    paddingLeft: dynamicSizes.spacing.lg,
  },
  filterButton: {
    paddingHorizontal: dynamicSizes.spacing.lg,
    paddingVertical: dynamicSizes.spacing.sm,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: dynamicSizes.spacing.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: dynamicSizes.spacing.lg,
    marginBottom: dynamicSizes.spacing.lg,
    borderRadius: 12,
    padding: dynamicSizes.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: dynamicSizes.spacing.lg,
    marginBottom: dynamicSizes.spacing.lg,
  },
  sectionTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.lg,
  },
  stockCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.md,
  },
  stockCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: dynamicSizes.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  deleteButtonInCard: {
    position: 'absolute',
    top: dynamicSizes.spacing.sm,
    right: dynamicSizes.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteStockButton: {
    width: dynamicSizes.button.size + 8,
    height: dynamicSizes.button.size + 8,
    borderRadius: (dynamicSizes.button.size + 8) / 2,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: dynamicSizes.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteStockButtonText: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#fff',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: dynamicSizes.spacing.md,
    paddingRight: 40, // Espace pour le bouton de suppression
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  stockCategory: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: dynamicSizes.spacing.sm,
    paddingVertical: dynamicSizes.spacing.xs,
    borderRadius: 6,
  },
  statusText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
  },
  stockLevels: {
    marginBottom: dynamicSizes.spacing.md,
  },
  stockBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: dynamicSizes.spacing.sm,
  },
  stockFill: {
    height: '100%',
    borderRadius: 4,
  },
  stockText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    textAlign: 'center',
  },
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  movementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: dynamicSizes.spacing.lg,
    marginBottom: dynamicSizes.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.sm,
  },
  movementProduct: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  movementType: {
    paddingHorizontal: dynamicSizes.spacing.sm,
    paddingVertical: dynamicSizes.spacing.xs,
    borderRadius: 6,
  },
  movementTypeText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
  },
  movementDetails: {
    marginBottom: dynamicSizes.spacing.sm,
  },
  movementQuantity: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  movementReason: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
  },
  movementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementDate: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  movementUser: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: dynamicSizes.spacing.lg,
    marginBottom: 100, // Espace pour la barre de navigation
    gap: dynamicSizes.spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: dynamicSizes.spacing.md, // Réduit le padding vertical
    paddingHorizontal: dynamicSizes.spacing.sm, // Réduit le padding horizontal
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#007AFF',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
  footer: {
    padding: dynamicSizes.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  // Styles de la modale de réapprovisionnement
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: dynamicSizes.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
    padding: dynamicSizes.spacing.lg,
    paddingTop: dynamicSizes.spacing.md,
  },
  modalScroll: {
    maxHeight: height * 0.5,
    paddingHorizontal: dynamicSizes.spacing.lg,
  },
  restockItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: dynamicSizes.spacing.md,
    marginBottom: dynamicSizes.spacing.md,
  },
  restockCheckbox: {
    marginRight: dynamicSizes.spacing.md,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  restockInfo: {
    flex: 1,
  },
  restockProductName: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.xs,
  },
  restockDetails: {
    marginBottom: dynamicSizes.spacing.sm,
  },
  restockDetailText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginBottom: 2,
  },
  quantityInputContainer: {
    marginTop: dynamicSizes.spacing.md,
    padding: dynamicSizes.spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  quantityLabel: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dynamicSizes.spacing.xs,
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: dynamicSizes.spacing.xs,
    paddingHorizontal: dynamicSizes.spacing.sm,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  maxButton: {
    backgroundColor: '#E3F2FD',
  },
  quantityButtonText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: dynamicSizes.spacing.xs,
    paddingHorizontal: dynamicSizes.spacing.sm,
    fontSize: dynamicSizes.fontSize.medium,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: dynamicSizes.spacing.lg,
    gap: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: dynamicSizes.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#1a1a1a',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
  // Styles pour le modal de détails produit
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: dynamicSizes.spacing.lg,
    marginBottom: dynamicSizes.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailSectionTitle: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: dynamicSizes.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRowLabel: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
  },
  detailRowValue: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  detailBadge: {
    paddingHorizontal: dynamicSizes.spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
  },
  stockInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dynamicSizes.spacing.sm,
  },
  stockInfoBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    alignItems: 'center',
  },
  stockInfoLabel: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginBottom: 4,
  },
  stockInfoValue: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  warehouseInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
  },
  warehouseQuantityBox: {
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.sm,
  },
  warehouseQuantityLabel: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginBottom: 4,
  },
  warehouseQuantityValue: {
    fontSize: dynamicSizes.fontSize.xlarge,
    fontWeight: 'bold',
  },
  warehouseWarning: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#FF9500',
    textAlign: 'center',
  },
  noWarehouseWarning: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#FF3B30',
    textAlign: 'center',
    fontWeight: '600',
  },
  restockForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
  },
  restockLabel: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.sm,
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dynamicSizes.spacing.xs,
  },
  quantityInputMain: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: dynamicSizes.spacing.sm,
    paddingHorizontal: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.large,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
