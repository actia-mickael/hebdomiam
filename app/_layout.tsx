import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, Platform, Animated } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { initDatabase, getUsedImagePaths } from '@/services/database';
import { initImageDirectory, cleanOrphanImages } from '@/services/imageService';
import { Colors } from '@/constants/colors';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const scaleAnim = useState(() => new Animated.Value(0.8))[0];

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor(Colors.primary);
      StatusBar.setBarStyle('dark-content');
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    async function init() {
      try {
        const [_] = await Promise.all([
          (async () => {
            await initDatabase();
            await initImageDirectory();
            getUsedImagePaths().then(cleanOrphanImages).catch(() => {});
          })(),
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);
        setIsReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur initialisation');
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={styles.splashContainer}>
          <View style={styles.splashOverlay} />
          <View style={styles.splashContent}>
            <Text style={styles.splashEmoji}>⚠️</Text>
            <Text style={styles.splashTitle}>HebdoMiam</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isReady) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={styles.splashContainer}>
          <View style={styles.splashOverlay} />
          <Animated.View style={[styles.splashContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.logoCircle}>
              <Text style={styles.splashEmoji}>🍽️</Text>
            </View>
            <Text style={styles.splashTitle}>HebdoMiam</Text>
            <Text style={styles.splashTagline}>Planifiez vos repas de la semaine</Text>
            <View style={styles.splashDivider} />
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" style={styles.splashSpinner} />
            <Text style={styles.splashLoadingText}>Initialisation...</Text>
          </Animated.View>
          <Text style={styles.splashVersion}>v1.0</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: '🍽️ HebdoMiam',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="recette/[id]"
          options={{
            title: 'Recette',
          }}
        />
        <Stack.Screen
          name="parametres"
          options={{
            title: 'Paramètres',
          }}
        />
        <Stack.Screen
          name="catalogue"
          options={{
            title: '📚 Catalogue',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    opacity: 0.92,
  },
  splashContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  splashEmoji: {
    fontSize: 56,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  splashTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  splashDivider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginVertical: 28,
  },
  splashSpinner: {
    marginBottom: 10,
  },
  splashLoadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  splashVersion: {
    position: 'absolute',
    bottom: 32,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(255,200,200,1)',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});