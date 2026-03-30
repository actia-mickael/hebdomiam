import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/config/supabase';
import { resendVerificationEmail } from '@/services/authService';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) throw new Error('E-mail introuvable');
      await resendVerificationEmail(email);
      Alert.alert('✅ E-mail envoyé', 'Vérifiez votre boîte mail.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de renvoyer');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      // Rafraîchir la session — si l'email est vérifié, email_confirmed_at sera défini
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (!data.session?.user?.email_confirmed_at) {
        Alert.alert('En attente', "Votre e-mail n'est pas encore confirmé.\nCliquez le lien dans votre boîte mail.");
      }
      // Si confirmé → AuthContext met à jour isEmailVerified → _layout redirige
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de vérifier le statut');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Vérifiez votre e-mail</Text>
          <Text style={styles.body}>
            Un lien de confirmation a été envoyé à votre adresse e-mail.{'\n\n'}
            Cliquez le lien dans l'e-mail, puis revenez ici.
          </Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleCheckVerified}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>✅ J'ai confirmé mon e-mail</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleResend}
            disabled={resending}
          >
            {resending
              ? <ActivityIndicator color={Colors.primaryDark} />
              : <Text style={styles.btnSecondaryText}>🔁 Renvoyer l'e-mail</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.large,
  },
  emoji: { fontSize: 64, marginBottom: Spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  body: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  btnPrimary: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.sm,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: { color: Colors.primaryDark, fontSize: 15, fontWeight: '600' },
});
