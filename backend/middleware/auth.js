const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const logger = require('../utils/logger');

// Middleware pour vérifier le token JWT
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'accès requis' 
      });
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours dans Firebase Auth
    const userRecord = await auth.getUser(decoded.uid);
    
    req.user = {
      uid: decoded.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified
    };
    
    next();
  } catch (error) {
    logger.error('Erreur vérification token', {
      error: error.message,
      name: error.name,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalide' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expiré' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la vérification du token' 
    });
  }
};

// Middleware pour vérifier si l'email est vérifié
const requireEmailVerification = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email non vérifié. Veuillez vérifier votre email avant de continuer.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireEmailVerification
};
