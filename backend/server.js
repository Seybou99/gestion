const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import des routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS - Accès total en développement
const corsOptions = {
  origin: true, // Autoriser toutes les origines
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: {
    success: false,
    message: 'Trop de requêtes. Réessayez dans 15 minutes.'
  }
});

// Middlewares
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(generalLimiter);

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API d\'authentification fonctionnelle',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'Serveur fonctionne correctement',
    timestamp: new Date().toISOString()
  });
});

// Routes d'authentification avec rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// Routes produits
app.use('/api/products', productRoutes);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur serveur', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origine non autorisée'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Démarrage du serveur (seulement si pas en mode test)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Serveur démarré', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      apiUrl: `http://0.0.0.0:${PORT}`,
      authRoutes: `http://0.0.0.0:${PORT}/api/auth`
    });
    
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API disponible sur: http://0.0.0.0:${PORT} (toutes interfaces)`);
    console.log(`🔐 Routes d'authentification: http://0.0.0.0:${PORT}/api/auth`);
    console.log(`📱 Accessible depuis: http://[VOTRE_IP]:${PORT}`);
  });
}

module.exports = app;
