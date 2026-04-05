import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/config/supabase';
import { Colors, BorderRadius } from '@/constants/colors';

function parseParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Query params (?code=... ou ?access_token=...)
  const queryStr = url.split('?')[1]?.split('#')[0];
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx > 0) result[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
    });
  }
  // Hash params (#access_token=...)
  const hashStr = url.split('#')[1];
  if (hashStr) {
    hashStr.split('&').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx > 0) result[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
    });
  }
  return result;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handle = async (url: string) => {
      const params = parseParams(url);
      const code = params['code'];
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];

      try {
        if (code) {
          // PKCE flow
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setSuccess(true);
            setTimeout(() => router.replace('/'), 2500);
            return;
          }
        }
        if (accessToken && refreshToken) {
          // Implicit flow
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          setSuccess(true);
          setTimeout(() => router.replace('/'), 2500);
          return;
        }
      } catch {}
      router.replace('/');
    };

    Linking.getInitialURL().then(url => {
      if (url) handle(url);
      else router.replace('/');
    });

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Inscription validée !</Text>
        <Text style={styles.subtitle}>Bienvenue sur HebdoMiam</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.loading}>Vérification en cours…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    gap: 16,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  loading: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
});
