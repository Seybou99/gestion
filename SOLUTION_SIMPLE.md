# 📱 Solution Simple pour iPhone 15 Pro Max

## 🎯 **Problème Résolu**

Vous voulez avoir votre app SmartStock sur votre iPhone 15 Pro Max avec le scanner QR fonctionnel. Voici la solution la plus simple :

---

## 🚀 **Solution Recommandée : Build Local iOS**

### **Étape 1 : Connecter votre iPhone**
1. **Connectez** votre iPhone 15 Pro Max au MacBook avec un câble USB
2. **Déverrouillez** votre iPhone
3. **Acceptez** "Faire confiance à cet ordinateur" sur l'iPhone

### **Étape 2 : Lancer le Build**
```bash
# Dans le terminal, dans le dossier du projet :
npx expo run:ios --device
```

### **Étape 3 : Sélectionner votre iPhone**
- Xcode va s'ouvrir automatiquement
- **Sélectionnez** votre iPhone 15 Pro Max dans la liste des appareils
- **Cliquez** sur le bouton "Run" (▶️)

### **Étape 4 : Autoriser l'Installation**
- Sur votre iPhone : **Paramètres** → **Général** → **Gestion des appareils**
- **Faites confiance** au développeur "Apple Development"
- L'app SmartStock sera installée

---

## 🔍 **Test du Scanner QR**

Une fois l'app installée :

1. **Ouvrir** l'app SmartStock sur votre iPhone
2. **Aller** dans Articles → Scanner
3. **Permission caméra** → Accepter
4. **Pointer** la caméra vers un QR code
5. **Scan automatique** → Données remplies dans le formulaire

---

## 🎉 **Résultat**

Vous aurez :
- ✅ **App native** sur votre iPhone 15 Pro Max
- ✅ **Scanner QR** avec vraie caméra
- ✅ **Performance optimale**
- ✅ **Toutes les fonctionnalités** de gestion

---

## 🆘 **Si ça ne marche pas**

### **Alternative 1 : Simulateur iOS**
```bash
npx expo run:ios --simulator "iPhone 15 Pro Max"
```

### **Alternative 2 : EAS Build (plus complexe)**
1. Créer un compte Expo
2. Configurer EAS Build
3. Build dans le cloud
4. Télécharger le fichier .ipa

---

## 📞 **Support**

Si vous avez des problèmes :
1. Vérifiez que Xcode est installé
2. Vérifiez que votre iPhone est connecté
3. Vérifiez les certificats de développement
4. Redémarrez Xcode et réessayez

**Votre app sera prête en quelques minutes !** 🚀
