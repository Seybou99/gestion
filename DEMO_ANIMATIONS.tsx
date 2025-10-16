/**
 * 🎨 DÉMO - Comment utiliser les animations dans vos écrans
 * 
 * Ce fichier est un exemple de référence pour créer vos propres
 * animations en utilisant React Native Reanimated.
 * 
 * ⚠️ Ce fichier est à titre d'exemple uniquement, ne l'importez pas directement.
 */

import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

// ========================================
// EXEMPLE 1 : Animation Scale au Tap
// ========================================
export function AnimatedButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.95, {
          damping: 15,
          stiffness: 300,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      }}
    >
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text style={styles.buttonText}>Appuyez-moi</Text>
      </Animated.View>
    </Pressable>
  );
}

// ========================================
// EXEMPLE 2 : Animation d'Entrée
// ========================================
export function FadeInCard() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.cardTitle}>Je fais une entrée élégante ✨</Text>
    </Animated.View>
  );
}

// ========================================
// EXEMPLE 3 : Animation en Boucle
// ========================================
export function PulsingBadge() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1, // Infini
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.badge, animatedStyle]}>
      <Text style={styles.badgeText}>🔥</Text>
    </Animated.View>
  );
}

// ========================================
// EXEMPLE 4 : Animation de Rotation
// ========================================
export function RotatingLoader() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1, // Infini
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.loader, animatedStyle]}>
      <Text style={styles.loaderText}>⚙️</Text>
    </Animated.View>
  );
}

// ========================================
// EXEMPLE 5 : Animation Combinée
// ========================================
export function CombinedAnimation() {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(1.2);
        rotate.value = withTiming(360, { duration: 300 });
        opacity.value = withTiming(0.8);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        rotate.value = withTiming(0, { duration: 300 });
        opacity.value = withTiming(1);
      }}
    >
      <Animated.View
        style={[
          styles.combinedBox,
          useAnimatedStyle(() => ({
            transform: [
              { scale: scale.value },
              { rotate: `${rotate.value}deg` },
            ],
            opacity: opacity.value,
          })),
        ]}
      >
        <Text style={styles.combinedText}>🎨</Text>
      </Animated.View>
    </Pressable>
  );
}

// ========================================
// EXEMPLE 6 : Slider Animé
// ========================================
export function AnimatedSlider({ value }: { value: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(value, {
      damping: 15,
      stiffness: 100,
    });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.sliderContainer}>
      <Animated.View style={[styles.sliderFill, animatedStyle]} />
    </View>
  );
}

// ========================================
// EXEMPLE 7 : Switch Toggle Animé
// ========================================
export function AnimatedSwitch({ isOn }: { isOn: boolean }) {
  const translateX = useSharedValue(isOn ? 24 : 0);
  const backgroundColor = useSharedValue(isOn ? '#007AFF' : '#8E8E93');

  useEffect(() => {
    translateX.value = withSpring(isOn ? 24 : 0, {
      damping: 15,
      stiffness: 150,
    });
    backgroundColor.value = withTiming(
      isOn ? '#007AFF' : '#8E8E93',
      { duration: 200 }
    );
  }, [isOn]);

  return (
    <View style={styles.switchContainer}>
      <Animated.View
        style={[
          styles.switchTrack,
          useAnimatedStyle(() => ({
            backgroundColor: backgroundColor.value,
          })),
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            useAnimatedStyle(() => ({
              transform: [{ translateX: translateX.value }],
            })),
          ]}
        />
      </Animated.View>
    </View>
  );
}

// ========================================
// EXEMPLE 8 : Animation au Scroll
// ========================================
export function ScrollAnimatedCard({ scrollY }: { scrollY: Animated.SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = 1 - scrollY.value / 200;
    const scale = 1 - scrollY.value / 1000;

    return {
      opacity: Math.max(opacity, 0),
      transform: [{ scale: Math.max(scale, 0.8) }],
    };
  });

  return (
    <Animated.View style={[styles.scrollCard, animatedStyle]}>
      <Text style={styles.scrollCardText}>Je réagis au scroll 📜</Text>
    </Animated.View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 28,
  },
  loader: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 40,
  },
  combinedBox: {
    width: 80,
    height: 80,
    backgroundColor: '#34C759',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combinedText: {
    fontSize: 32,
  },
  sliderContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  switchContainer: {
    padding: 4,
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 2,
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  scrollCard: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
  },
  scrollCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#11181C',
  },
});

// ========================================
// 📚 RESSOURCES POUR APPRENDRE
// ========================================
/*

1. React Native Reanimated Documentation:
   https://docs.swmansion.com/react-native-reanimated/

2. Animations disponibles:
   - withSpring() : Animation avec rebond naturel
   - withTiming() : Animation linéaire ou avec easing
   - withDelay() : Ajouter un délai
   - withSequence() : Enchaîner des animations
   - withRepeat() : Répéter une animation

3. Easing (courbes d'animation):
   - Easing.linear
   - Easing.ease
   - Easing.bezier(x1, y1, x2, y2)
   - Easing.elastic()
   - Easing.bounce

4. Shared Values:
   - useSharedValue() : Créer une valeur partagée
   - useAnimatedStyle() : Appliquer des styles animés
   - useDerivedValue() : Calculer une valeur dérivée

5. Conseils de Performance:
   - ✅ Utiliser useSharedValue pour éviter les re-renders
   - ✅ Les animations tournent sur le thread UI (60fps)
   - ✅ Éviter les calculs lourds dans useAnimatedStyle
   - ✅ Utiliser runOnJS() pour appeler du code JS depuis une animation

6. Debugging:
   - console.log ne fonctionne pas dans useAnimatedStyle
   - Utiliser runOnJS(() => console.log(...))

*/

// ========================================
// 💡 TEMPLATE DE BASE
// ========================================
/*

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export function MonComposantAnimé() {
  // 1. Créer une valeur partagée
  const maValeur = useSharedValue(0);

  // 2. Créer le style animé
  const styleAnimé = useAnimatedStyle(() => ({
    transform: [{ translateX: maValeur.value }],
  }));

  // 3. Appliquer à un composant Animated
  return (
    <Animated.View style={[styles.monStyle, styleAnimé]}>
      <Text>Mon contenu</Text>
    </Animated.View>
  );
}

*/





