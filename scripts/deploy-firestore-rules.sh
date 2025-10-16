#!/bin/bash

# Script pour déployer les règles Firestore
# Usage: ./scripts/deploy-firestore-rules.sh [development|production]

ENVIRONMENT=${1:-development}
PROJECT_ID="gestion-94304"

echo "🔥 Déploiement des règles Firestore pour l'environnement: $ENVIRONMENT"

if [ "$ENVIRONMENT" = "production" ]; then
    RULES_FILE="firestore.rules.production"
    echo "📋 Utilisation des règles de production (sécurisées)"
else
    RULES_FILE="firestore.rules"
    echo "📋 Utilisation des règles de développement (permissives)"
fi

if [ ! -f "$RULES_FILE" ]; then
    echo "❌ Fichier de règles non trouvé: $RULES_FILE"
    exit 1
fi

echo "🚀 Déploiement des règles vers le projet: $PROJECT_ID"

# Vérifier si Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI non installé. Installez-le avec:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Se connecter à Firebase (si nécessaire)
firebase login --no-localhost

# Déployer les règles
firebase deploy --only firestore:rules --project $PROJECT_ID

echo "✅ Règles Firestore déployées avec succès!"
echo "🔗 Consultez la console Firebase: https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules"
