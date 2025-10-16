import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ZohoButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ZohoButton: React.FC<ZohoButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}) => {
  const getButtonStyles = () => {
    const baseStyles: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    };

    const sizeStyles = {
      small: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 32 },
      medium: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
      large: { paddingHorizontal: 20, paddingVertical: 16, minHeight: 52 },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? '#E5E5E7' : '#007AFF',
      },
      secondary: {
        backgroundColor: disabled ? '#E5E5E7' : '#5856D6',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? '#E5E5E7' : '#007AFF',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    const widthStyle = fullWidth ? { width: '100%' } : {};

    return [
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      widthStyle,
      style,
    ];
  };

  const getTextStyles = () => {
    const baseStyles: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: disabled ? '#8E8E93' : '#FFFFFF' },
      secondary: { color: disabled ? '#8E8E93' : '#FFFFFF' },
      outline: { color: disabled ? '#8E8E93' : '#007AFF' },
      ghost: { color: disabled ? '#8E8E93' : '#007AFF' },
    };

    return [baseStyles, sizeStyles[size], variantStyles[variant], textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#007AFF' : '#FFFFFF'} 
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyles()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 8,
  },
});
