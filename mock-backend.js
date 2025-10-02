// Backend Mock Simple pour tester l'authentification
// Utilisez ce fichier si vous n'avez pas de backend configuré

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base de données mock en mémoire
const users = [];
let nextUserId = 1;

// Fonction pour générer un token mock
const generateMockToken = (userId) => {
  return `mock-jwt-token-${userId}-${Date.now()}`;
};

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Serveur mock fonctionne',
    timestamp: new Date().toISOString()
  });
});

// Route d'inscription
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // Validation basique
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    // Créer l'utilisateur
    const user = {
      uid: `user_${nextUserId++}`,
      email,
      firstName,
      lastName,
      phone: phone || null,
      emailVerified: false,
      createdAt: new Date(),
      profile: {
        avatar: null,
        bio: null,
        preferences: {}
      }
    };

    users.push(user);
    const token = generateMockToken(user.uid);

    res.json({
      success: true,
      message: 'Compte créé avec succès',
      user,
      token
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route de connexion
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation basique
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Dans un vrai système, on vérifierait le mot de passe hashé
    // Ici on simule juste une vérification basique
    if (password.length < 6) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = generateMockToken(user.uid);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user,
      token
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route de vérification du token
app.get('/api/auth/verify-token', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    // Vérification basique du token mock
    if (!token.startsWith('mock-jwt-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    // Extraire l'UID du token
    const parts = token.split('-');
    if (parts.length < 4) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const uid = `user_${parts[3]}`;
    const user = users.find(u => u.uid === uid);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Erreur vérification token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route de mise à jour du profil
app.put('/api/auth/profile', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('mock-jwt-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const parts = token.split('-');
    const uid = `user_${parts[3]}`;
    const userIndex = users.findIndex(u => u.uid === uid);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const { firstName, lastName, phone, bio } = req.body;

    // Mettre à jour l'utilisateur
    if (firstName) users[userIndex].firstName = firstName;
    if (lastName) users[userIndex].lastName = lastName;
    if (phone !== undefined) users[userIndex].phone = phone;
    if (bio !== undefined) {
      users[userIndex].profile = users[userIndex].profile || {};
      users[userIndex].profile.bio = bio;
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: users[userIndex]
    });

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route de changement de mot de passe
app.put('/api/auth/change-password', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('mock-jwt-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route de suppression de compte
app.delete('/api/auth/account', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('mock-jwt-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const parts = token.split('-');
    const uid = `user_${parts[3]}`;
    const userIndex = users.findIndex(u => u.uid === uid);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'utilisateur
    users.splice(userIndex, 1);

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour obtenir le profil
app.get('/api/auth/profile', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('mock-jwt-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    const parts = token.split('-');
    const uid = `user_${parts[3]}`;
    const user = users.find(u => u.uid === uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur mock démarré sur le port ${PORT}`);
  console.log(`📱 Testez votre app Expo UI Playground !`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💡 Pour arrêter: Ctrl+C`);
});
