import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { RecipeDetail } from '@/types/recipe';
import { getRecipeDetailWithCache } from '@/services/cloudService';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/colors';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export default function FicheScreen() {
  const { bookRecipeId, name } = useLocalSearchParams<{ bookRecipeId: string; name: string }>();
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookRecipeId) { setError('Paramètre manquant.'); setLoading(false); return; }
    getRecipeDetailWithCache(Number(bookRecipeId))
      .then(d => {
        setDetail(d);
        if (!d) setError('Aucune fiche disponible pour cette recette.');
      })
      .catch(() => setError('Impossible de charger la fiche. Vérifiez votre connexion.'))
      .finally(() => setLoading(false));
  }, [bookRecipeId]);

  const photoUrl = detail?.photos?.[0]
    ? `${SUPABASE_URL}/storage/v1/object/public/recipe-photos/${detail.photos[0]}`
    : null;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: name ?? 'Fiche complète' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement de la fiche…</Text>
        </View>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <Stack.Screen options={{ title: name ?? 'Fiche complète' }} />
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>📭</Text>
          <Text style={styles.errorTitle}>Fiche indisponible</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  const totalTime = (detail.prep_time ?? 0) + (detail.cook_time ?? 0) + (detail.rest_time ?? 0);

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Fiche complète' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Photo principale */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderEmoji}>🍽️</Text>
          </View>
        )}

        {/* Infos rapides */}
        <View style={styles.infoBar}>
          {!!detail.prep_time && (
            <View style={styles.infoChip}>
              <Text style={styles.infoEmoji}>🥄</Text>
              <Text style={styles.infoValue}>{detail.prep_time} min</Text>
              <Text style={styles.infoLabel}>préparation</Text>
            </View>
          )}
          {!!detail.cook_time && (
            <View style={styles.infoChip}>
              <Text style={styles.infoEmoji}>🔥</Text>
              <Text style={styles.infoValue}>{detail.cook_time} min</Text>
              <Text style={styles.infoLabel}>cuisson</Text>
            </View>
          )}
          {!!detail.rest_time && (
            <View style={styles.infoChip}>
              <Text style={styles.infoEmoji}>⏳</Text>
              <Text style={styles.infoValue}>{detail.rest_time} min</Text>
              <Text style={styles.infoLabel}>repos</Text>
            </View>
          )}
          {!!detail.servings && (
            <View style={styles.infoChip}>
              <Text style={styles.infoEmoji}>👥</Text>
              <Text style={styles.infoValue}>{detail.servings}</Text>
              <Text style={styles.infoLabel}>personnes</Text>
            </View>
          )}
          {!!detail.difficulty && (
            <View style={styles.infoChip}>
              <Text style={styles.infoEmoji}>
                {detail.difficulty === 'facile' ? '🟢' : detail.difficulty === 'moyen' ? '🟡' : '🔴'}
              </Text>
              <Text style={styles.infoValue}>{detail.difficulty}</Text>
              <Text style={styles.infoLabel}>difficulté</Text>
            </View>
          )}
        </View>

        {/* Ingrédients */}
        {detail.ingredients?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛒 Ingrédients</Text>
            {detail.ingredients.map((ing, i) => (
              <View key={i} style={[styles.ingredientRow, i < detail.ingredients.length - 1 && styles.ingredientBorder]}>
                <Text style={styles.ingredientQty}>
                  {ing.qty ? `${ing.qty}${ing.unit ? '\u00a0' + ing.unit : ''}` : '\u2014'}
                </Text>
                <Text style={styles.ingredientLabel}>{ing.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Étapes */}
        {detail.steps?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍🍳 Préparation</Text>
            {detail.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.order}</Text>
                </View>
                <View style={styles.stepContent}>
                  {!!step.title && <Text style={styles.stepTitle}>{step.title}</Text>}
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Conseils */}
        {!!detail.tips && (
          <View style={[styles.section, styles.tipsSection]}>
            <Text style={styles.sectionTitle}>💡 Conseils</Text>
            <Text style={styles.tipsText}>{detail.tips}</Text>
          </View>
        )}

        {/* Nutrition */}
        {!!detail.nutrition && Object.values(detail.nutrition).some(v => !!v) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Valeurs nutritionnelles</Text>
            <Text style={styles.nutritionSub}>Pour {detail.servings ?? 1} personne(s)</Text>
            <View style={styles.nutritionRow}>
              {!!detail.nutrition.calories && (
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionValue}>{detail.nutrition.calories}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
              )}
              {!!detail.nutrition.proteines && (
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionValue}>{detail.nutrition.proteines}g</Text>
                  <Text style={styles.nutritionLabel}>protéines</Text>
                </View>
              )}
              {!!detail.nutrition.glucides && (
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionValue}>{detail.nutrition.glucides}g</Text>
                  <Text style={styles.nutritionLabel}>glucides</Text>
                </View>
              )}
              {!!detail.nutrition.lipides && (
                <View style={styles.nutritionChip}>
                  <Text style={styles.nutritionValue}>{detail.nutrition.lipides}g</Text>
                  <Text style={styles.nutritionLabel}>lipides</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Lien source */}
        {!!detail.source_url && (
          <TouchableOpacity
            style={styles.sourceBtn}
            onPress={() => Linking.openURL(detail.source_url!)}
          >
            <Text style={styles.sourceBtnText}>🔗 Voir la recette originale</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl, minHeight: 400,
  },
  loadingText: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: 14 },
  errorEmoji: { fontSize: 52, marginBottom: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  photo: { width: '100%', height: 240, resizeMode: 'cover' },
  photoPlaceholder: {
    width: '100%', height: 160,
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  photoPlaceholderEmoji: { fontSize: 64 },

  infoBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoChip: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    minWidth: 68,
  },
  infoEmoji: { fontSize: 18, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  infoLabel: { fontSize: 10, color: Colors.textLight, marginTop: 1 },

  section: {
    margin: Spacing.md,
    marginBottom: 0,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.small,
  },
  tipsSection: { backgroundColor: Colors.primarySurface },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md,
  },

  ingredientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
  },
  ingredientBorder: {
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  ingredientQty: {
    width: 90, fontSize: 13, fontWeight: '600', color: Colors.primaryDark,
  },
  ingredientLabel: { flex: 1, fontSize: 14, color: Colors.text },

  stepRow: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  stepBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  stepText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  tipsText: {
    fontSize: 14, color: Colors.primaryDark, lineHeight: 21, fontStyle: 'italic',
  },

  nutritionSub: { fontSize: 12, color: Colors.textLight, marginTop: -8, marginBottom: Spacing.md },
  nutritionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  nutritionChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 72,
  },
  nutritionValue: { fontSize: 17, fontWeight: '700', color: Colors.text },
  nutritionLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },

  sourceBtn: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  sourceBtnText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '600' },
});
