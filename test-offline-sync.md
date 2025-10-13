# 🧪 Test Mode Offline → Reconnexion

## 🎯 **Scénario de Test**

### **Phase 1 : Mode Offline**
1. **Déconnecter Internet** (WiFi/Données)
2. **Effectuer 2-3 ventes** dans l'app
3. **Vérifier** que les ventes sont stockées localement
4. **Vérifier** le statut "En attente de sync" (rouge)

### **Phase 2 : Reconnexion**
1. **Reconnecter Internet**
2. **Observer** la synchronisation automatique
3. **Vérifier** que toutes les ventes apparaissent dans Firebase
4. **Vérifier** que le stock est synchronisé

---

## 📊 **Logs Attendus**

### **Mode Offline :**
```
🔍 [DEBUG] Utilisateur actuel: null
🔍 [DEBUG] isConnected: false
✅ Insertion réussie dans sales: [ID]
✅ Insertion réussie dans sync_queue: [ID]
🔴 Statut : "En attente de sync"
```

### **Reconnexion :**
```
🌐 Changement de réseau notifié: {"isConnected": true}
🔄 Synchronisation automatique des ventes...
📤 X opérations en attente
✅ Vente créée dans Firebase: [ID]
✅ Synchronisation terminée avec succès
🟢 Statut : "Synchronisé"
```

---

## 🔍 **Points de Vérification**

### **✅ Données Locales :**
- Ventes stockées dans AsyncStorage
- Stock mis à jour localement
- Queue de synchronisation maintenue

### **✅ Synchronisation :**
- Détection automatique de reconnexion
- Push vers Firebase réussi
- Statuts mis à jour
- Queue nettoyée

### **✅ Cohérence :**
- Données identiques local/cloud
- Stock synchronisé partout
- Interface mise à jour

---

## 🚨 **Si Problème**

### **Vérifier :**
1. **Connexion Internet** : Vraiment déconnecté/reconnecté ?
2. **Logs d'erreur** : Messages d'erreur dans la console ?
3. **Firebase Console** : Ventes apparaissent-elles ?
4. **Queue de sync** : Opérations en attente ?

### **Debug :**
```typescript
// Ajouter dans la console
console.log('🔍 [DEBUG] État réseau:', isConnected);
console.log('🔍 [DEBUG] Queue de sync:', await databaseService.getPendingSyncOperations());
```

---

**Testez maintenant le scénario offline → online et dites-moi ce que vous observez !** 🚀
