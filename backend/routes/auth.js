const express = require('express');
const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { validateRegistrationData, validateLoginData, validateProfileData } = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Fonction pour générer un token JWT
const generateToken = (uid) => {
  return jwt.sign({ uid }, process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
};

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validation des données
    const validation = validateRegistrationData({ email, password, firstName, lastName, phone });
    if (!validation.isValid) {
      logger.warn('Tentative d\'inscription avec données invalides', {
        email,
        errors: validation.errors,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false
    });

    // Sauvegarder les informations supplémentaires dans Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      phone: phone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      profile: {
        avatar: null,
        bio: null,
        preferences: {}
      }
    });

    // Générer le token JWT
    const token = generateToken(userRecord.uid);

    // Envoyer l'email de vérification
    try {
      const actionCodeSettings = {
        url: `${process.env.FRONTEND_URL || 'http://localhost:19006'}/verify-email`,
        handleCodeInApp: true
      };
      
      await auth.generateEmailVerificationLink(email, actionCodeSettings);
      // Note: Dans un vrai projet, vous enverriez cet email via un service d'email
      logger.info('Email de vérification généré', { email, uid: userRecord.uid });
    } catch (emailError) {
      logger.error('Erreur génération email de vérification', {
        email,
        error: emailError.message,
        uid: userRecord.uid
      });
    }

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified
      },
      token
    });

  } catch (error) {
    logger.error('Erreur inscription', {
      error: error.message,
      code: error.code,
      email: req.body.email,
      ip: req.ip
    });

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est trop faible'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte'
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    const validation = validateLoginData({ email, password });
    if (!validation.isValid) {
      logger.warn('Tentative de connexion avec données invalides', {
        email,
        errors: validation.errors,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    // Vérifier les identifiants avec Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Note: Firebase Admin SDK ne peut pas vérifier directement les mots de passe
    // Dans un vrai projet, vous utiliseriez Firebase Client SDK pour la connexion
    // ou implémenteriez une vérification côté client
    
    // Pour la démo, on simule une vérification réussie
    // En production, cette logique devrait être côté client
    const token = generateToken(userRecord.uid);
    
    logger.info('Connexion réussie', {
      email,
      uid: userRecord.uid,
      ip: req.ip
    });

    // Récupérer les données utilisateur depuis Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        ...userData
      },
      token
    });

  } catch (error) {
    logger.error('Erreur connexion', {
      error: error.message,
      code: error.code,
      email: req.body.email,
      ip: req.ip
    });

    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
});

// Route pour obtenir le profil utilisateur
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Profil utilisateur non trouvé'
      });
    }

    const userData = userDoc.data();
    
    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        ...userData
      }
    });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// Route pour mettre à jour le profil
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, bio } = req.body;
    
    // Validation des données
    const validation = validateProfileData({ firstName, lastName, phone, bio });
    if (!validation.isValid) {
      logger.warn('Tentative de mise à jour profil avec données invalides', {
        uid: req.user.uid,
        errors: validation.errors,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (bio) updateData['profile.bio'] = bio;

    await db.collection('users').doc(req.user.uid).update(updateData);

    logger.info('Profil mis à jour', {
      uid: req.user.uid,
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès'
    });

  } catch (error) {
    logger.error('Erreur mise à jour profil', {
      error: error.message,
      uid: req.user.uid,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Route pour changer le mot de passe
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    await auth.updateUser(req.user.uid, {
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement du mot de passe'
    });
  }
});

// Route pour supprimer le compte
router.delete('/account', verifyToken, async (req, res) => {
  try {
    // Supprimer l'utilisateur de Firebase Auth
    await auth.deleteUser(req.user.uid);
    
    // Supprimer les données de Firestore
    await db.collection('users').doc(req.user.uid).delete();

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte'
    });
  }
});

// Route pour vérifier le token
router.get('/verify-token', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token valide',
    user: req.user
  });
});

module.exports = router;
