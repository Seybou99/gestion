# 🔍 GUIDE DIAGNOSTIC VENTES - PROBLÈME RÉSOLU

## 🐛 **PROBLÈME IDENTIFIÉ**

**Symptôme :** Les ventes ne s'affichent pas dans l'historique des ventes
**Cause probable :** Problème de sauvegarde ou de chargement des ventes

---

## 🔧 **ÉTAPES DE DIAGNOSTIC**

### **ÉTAPE 1 : Vérifier les logs de création de vente**

**Action :** Effectuez une nouvelle vente et observez les logs

**Logs attendus :**
```
🔍 [DEBUG] Utilisateur actuel: {user object}
🔍 [DEBUG] isConnected: true/false
✅ [DEBUG] Utilisateur Firebase: {currentUser object}
🔍 [DEBUG] Données de vente: {saleData object}
✅ [DEBUG] Vente créée avec ID: {saleId}
🔍 [DEBUG] Création des items de vente pour X articles
🔍 [DEBUG] Item de vente: {itemData object}
✅ [DEBUG] Item de vente créé
🔍 [DEBUG] Ajout de la vente à la queue de synchronisation
✅ [DEBUG] Vente ajoutée à la queue de synchronisation
```

**Si ces logs n'apparaissent pas :** Le problème est dans la fonction `processSale`

### **ÉTAPE 2 : Diagnostic dans la console de l'application**

**Action :** Copiez et collez ce code dans la console de l'application :

```javascript
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function debugSalesInApp() {
  try {
    console.log('🔍 [DEBUG SALES] Début du diagnostic dans l\'app...');
    
    // 1. Vérifier les ventes
    const salesData = await AsyncStorage.getItem('sales');
    if (salesData) {
      const sales = JSON.parse(salesData);
      console.log('✅ [DEBUG SALES]', sales.length, 'ventes trouvées');
      
      sales.forEach((sale, index) => {
        console.log('📋 [DEBUG SALES] Vente', index + 1, ':', {
          id: sale.id,
          user_id: sale.user_id,
          created_by: sale.created_by,
          total_amount: sale.total_amount,
          sale_date: sale.sale_date,
          sync_status: sale.sync_status
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune vente trouvée');
    }
    
    // 2. Vérifier les items de vente
    const saleItemsData = await AsyncStorage.getItem('sale_items');
    if (saleItemsData) {
      const saleItems = JSON.parse(saleItemsData);
      console.log('✅ [DEBUG SALES]', saleItems.length, 'items de vente trouvés');
      
      saleItems.forEach((item, index) => {
        console.log('🛒 [DEBUG SALES] Item', index + 1, ':', {
          sale_id: item.sale_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucun item de vente trouvé');
    }
    
    // 3. Vérifier la queue de synchronisation
    const syncQueueData = await AsyncStorage.getItem('sync_queue');
    if (syncQueueData) {
      const syncQueue = JSON.parse(syncQueueData);
      const salesInQueue = syncQueue.filter(item => item.table === 'sales');
      console.log('✅ [DEBUG SALES]', salesInQueue.length, 'ventes dans la queue');
      
      salesInQueue.forEach((item, index) => {
        console.log('🔄 [DEBUG SALES] Queue Item', index + 1, ':', {
          table: item.table,
          id: item.id,
          operation: item.operation,
          user_id: item.data.user_id,
          created_by: item.data.created_by,
          total_amount: item.data.total_amount
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune queue de synchronisation');
    }
    
    console.log('✅ [DEBUG SALES] Diagnostic terminé !');
    
  } catch (error) {
    console.error('❌ [DEBUG SALES] Erreur:', error);
  }
}

// Exécuter le diagnostic
debugSalesInApp();
```

### **ÉTAPE 3 : Test de création de vente**

**Action :** Copiez et collez ce code dans la console pour créer une vente de test :

