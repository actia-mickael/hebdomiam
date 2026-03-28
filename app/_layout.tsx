import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase, getUsedImagePaths } from '@/services/database';
import { initImageDirectory, cleanOrphanImages } from '@/services/imageService';
import { Colors } from '@/constants/colors';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        await initImageDirectory();
        // Nettoyage non-bloquant des images orphelines au démarrage
        getUsedImagePaths().then(cleanOrphanImages).catch(() => {});
        setIsReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur initialisation');
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
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
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
  },
});