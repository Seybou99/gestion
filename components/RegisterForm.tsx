import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { validateRegistrationData } from '../utils/validation';
import CountryPickerModal from './CountryPickerModal';

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dialCode: '+33',
  });
  const { register } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  const validateForm = () => {
    const validation = validateRegistrationData(formData);
    
    if (!validation.isValid) {
      const newErrors: { [key: string]: string } = {};
      validation.errors.forEach(error => {
        if (error.includes('prénom') || error.includes('Prénom')) {
          newErrors.firstName = error;
        } else if (error.includes('nom') || error.includes('Nom')) {
          newErrors.lastName = error;
        } else if (error.includes('email') || error.includes('Email')) {
          newErrors.email = error;
        } else if (error.includes('mot de passe') || error.includes('Mot de passe')) {
          if (error.includes('correspondent')) {
            newErrors.confirmPassword = error;
          } else {
            newErrors.password = error;
          }
        }
      });
      setErrors(newErrors);
      
      // Afficher une alerte pour les erreurs de validation
      const errorMessage = validation.errors.join('\n');
      Alert.alert(
        '❌ Erreur de validation', 
        errorMessage,
        [{ text: 'OK' }]
      );
      
      return false;
    }

    // Validation spécifique du téléphone avec le pays sélectionné
    if (formData.phone) {
      // Ajouter automatiquement le code pays au numéro
      const fullPhoneNumber = selectedCountry?.dialCode + formData.phone;
      
      const phoneValidation = validatePhoneNumber(fullPhoneNumber, selectedCountry?.code);
      
      if (!phoneValidation.isValid) {
        const errorMsg = phoneValidation.error || 'Téléphone invalide';
        setErrors(prev => ({ ...prev, phone: errorMsg }));
        
        // Afficher une alerte pour l'erreur de téléphone
        Alert.alert(
          '❌ Erreur de téléphone', 
          errorMsg,
          [{ text: 'OK' }]
        );
        
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const { confirmPassword, phone, ...registerData } = formData;
      
      const result = await register({
        ...registerData,
        phone: phone.trim() || undefined,
      });
      
      if (result.success) {
        // Message de succès avec redirection
        Alert.alert(
          '🎉 Inscription réussie !', 
          'Votre compte a été créé avec succès.\n\nVous pouvez maintenant vous connecter avec vos identifiants.',
          [
            { 
              text: 'Se connecter', 
              onPress: () => {
                // Vider le formulaire
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  password: '',
                  confirmPassword: '',
                });
                setErrors({});
                // Basculer vers le formulaire de connexion
                onSwitchToLogin();
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert('❌ Erreur d\'inscription', result.message || 'Une erreur est survenue lors de l\'inscription');
      }
    } catch (error) {
      Alert.alert(
        '❌ Erreur', 
        'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.subtitle}>Créez votre compte</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="Votre prénom"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                autoCapitalize="words"
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Votre nom"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                autoCapitalize="words"
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="votre@email.com"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countryButton}
                onPress={() => setShowCountryModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryButtonText}>{selectedCountry.dialCode}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.phoneInput, errors.phone && styles.inputError]}
                placeholder="+223 6 12 34 56 78"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Au moins 6 caractères"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Répétez votre mot de passe"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.switchLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de sélection de pays */}
      <CountryPickerModal
        visible={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelectCountry={handleCountrySelect}
        selectedCountry={selectedCountry}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryButton: {
    width: 120,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 50,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  countryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    paddingRight: 50, // Espace pour l'icône
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  phoneInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#666',
  },
  switchLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