```javascript
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function testSaleCreation() {
  try {
    console.log('🧪 [TEST SALE] Début du test de création de vente...');
    
    // 1. Créer une vente de test
    const testSale = {
      id: 'test-sale-' + Date.now(),
      user_id: 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2',
      customer_id: null,
      location_id: 'default_location',
      total_amount: 1000,
      tax_amount: 180,
      discount_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      sale_date: new Date().toISOString(),
      created_by: 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2',
      created_by_name: 'diokolo1@gmail.com',
      notes: 'Test de création de vente',
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('🧪 [TEST SALE] Vente de test créée:', testSale);
    
    // 2. Sauvegarder dans AsyncStorage
    const existingSalesData = await AsyncStorage.getItem('sales');
    let sales = [];
    
    if (existingSalesData) {
      sales = JSON.parse(existingSalesData);
    }
    
    sales.push(testSale);
    await AsyncStorage.setItem('sales', JSON.stringify(sales));
    console.log('✅ [TEST SALE] Vente sauvegardée dans AsyncStorage');
    
    // 3. Créer des items de vente de test
    const testSaleItems = [
      {
        id: 'test-item-1-' + Date.now(),
        sale_id: testSale.id,
        product_id: 'test-product-1',
        product_name: 'Produit Test 1',
        quantity: 2,
        unit_price: 500,
        total_price: 1000,
      }
    ];
    
    console.log('🧪 [TEST SALE] Items de test créés:', testSaleItems);
    
    // 4. Sauvegarder les items
    const existingSaleItemsData = await AsyncStorage.getItem('sale_items');
    let saleItems = [];
    
    if (existingSaleItemsData) {
      saleItems = JSON.parse(existingSaleItemsData);
    }
    
    saleItems.push(...testSaleItems);
    await AsyncStorage.setItem('sale_items', JSON.stringify(saleItems));
    console.log('✅ [TEST SALE] Items sauvegardés dans AsyncStorage');
    
    // 5. Vérifier que tout est bien sauvegardé
    const salesDataAfter = await AsyncStorage.getItem('sales');
    const saleItemsDataAfter = await AsyncStorage.getItem('sale_items');
    
    if (salesDataAfter) {
      const salesAfter = JSON.parse(salesDataAfter);
      const testSaleFound = salesAfter.find(sale => sale.id === testSale.id);
      
      if (testSaleFound) {
        console.log('✅ [TEST SALE] Vente trouvée après sauvegarde:', testSaleFound);
      } else {
        console.log('❌ [TEST SALE] Vente NON trouvée après sauvegarde');
      }
    }
    
    if (saleItemsDataAfter) {
      const saleItemsAfter = JSON.parse(saleItemsDataAfter);
      const testItemsFound = saleItemsAfter.filter(item => item.sale_id === testSale.id);
      
      console.log('✅ [TEST SALE]', testItemsFound.length, 'items trouvés après sauvegarde');
      testItemsFound.forEach((item, index) => {
        console.log('🛒 [TEST SALE] Item', index + 1, ':', item);
      });
    }
    
    console.log('✅ [TEST SALE] Test terminé !');
    console.log('📋 [TEST SALE] Maintenant, vérifiez l\'historique des ventes dans l\'application');
    
  } catch (error) {
    console.error('❌ [TEST SALE] Erreur lors du test:', error);
  }
}

// Exécuter le test
testSaleCreation();
```

---

## 🔍 **DIAGNOSTIC DES PROBLÈMES POSSIBLES**

### **PROBLÈME 1 : Ventes non sauvegardées**

**Symptômes :**
- ❌ Aucune vente trouvée dans AsyncStorage
- ❌ Logs de création de vente manquants

**Solutions :**
1. Vérifier que `databaseService.insert('sales', saleData)` fonctionne
2. Vérifier les permissions AsyncStorage
3. Vérifier l'utilisateur Firebase authentifié

### **PROBLÈME 2 : Items de vente manquants**

**Symptômes :**
- ✅ Ventes trouvées
- ❌ Aucun item de vente trouvé

**Solutions :**
1. Vérifier la création des items dans la boucle
2. Vérifier que `sale_id` correspond bien
3. Ajouter `product_name` dans les items

### **PROBLÈME 3 : Filtrage par utilisateur incorrect**

**Symptômes :**
- ✅ Ventes sauvegardées
- ❌ Ventes non affichées dans l'historique

**Solutions :**
1. Vérifier que `user_id` correspond à l'utilisateur connecté
2. Vérifier le filtre dans `loadSales()`
3. Vérifier que `created_by` est correct

### **PROBLÈME 4 : Erreur de chargement**

**Symptômes :**
- ✅ Ventes dans AsyncStorage
- ❌ Erreur lors du chargement dans l'historique

**Solutions :**
1. Vérifier les logs de `loadSales()`
2. Vérifier la fonction `handleSalePress()`
3. Vérifier le chargement des items

---

## 📋 **CHECKLIST DE DIAGNOSTIC**

### **Vérifications de base :**
- [ ] L'utilisateur est bien authentifié
- [ ] La fonction `processSale` est appelée
- [ ] Les logs de debug apparaissent
- [ ] `databaseService.insert` retourne un ID

### **Vérifications AsyncStorage :**
- [ ] Les ventes sont sauvegardées
- [ ] Les items de vente sont sauvegardés
- [ ] La queue de synchronisation contient les ventes
- [ ] Les `user_id` et `created_by` sont corrects

### **Vérifications affichage :**
- [ ] La fonction `loadSales()` charge les ventes
- [ ] Le filtre par utilisateur fonctionne
- [ ] Les items se chargent correctement
- [ ] L'interface s'affiche sans erreur

---

## 🚀 **PROCHAINES ÉTAPES**

1. **Effectuez une vente** et observez les logs
2. **Exécutez le diagnostic** dans la console
3. **Créez une vente de test** si nécessaire
4. **Vérifiez l'historique** des ventes
5. **Rapportez les résultats** du diagnostic

---

## 📞 **SUPPORT**

Si le problème persiste après ces étapes :

1. **Copiez tous les logs** de la console
2. **Notez les résultats** du diagnostic
3. **Indiquez les étapes** déjà testées
4. **Fournissez les détails** de l'erreur

---

**Date :** 17 octobre 2025  
**Statut :** 🔍 Diagnostic en cours  
**Priorité :** Haute - Fonctionnalité critique
