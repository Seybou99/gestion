#!/bin/bash

# Script de configuration EAS Build pour l'application SmartStock
# Usage: ./eas-build-setup.sh

echo "🌐 Configuration EAS Build pour SmartStock"
echo "=========================================="

# Vérifier si EAS CLI est installé
if ! command -v eas &> /dev/null; then
    echo "📦 Installation d'EAS CLI..."
    npm install -g @expo/eas-cli
else
    echo "✅ EAS CLI déjà installé"
fi

echo ""
echo "🔐 Connexion à Expo..."
echo "⚠️  Vous devrez vous connecter avec votre compte Expo"
eas login

echo ""
echo "⚙️  Configuration du build..."
eas build:configure

echo ""
echo "🎯 Options de build disponibles :"
echo ""
echo "1. Build de développement (pour tester) :"
echo "   eas build --platform ios --profile development"
echo "   eas build --platform android --profile development"
echo ""
echo "2. Build de production (pour distribution) :"
echo "   eas build --platform ios --profile production"
echo "   eas build --platform android --profile production"
echo ""
echo "3. Build pour les deux plateformes :"
echo "   eas build --platform all --profile development"
echo "   eas build --platform all --profile production"
echo ""

read -p "Voulez-vous lancer un build de développement maintenant ? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Lancement du build de développement..."
    echo "📱 iOS et Android seront buildés dans le cloud"
    echo "⏳ Cela peut prendre 10-15 minutes..."
    eas build --platform all --profile development
else
    echo "✅ Configuration terminée !"
    echo "💡 Utilisez les commandes ci-dessus pour lancer vos builds"
fi

echo ""
echo "📱 Une fois le build terminé :"
echo "1. Téléchargez le fichier .ipa (iOS) ou .apk (Android)"
echo "2. Installez-le sur votre téléphone"
echo "3. Testez le scanner QR avec la vraie caméra !"
