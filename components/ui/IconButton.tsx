/**
 * IconButton - Composant bouton réutilisable avec icônes Lucide
 * 
 * @example
 * ```tsx
 * import { Edit2 } from 'lucide-react-native';
 * 
 * <IconButton 
 *   icon={Edit2}
 *   onPress={handleEdit}
 *   color="#007AFF"
 *   size="medium"
 *   variant="primary"
 * />
 * ```
 */

import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface IconButtonProps {
  /** L'icône Lucide à afficher */
  icon: LucideIcon;
  /** Fonction appelée au clic */
  onPress: () => void;
  /** Couleur de l'icône (par défaut: #007AFF) */
  color?: string;
  /** Taille du bouton */
  size?: 'small' | 'medium' | 'large';
  /** Variante du bouton */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  /** Désactiver le bouton */
  disabled?: boolean;
  /** Label optionnel */
  label?: string;
  /** Style personnalisé */
  style?: ViewStyle;
  /** Afficher un badge de notification */
  badge?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onPress,
  color,
  size = 'medium',
  variant = 'ghost',
  disabled = false,
  label,
  style,
  badge,
}) => {
  // Tailles des icônes et des boutons
  const iconSizes = {
    small: 18,
    medium: 22,
    large: 26,
  };

  const buttonSizes = {
    small: 32,
    medium: 40,
    large: 48,
  };

  // Couleurs par variante
  const getColors = () => {
    if (disabled) {
      return {
        iconColor: '#999',
        backgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          iconColor: color || '#fff',
          backgroundColor: color || '#007AFF',
          borderColor: color || '#007AFF',
        };
      case 'secondary':
        return {
          iconColor: color || '#666',
          backgroundColor: '#f5f5f5',
          borderColor: '#e0e0e0',
        };
      case 'danger':
        return {
          iconColor: color || '#fff',
          backgroundColor: '#FF3B30',
          borderColor: '#FF3B30',
        };
      case 'success':
        return {
          iconColor: color || '#fff',
          backgroundColor: '#34C759',
          borderColor: '#34C759',
        };
      case 'ghost':
      default:
        return {
          iconColor: color || '#007AFF',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
    }
  };

  const colors = getColors();

  const buttonStyle: ViewStyle = {
    width: buttonSizes[size],
    height: buttonSizes[size],
    borderRadius: buttonSizes[size] / 2,
    backgroundColor: colors.backgroundColor,
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderColor: colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[buttonStyle, style]}
        activeOpacity={0.7}
      >
        <Icon
          size={iconSizes[size]}
          color={colors.iconColor}
          strokeWidth={2}
        />
        
        {/* Badge de notification */}
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Label optionnel */}
      {label && (
        <Text style={[styles.label, { color: colors.iconColor }]}>
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

/**
 * Exemples d'utilisation
 */
export const IconButtonExamples = () => {
  const { 
    Search, 
    Edit2, 
    Trash2, 
    Plus, 
    Bell,
    ShoppingCart,
    Heart,
  } = require('lucide-react-native');

  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 20 }}>
      {/* Bouton primaire */}
      <IconButton
        icon={Plus}
        onPress={() => console.log('Add')}
        variant="primary"
        size="medium"
      />

      {/* Bouton avec label */}
      <IconButton
        icon={Search}
        onPress={() => console.log('Search')}
        variant="ghost"
        size="medium"
        label="Rechercher"
      />

      {/* Bouton danger */}
      <IconButton
        icon={Trash2}
        onPress={() => console.log('Delete')}
        variant="danger"
        size="medium"
      />

      {/* Bouton avec badge */}
      <IconButton
        icon={Bell}
        onPress={() => console.log('Notifications')}
        variant="ghost"
        size="medium"
        badge={5}
      />

      {/* Bouton secondaire */}
      <IconButton
        icon={Edit2}
        onPress={() => console.log('Edit')}
        variant="secondary"
        size="medium"
      />

      {/* Bouton désactivé */}
      <IconButton
        icon={ShoppingCart}
        onPress={() => console.log('Cart')}
        variant="primary"
        size="medium"
        disabled
      />

      {/* Bouton succès */}
      <IconButton
        icon={Heart}
        onPress={() => console.log('Like')}
        variant="success"
        size="large"
      />
    </View>
  );
};


