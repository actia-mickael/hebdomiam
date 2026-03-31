import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  View, Text, ActivityIndicator, StyleSheet, StatusBar,
  Platform, Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initDatabase, getUsedImagePaths } from '@/services/database';
import { syncDown, syncDirty } from '@/services/syncService';
import { initImageDirectory, cleanOrphanImages } from '@/services/imageService';
import { Colors, BorderRadius } from '@/constants/colors';

// ── Avatar utilisateur (initiale dans un cercle) ──────────────────────────
function UserAvatar({ onPress }: { onPress: () => void }) {
  const { profile } = useAuth();
  const initial = profile?.displayName?.[0]?.toUpperCase() ?? '?';
  return (
    <TouchableOpacity onPress={onPress} style={avatarStyles.btn}>
      <View style={avatarStyles.circle}>
        <Text style={avatarStyles.initial}>{initial}</Text>
      </View>
    </TouchableOpacity>
  );
}

const avatarStyles = StyleSheet.create({
  btn: { marginRight: 8, padding: 2 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── Gate auth + sync ──────────────────────────────────────────────────────

function RootLayoutNav() {
  const { session, profile, isLoading, isEmailVerified, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const scaleAnim = useState(() => new Animated.Value(0.8))[0];

  // Init DB locale
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

    Promise.all([
      (async () => {
        await initDatabase();
        await initImageDirectory();
        getUsedImagePaths().then(cleanOrphanImages).catch(() => {});
      })(),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]).then(() => setDbReady(true)).catch(() => setDbReady(true));
  }, []);

  // Sync famille au démarrage
  useEffect(() => {
    if (!dbReady || !session || !isEmailVerified || !profile?.familyId) return;
    const familyId = profile.familyId;
    const userId = session.user.id;
    // Sync en arrière-plan
    syncDown(familyId).catch(() => {});
    if (isAdmin) {
      syncDirty(familyId, userId).catch(() => {});
    }
  }, [dbReady, session, isEmailVerified, profile?.familyId]);

  // Redirections auth
  useEffect(() => {
    if (isLoading || !dbReady) return;

    const inAuth = segments[0] === 'auth';

    if (!session) {
      if (!inAuth) router.replace('/auth/login');
    } else if (!isEmailVerified) {
      if (!(segments[0] === 'auth' && segments[1] === 'verify-email')) {
        router.replace('/auth/verify-email');
      }
    } else {
      if (inAuth) router.replace('/');
    }
  }, [isLoading, dbReady, session, isEmailVerified, segments]);

  // Splash screen
  if (!dbReady || isLoading) {
    return (
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
        <Text style={styles.splashVersion}>v1.1</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <UserAvatar onPress={() => router.push('/parametres')} />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '🍽️ HebdoMiam',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => router.push('/famille')}
              >
                <Text style={{ fontSize: 22 }}>👨‍👩‍👧</Text>
              </TouchableOpacity>
              <UserAvatar onPress={() => router.push('/parametres')} />
            </View>
          ),
        }}
      />
      <Stack.Screen name="recette/[id]" options={{ title: 'Recette' }} />
      <Stack.Screen name="parametres" options={{ title: 'Paramètres' }} />
      <Stack.Screen name="catalogue" options={{ title: '📚 Catalogue' }} />
      <Stack.Screen name="famille" options={{ title: '👨‍👩‍👧 Famille' }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
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
  splashContent: { alignItems: 'center', paddingHorizontal: 40 },
  logoCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  splashEmoji: { fontSize: 56 },
  splashTitle: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1, marginBottom: 8 },
  splashTagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontWeight: '400' },
  splashDivider: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginVertical: 28 },
  splashSpinner: { marginBottom: 10 },
  splashLoadingText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  splashVersion: { position: 'absolute', bottom: 32, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
