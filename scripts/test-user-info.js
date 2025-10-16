#!/usr/bin/env node

/**
 * Script pour tester la récupération des informations utilisateur
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const testUserInfo = async () => {
  console.log('🔍 TEST DE RÉCUPÉRATION UTILISATEUR\n');
  
  try {
    // 1. Tester Redux persist
    console.log('1️⃣ Test Redux persist...');
    const authData = await AsyncStorage.getItem('persist:auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      console.log('   ✅ Données Redux trouvées');
      console.log('   📊 Clés disponibles:', Object.keys(parsed));
      
      if (parsed.user && parsed.user !== 'null') {
        const user = JSON.parse(parsed.user);
        console.log('   👤 Utilisateur Redux:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
      } else {
        console.log('   ⚠️  Utilisateur null dans Redux');
      }
    } else {
      console.log('   ❌ Aucune donnée Redux trouvée');
    }
    
    // 2. Tester userInfo direct
    console.log('\n2️⃣ Test userInfo direct...');
    const userInfo = await AsyncStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      console.log('   ✅ Utilisateur userInfo:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    } else {
      console.log('   ❌ Aucun userInfo trouvé');
    }
    
    // 3. Lister toutes les clés AsyncStorage
    console.log('\n3️⃣ Toutes les clés AsyncStorage...');
    const allKeys = await AsyncStorage.getAllKeys();
    const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('user'));
    console.log('   📋 Clés liées à l\'auth:', authKeys);
    
    // 4. Tester la fonction getCurrentUser
    console.log('\n4️⃣ Test fonction getCurrentUser...');
    const { getCurrentUser } = require('../utils/userInfo');
    const currentUser = await getCurrentUser();
    if (currentUser) {
      console.log('   ✅ Utilisateur récupéré:', {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      });
    } else {
      console.log('   ❌ Aucun utilisateur récupéré');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

testUserInfo();
