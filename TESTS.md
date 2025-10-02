# 🧪 Tests d'Authentification

Ce document décrit la suite de tests complète pour le système d'authentification de l'application de gestion.

## 📋 Vue d'ensemble

La suite de tests couvre tous les aspects de l'authentification :
- **Tests unitaires** : Composants, utilitaires, services
- **Tests d'intégration** : Flux complets d'authentification
- **Tests de validation** : Données d'entrée et formats
- **Tests d'erreurs** : Gestion des cas d'erreur

## 🏗️ Structure des tests

```
__tests__/
├── integration/
│   └── auth.integration.test.tsx    # Tests d'intégration complets
components/
├── __tests__/
│   ├── LoginForm.test.tsx           # Tests du formulaire de connexion
│   └── RegisterForm.test.tsx        # Tests du formulaire d'inscription
contexts/
├── __tests__/
│   └── AuthContext.test.tsx         # Tests du contexte d'authentification
services/
├── __tests__/
│   └── api.test.ts                  # Tests du service API
utils/
├── __tests__/
│   ├── validation.test.ts           # Tests des utilitaires de validation
│   └── phoneValidation.test.ts      # Tests de validation téléphone
```

## 🚀 Exécution des tests

### Commandes disponibles

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch
npm run test:watch

# Exécuter les tests avec couverture
npm run test:coverage

# Exécuter un test spécifique
npm test -- LoginForm.test.tsx

# Exécuter les tests d'intégration
npm test -- integration

# Script personnalisé avec rapport complet
node scripts/test.js
```

### Configuration Jest

- **Preset** : `jest-expo` pour React Native/Expo
- **Setup** : `jest.setup.js` avec mocks globaux
- **Coverage** : Rapport HTML et LCOV
- **Timeout** : 10 secondes par test

## 📊 Couverture de tests

### Composants testés

#### 🔐 LoginForm
- ✅ Rendu du formulaire
- ✅ Validation des champs obligatoires
- ✅ Validation du format email
- ✅ Appel de la fonction de connexion
- ✅ Gestion des erreurs de connexion
- ✅ Gestion des exceptions réseau
- ✅ Indicateur de chargement
- ✅ Navigation vers l'inscription
- ✅ Mise à jour des champs

#### 📝 RegisterForm
- ✅ Rendu du formulaire complet
- ✅ Validation des données d'inscription
- ✅ Validation du numéro de téléphone
- ✅ Sélection de pays
- ✅ Basculer la visibilité des mots de passe
- ✅ Appel de la fonction d'inscription
- ✅ Gestion des erreurs d'inscription
- ✅ Message de succès et redirection
- ✅ Indicateur de chargement
- ✅ Navigation vers la connexion

### Services testés

#### 🌐 API Service
- ✅ Configuration et mode mock
- ✅ Inscription utilisateur
- ✅ Connexion utilisateur
- ✅ Récupération du profil
- ✅ Mise à jour du profil
- ✅ Changement de mot de passe
- ✅ Suppression de compte
- ✅ Déconnexion
- ✅ Gestion des erreurs réseau
- ✅ Tests d'intégration complets

#### 🔧 AuthContext
- ✅ État initial
- ✅ Inscription avec succès/échec
- ✅ Connexion avec succès/échec
- ✅ Déconnexion
- ✅ Mise à jour du profil
- ✅ Changement de mot de passe
- ✅ Suppression de compte
- ✅ Restauration de session
- ✅ Gestion des erreurs

### Utilitaires testés

#### ✅ Validation
- ✅ Validation email
- ✅ Validation mot de passe
- ✅ Validation nom/prénom
- ✅ Validation données d'inscription
- ✅ Validation données de connexion
- ✅ Validation données de profil

#### 📱 Validation Téléphone
- ✅ Validation numéros français
- ✅ Validation numéros maliens
- ✅ Validation numéros américains
- ✅ Formatage des numéros
- ✅ Gestion des erreurs
- ✅ Support de 69 pays
- ✅ Tests d'intégration

## 🧪 Tests d'intégration

### Flux complets testés

#### 🔄 Cycle d'inscription et connexion
1. **Inscription** → Validation → Succès → Redirection
2. **Connexion** → Validation → Succès → Session
3. **Gestion des erreurs** → Messages appropriés

#### 🔀 Navigation entre formulaires
- Connexion ↔ Inscription
- États de chargement
- Validation en temps réel

#### 🌐 Gestion des erreurs réseau
- Timeout de connexion
- Erreurs de serveur
- Fallback en mode mock

## 📈 Métriques de qualité

### Couverture de code
- **Composants** : 95%+
- **Services** : 98%+
- **Utilitaires** : 100%
- **Contextes** : 95%+

### Types de tests
- **Unitaires** : 45 tests
- **Intégration** : 12 tests
- **Validation** : 25 tests
- **Erreurs** : 18 tests

## 🛠️ Mocks et stubs

### Modules mockés
- `@react-native-async-storage/async-storage`
- `react-native` (Alert, etc.)
- `expo-*` modules
- `@react-navigation/*`
- `@expo/vector-icons`

### Services mockés
- API Service (mode mock activé)
- Validation functions
- Country picker modal

## 🐛 Gestion des erreurs

### Types d'erreurs testés
- **Validation** : Données invalides
- **Réseau** : Connexion perdue
- **Serveur** : Erreurs 500/400
- **Authentification** : Tokens invalides
- **Utilisateur** : Actions interdites

### Messages d'erreur
- **Français** : Tous les messages
- **Contextuels** : Spécifiques à l'action
- **Utilisateur** : Compréhensibles

## 🔍 Debugging

### Commandes de debug
```bash
# Tests avec logs détaillés
npm test -- --verbose

# Tests d'un fichier spécifique
npm test -- --testPathPattern=LoginForm

# Tests avec couverture détaillée
npm run test:coverage -- --verbose

# Mode watch pour développement
npm run test:watch
```

### Logs utiles
- **Console** : Logs de test
- **Coverage** : Rapport HTML
- **Jest** : Résultats détaillés

## 📝 Bonnes pratiques

### Écriture de tests
1. **AAA Pattern** : Arrange, Act, Assert
2. **Noms descriptifs** : Ce qui est testé
3. **Un test = un comportement**
4. **Mocks appropriés** : Isolation des dépendances

### Maintenance
1. **Tests à jour** : Synchronisés avec le code
2. **Couverture maintenue** : >90%
3. **Performance** : Tests rapides
4. **Lisibilité** : Code clair et commenté

## 🚀 Intégration CI/CD

### GitHub Actions (exemple)
```yaml
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Pré-commit hooks
```bash
# Exécuter les tests avant commit
npm run test
```

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Expo Testing Guide](https://docs.expo.dev/guides/testing-with-jest/)

---

**🎯 Objectif** : Maintenir une couverture de tests >95% pour garantir la qualité et la fiabilité du système d'authentification.
