import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase-config';

const { width } = Dimensions.get('window');

interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
  };
  preferences?: any;
  createdAt?: any;
  updatedAt?: any;
}

export default function ProfilScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [authUser]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      if (!authUser?.uid) {
        console.warn('⚠️ [PROFIL] Aucun utilisateur connecté');
        setLoading(false);
        return;
      }

      console.log('📊 [PROFIL] Chargement du profil pour:', authUser.uid);

      // Récupérer les données complètes depuis Firestore
      const userDocRef = doc(db, 'users', authUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        const profileData: UserProfile = {
          uid: authUser.uid,
          email: userData.email || authUser.email,
          emailVerified: userData.emailVerified || false,
          firstName: userData.firstName || authUser.firstName,
          lastName: userData.lastName || authUser.lastName,
          phone: userData.phone || authUser.phone,
          profile: userData.profile || { avatar: null, bio: null },
          preferences: userData.preferences,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };

        console.log('✅ [PROFIL] Profil chargé:', profileData);
        setProfile(profileData);
      } else {
        // Si le document n'existe pas, utiliser les données de l'utilisateur authentifié
        console.log('⚠️ [PROFIL] Document Firestore non trouvé, utilisation des données Auth');
        setProfile({
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: false,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          phone: authUser.phone,
          profile: { avatar: null, bio: null },
        });
      }
    } catch (error) {
      console.error('❌ [PROFIL] Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Demander la permission d'accéder à la galerie
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour ajouter une photo de profil');
        return;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Compression pour réduire la taille
        base64: true, // Obtenir l'image en base64
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await saveAvatar(base64Image);
      }
    } catch (error) {
      console.error('❌ [PROFIL] Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async () => {
    try {
      // Demander la permission d'accéder à la caméra
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra pour prendre une photo');
        return;
      }

      // Ouvrir la caméra
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await saveAvatar(base64Image);
      }
    } catch (error) {
      console.error('❌ [PROFIL] Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const saveAvatar = async (base64Image: string) => {
    if (!authUser?.uid) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    try {
      setUploadingAvatar(true);
      
      console.log('💾 [PROFIL] Sauvegarde de l\'avatar...');

      // Mettre à jour le document Firestore
      const userDocRef = doc(db, 'users', authUser.uid);
      
      // Vérifier si le document existe
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Mettre à jour le document existant
        await updateDoc(userDocRef, {
          'profile.avatar': base64Image,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Créer le document s'il n'existe pas
        await setDoc(userDocRef, {
          email: authUser.email,
          firstName: authUser.firstName || '',
          lastName: authUser.lastName || '',
          phone: authUser.phone || '',
          profile: {
            avatar: base64Image,
            bio: null,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      console.log('✅ [PROFIL] Avatar sauvegardé avec succès');

      // Mettre à jour l'état local
      setProfile(prev => prev ? {
        ...prev,
        profile: {
          ...prev.profile,
          avatar: base64Image,
        },
      } : null);

      Alert.alert('Succès', 'Photo de profil mise à jour avec succès ! ✅');
    } catch (error) {
      console.error('❌ [PROFIL] Erreur sauvegarde avatar:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la photo de profil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!authUser?.uid) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingAvatar(true);
              
              const userDocRef = doc(db, 'users', authUser.uid);
              await updateDoc(userDocRef, {
                'profile.avatar': null,
                updatedAt: serverTimestamp(),
              });

              setProfile(prev => prev ? {
                ...prev,
                profile: {
                  ...prev.profile,
                  avatar: null,
                },
              } : null);

              Alert.alert('Succès', 'Photo de profil supprimée');
            } catch (error) {
              console.error('❌ [PROFIL] Erreur suppression avatar:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la photo');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Non disponible';
    
    try {
      // Si c'est un Timestamp Firebase
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      // Si c'est déjà une date
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      // Si c'est une string
      return new Date(timestamp).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Impossible de charger le profil</Text>
      </View>
    );
  }

  const fullName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.firstName || profile.lastName || 'Non renseigné';

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => {
            const options: any[] = [
              { text: 'Annuler', style: 'cancel' as const },
              { text: 'Prendre une photo', onPress: takePhoto },
              { text: 'Choisir dans la galerie', onPress: pickImage },
            ];
            
            if (profile?.profile?.avatar) {
              options.push({ text: 'Supprimer la photo', style: 'destructive' as const, onPress: removeAvatar });
            }
            
            Alert.alert(
              'Photo de profil',
              'Choisissez une option',
              options,
              { cancelable: true }
            );
          }}
          disabled={uploadingAvatar}
        >
          {profile?.profile?.avatar ? (
            <Image
              source={{ uri: profile.profile.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {uploadingAvatar ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        {profile.emailVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.verifiedText}>Email vérifié</Text>
          </View>
        )}
      </View>

      {/* Informations personnelles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Prénom</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile.firstName || 'Non renseigné'}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Nom</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile.lastName || 'Non renseigné'}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Téléphone</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile.phone || 'Non renseigné'}
            </Text>
          </View>
        </View>
      </View>

      {/* Profil */}
      {profile.profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="image-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Avatar</Text>
              </View>
              <Text style={styles.infoValue}>
                {profile.profile.avatar ? 'Défini' : 'Non défini'}
              </Text>
            </View>

            {profile.profile.bio && (
              <>
                <View style={styles.separator} />
                <View style={styles.bioRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="document-text-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Bio</Text>
                  </View>
                  <Text style={styles.bioText}>{profile.profile.bio}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Informations système */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations système</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="key-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>ID utilisateur</Text>
            </View>
            <Text style={styles.infoValueSmall}>{profile.uid}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Créé le</Text>
            </View>
            <Text style={styles.infoValueSmall}>
              {formatDate(profile.createdAt)}
            </Text>
          </View>

          {profile.updatedAt && (
            <>
              <View style={styles.separator} />
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Mis à jour le</Text>
                </View>
                <Text style={styles.infoValueSmall}>
                  {formatDate(profile.updatedAt)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  bioRow: {
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'right',
    flex: 1,
  },
  infoValueSmall: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
  },
  bioText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 8,
    marginLeft: 32,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
});

