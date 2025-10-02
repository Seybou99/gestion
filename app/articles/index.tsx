import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Écran Articles - Gestion des Articles
 * 
 * Affiche la liste des articles avec fonctionnalités de recherche,
 * filtrage et gestion du stock.
 */
export default function ArticlesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Données fictives d'articles
  const articles = [
    {
      id: '1',
      name: 'iPhone 15 Pro',
      category: 'Smartphones',
      price: 1299,
      stock: 12,
      description: 'Dernier iPhone avec puce A17 Pro',
      image: '📱',
      status: 'Disponible',
      lastUpdated: '2024-01-15',
    },
    {
      id: '2',
      name: 'MacBook Air M3',
      category: 'Ordinateurs',
      price: 1499,
      stock: 8,
      description: 'Laptop ultra-portable avec puce M3',
      image: '💻',
      status: 'Disponible',
      lastUpdated: '2024-01-14',
    },
    {
      id: '3',
      name: 'AirPods Pro 2',
      category: 'Audio',
      price: 279,
      stock: 0,
      description: 'Écouteurs sans fil avec réduction de bruit',
      image: '🎧',
      status: 'Rupture de stock',
      lastUpdated: '2024-01-10',
    },
    {
      id: '4',
      name: 'iPad Air',
      category: 'Tablettes',
      price: 649,
      stock: 5,
      description: 'Tablette polyvalente pour tous vos besoins',
      image: '📱',
      status: 'Stock faible',
      lastUpdated: '2024-01-12',
    },
    {
      id: '5',
      name: 'Apple Watch Series 9',
      category: 'Montres',
      price: 449,
      stock: 15,
      description: 'Montre connectée avec fonctionnalités santé',
      image: '⌚',
      status: 'Disponible',
      lastUpdated: '2024-01-13',
    },
    {
      id: '6',
      name: 'Magic Mouse',
      category: 'Accessoires',
      price: 89,
      stock: 22,
      description: 'Souris sans fil rechargeable',
      image: '🖱️',
      status: 'Disponible',
      lastUpdated: '2024-01-11',
    },
  ];

  const categories = ['Tous', 'Smartphones', 'Ordinateurs', 'Audio', 'Tablettes', 'Montres', 'Accessoires'];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return '#34C759';
      case 'Stock faible': return '#FF9500';
      case 'Rupture de stock': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'Disponible': return '#E8F5E8';
      case 'Stock faible': return '#FFF4E6';
      case 'Rupture de stock': return '#FFEBEB';
      default: return '#F0F0F0';
    }
  };

  const renderArticle = ({ item }: { item: typeof articles[0] }) => (
    <TouchableOpacity style={styles.articleCard}>
      <View style={styles.articleHeader}>
        <Text style={styles.articleImage}>{item.image}</Text>
        <View style={styles.articleInfo}>
          <Text style={styles.articleName}>{item.name}</Text>
          <Text style={styles.articleCategory}>{item.category}</Text>
        </View>
        <View style={styles.articlePrice}>
          <Text style={styles.priceText}>{item.price}€</Text>
        </View>
      </View>
      
      <Text style={styles.articleDescription}>{item.description}</Text>
      
      <View style={styles.articleFooter}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockLabel}>Stock:</Text>
          <Text style={styles.stockValue}>{item.stock} unités</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBackgroundColor(item.status) },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.categoryButtonActive,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category && styles.categoryTextActive,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <Text style={styles.title}>Articles</Text>
        <Text style={styles.subtitle}>Gérez votre inventaire</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Filtres par catégorie */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategory)}
      </ScrollView>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredArticles.length}</Text>
          <Text style={styles.statLabel}>Articles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredArticles.filter(a => a.status === 'Disponible').length}
          </Text>
          <Text style={styles.statLabel}>Disponibles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredArticles.filter(a => a.status === 'Stock faible').length}
          </Text>
          <Text style={styles.statLabel}>Stock faible</Text>
        </View>
      </View>

      {/* Liste des articles */}
      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        style={styles.articlesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.articlesContent}
      />

      {/* Bouton d'action flottant */}
      <TouchableOpacity style={styles.fabButton}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  categoriesContainer: {
    marginTop: 16,
    paddingLeft: 20,
  },
  categoriesContent: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  articlesList: {
    flex: 1,
    marginTop: 20,
  },
  articlesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  articleImage: {
    fontSize: 32,
    marginRight: 12,
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  articleCategory: {
    fontSize: 12,
    color: '#666',
  },
  articlePrice: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  stockValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
});
