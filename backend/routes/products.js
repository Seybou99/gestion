const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// === PRODUCTS ===

// GET /api/products - Récupérer tous les produits
router.get('/', async (req, res) => {
  try {
    const productsSnapshot = await db.collection('products')
      .orderBy('created_at', 'desc')
      .get();
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString(),
      updated_at: doc.data().updated_at?.toDate?.()?.toISOString(),
    }));
    
    logger.info('Produits récupérés', { 
      count: products.length, 
      uid: req.user.uid 
    });
    
    res.json({
      success: true,
      data: products,
      message: `${products.length} produits récupérés`
    });
  } catch (error) {
    logger.error('Erreur récupération produits', { error: error.message, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits'
    });
  }
});

// GET /api/products/:id - Récupérer un produit par ID
router.get('/:id', async (req, res) => {
  try {
    const productDoc = await db.collection('products').doc(req.params.id).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    const product = {
      id: productDoc.id,
      ...productDoc.data(),
      created_at: productDoc.data().created_at?.toDate?.()?.toISOString(),
      updated_at: productDoc.data().updated_at?.toDate?.()?.toISOString(),
    };
    
    logger.info('Produit récupéré', { productId: req.params.id, uid: req.user.uid });
    
    res.json({
      success: true,
      data: product,
      message: 'Produit récupéré avec succès'
    });
  } catch (error) {
    logger.error('Erreur récupération produit', { error: error.message, productId: req.params.id, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit'
    });
  }
});

// POST /api/products - Créer un nouveau produit
router.post('/', async (req, res) => {
  try {
    const { name, description, sku, barcode, category_id, price_buy, price_sell, unit, images } = req.body;
    
    // Validation des champs obligatoires
    if (!name || !sku || !price_sell) {
      return res.status(400).json({
        success: false,
        message: 'Nom, SKU et prix de vente sont obligatoires'
      });
    }
    
    const productData = {
      name,
      description: description || '',
      sku,
      barcode: barcode || '',
      category_id: category_id || null,
      price_buy: parseFloat(price_buy) || 0,
      price_sell: parseFloat(price_sell),
      margin: parseFloat(price_sell) - (parseFloat(price_buy) || 0),
      unit: unit || 'pcs',
      images: images || [],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'synced',
      created_by: req.user.uid
    };
    
    const productRef = await db.collection('products').add(productData);
    
    // Créer le stock initial
    const stockData = {
      product_id: productRef.id,
      location_id: 'default_location',
      quantity_current: 0,
      quantity_min: 5,
      quantity_max: 100,
      last_movement_date: new Date(),
      last_movement_type: 'in',
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'synced',
      created_by: req.user.uid
    };
    
    await db.collection('stock').add(stockData);
    
    logger.info('Produit créé', { 
      productId: productRef.id, 
      name, 
      sku, 
      uid: req.user.uid 
    });
    
    res.status(201).json({
      success: true,
      data: { id: productRef.id },
      message: 'Produit créé avec succès'
    });
  } catch (error) {
    logger.error('Erreur création produit', { error: error.message, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du produit'
    });
  }
});

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    const updateData = {
      ...req.body,
      updated_at: new Date(),
      updated_by: req.user.uid
    };
    
    // Recalculer la marge si les prix sont modifiés
    if (updateData.price_buy !== undefined || updateData.price_sell !== undefined) {
      const currentData = productDoc.data();
      const priceBuy = updateData.price_buy !== undefined ? updateData.price_buy : currentData.price_buy;
      const priceSell = updateData.price_sell !== undefined ? updateData.price_sell : currentData.price_sell;
      updateData.margin = priceSell - priceBuy;
    }
    
    await productRef.update(updateData);
    
    logger.info('Produit mis à jour', { productId: req.params.id, uid: req.user.uid });
    
    res.json({
      success: true,
      message: 'Produit mis à jour avec succès'
    });
  } catch (error) {
    logger.error('Erreur mise à jour produit', { error: error.message, productId: req.params.id, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit'
    });
  }
});

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    // Supprimer le produit
    await productRef.delete();
    
    // Supprimer le stock associé
    const stockSnapshot = await db.collection('stock')
      .where('product_id', '==', req.params.id)
      .get();
    
    const batch = db.batch();
    stockSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    logger.info('Produit supprimé', { productId: req.params.id, uid: req.user.uid });
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression produit', { error: error.message, productId: req.params.id, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du produit'
    });
  }
});

// === STOCK ===

// GET /api/products/stock/:productId - Récupérer le stock d'un produit
router.get('/stock/:productId', async (req, res) => {
  try {
    const stockSnapshot = await db.collection('stock')
      .where('product_id', '==', req.params.productId)
      .get();
    
    if (stockSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Stock non trouvé pour ce produit'
      });
    }
    
    const stock = stockSnapshot.docs[0].data();
    stock.id = stockSnapshot.docs[0].id;
    
    res.json({
      success: true,
      data: stock,
      message: 'Stock récupéré avec succès'
    });
  } catch (error) {
    logger.error('Erreur récupération stock', { error: error.message, productId: req.params.productId, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du stock'
    });
  }
});

// PUT /api/products/stock/:id - Mettre à jour le stock
router.put('/stock/:id', async (req, res) => {
  try {
    const { quantity_current, quantity_min, quantity_max, last_movement_type } = req.body;
    
    const stockRef = db.collection('stock').doc(req.params.id);
    const stockDoc = await stockRef.get();
    
    if (!stockDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Stock non trouvé'
      });
    }
    
    const updateData = {
      updated_at: new Date(),
      updated_by: req.user.uid
    };
    
    if (quantity_current !== undefined) updateData.quantity_current = parseInt(quantity_current);
    if (quantity_min !== undefined) updateData.quantity_min = parseInt(quantity_min);
    if (quantity_max !== undefined) updateData.quantity_max = parseInt(quantity_max);
    if (last_movement_type) {
      updateData.last_movement_type = last_movement_type;
      updateData.last_movement_date = new Date();
    }
    
    await stockRef.update(updateData);
    
    logger.info('Stock mis à jour', { stockId: req.params.id, uid: req.user.uid });
    
    res.json({
      success: true,
      message: 'Stock mis à jour avec succès'
    });
  } catch (error) {
    logger.error('Erreur mise à jour stock', { error: error.message, stockId: req.params.id, uid: req.user.uid });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du stock'
    });
  }
});

module.exports = router;
