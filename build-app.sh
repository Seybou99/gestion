#!/bin/bash

# Script de build pour l'application de gestion
# Usage: ./build-app.sh [ios|android|both]

echo "🚀 Build de l'application SmartStock"
echo "=================================="

# Vérifier les arguments
PLATFORM=${1:-both}

# Fonction pour build iOS
build_ios() {
    echo "📱 Building for iOS..."
    echo "⚠️  Assurez-vous d'avoir Xcode installé"
    echo "⚠️  Connectez votre iPhone ou ouvrez le simulateur"
    echo ""
    
    read -p "Continuer avec le build iOS ? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔨 Lancement du build iOS..."
        npx expo run:ios --clear
    else
        echo "❌ Build iOS annulé"
    fi
}

# Fonction pour build Android
build_android() {
    echo "🤖 Building for Android..."
    echo "⚠️  Assurez-vous d'avoir Android Studio installé"
    echo "⚠️  Connectez votre téléphone Android ou ouvrez l'émulateur"
    echo ""
    
    read -p "Continuer avec le build Android ? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔨 Lancement du build Android..."
        npx expo run:android --clear
    else
        echo "❌ Build Android annulé"
    fi
}

# Vérifier les prérequis
echo "🔍 Vérification des prérequis..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier Expo CLI
if ! command -v npx &> /dev/null; then
    echo "❌ npx n'est pas disponible"
    exit 1
fi

echo "✅ Prérequis OK"
echo ""

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Lancer les builds selon la plateforme
case $PLATFORM in
    "ios")
        build_ios
        ;;
    "android")
        build_android
        ;;
    "both")
        echo "🎯 Build pour iOS et Android"
        build_ios
        echo ""
        build_android
        ;;
    *)
        echo "❌ Plateforme non reconnue: $PLATFORM"
        echo "Usage: ./build-app.sh [ios|android|both]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Build terminé !"
echo "📱 Votre app devrait maintenant être installée sur votre appareil"
echo "🔍 Testez le scanner QR avec la vraie caméra !"
