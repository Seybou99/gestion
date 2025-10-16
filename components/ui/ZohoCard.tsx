import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

interface ZohoCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  shadow?: boolean;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

export const ZohoCard: React.FC<ZohoCardProps> = ({ 
  children, 
  onPress, 
  style, 
  shadow = true,
  padding = 16,
  margin = 8,
  borderRadius = 12,
  backgroundColor = '#ffffff'
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent 
      style={[
        styles.card, 
        { 
          padding,
          margin,
          borderRadius,
          backgroundColor,
        },
        shadow && styles.shadow,
        style
      ]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    // Base card styles are applied via props
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
