import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { getSetting, setSetting } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { Season, SeasonLabels } from '@/types/recipe';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/authService';

const ALL_SEASONS: Season[] = ['hiver', 'ete', 'mixte'];

export default function ParametresScreen() {
  const { session, profile } = useAuth();
  const [recipeCount, setRecipeCount] = useState(3);
  const [deleteFromHistory, setDeleteFromHistory] = useState(false);
  const [defaultSeasons, setDefaultSeasons] = useState<Season[]>([]);
  const [persistFilters, setPersistFilters] = useState(false);

  useEffect(() => {
    getSetting('recipe_count', '3').then(v => setRecipeCount(Number(v)));
    getSetting('delete_from_history', 'false').then(v => setDeleteFromHistory(v === 'true'));
    getSetting('default_seasons', '').then(v => {
      setDefaultSeasons(v ? (v.split(',') as Season[]) : []);
    });
    getSetting('persist_filters', 'false').then(v => setPersistFilters(v === 'true'));
  }, []);

  const handlePersistFiltersChange = async (value: boolean) => {
    setPersistFilters(value);
    await setSetting('persist_filters', value ? 'true' : 'false');
  };

  const toggleDefaultSeason = async (season: Season) => {
    const next = defaultSeasons.includes(season)
      ? defaultSeasons.filter(s => s !== season)
      : [...defaultSeasons, season];
    setDefaultSeasons(next);
    await setSetting('default_seasons', next.join(','));
  };

  const handleDeleteFromHistoryChange = async (value: boolean) => {
    setDeleteFromHistory(value);
    await setSetting('delete_from_history', value ? 'true' : 'false');
  };

  const handleCountChange = async (n: number) => {
    setRecipeCount(n);
    await setSetting('recipe_count', String(n));
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Paramètres',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        {/* Compte connecté */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Compte</Text>
          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {profile?.displayName?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              {profile?.displayName ? (
                <Text style={styles.accountName}>{profile.displayName}</Text>
              ) : null}
              <Text style={styles.accountEmail}>{session?.user?.email ?? '—'}</Text>
              {profile?.familyId && profile?.familyName ? (
                <Text style={styles.accountFamily}>👨‍👩‍👧 {profile.familyName}</Text>
              ) : (
                <Text style={styles.accountFamilySolo}>Mode solo</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>🚪 Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>🎲 Génération</Text>


          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Nombre de recettes à générer</Text>
              <Text style={styles.rowHint}>Utilisé à chaque tirage au sort</Text>
            </View>
            <View style={styles.countButtons}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, recipeCount === n && styles.countBtnActive]}
                  onPress={() => handleCountChange(n)}
                >
                  <Text style={[styles.countBtnText, recipeCount === n && styles.countBtnTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>🌍 Saison par défaut</Text>
          <Text style={styles.rowHint}>
            {defaultSeasons.length === 0
              ? 'Toutes les saisons sont proposées au démarrage'
              : `Pré-sélectionné au démarrage : ${defaultSeasons.map(s => SeasonLabels[s]).join(', ')}`}
          </Text>
          <View style={styles.seasonPills}>
            {ALL_SEASONS.map(season => {
              const active = defaultSeasons.includes(season);
              return (
                <TouchableOpacity
                  key={season}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => toggleDefaultSeason(season)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {SeasonLabels[season]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.resetHint}>
            Aucune sélection = toutes les saisons
          </Text>
        </View>

        <View style={[styles.section, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>📖 Livre de recettes</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Permanence des filtres de recherche</Text>
              <Text style={styles.rowHint}>
                {persistFilters
                  ? 'Les filtres saison et type sont conservés à la fermeture'
                  : 'Les filtres saison et type sont réinitialisés à la fermeture'}
              </Text>
            </View>
            <Switch
              value={persistFilters}
              onValueChange={handlePersistFiltersChange}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={persistFilters ? '#fff' : Colors.surface}
            />
          </View>
        </View>

        <View style={[styles.section, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>📅 Semaine</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Supprimer de l'historique semaine</Text>
              <Text style={styles.rowHint}>
                {deleteFromHistory
                  ? "Retirer une recette l'efface aussi de l'historique de cette semaine"
                  : "Retirer une recette la conserve dans l'historique de cette semaine"}
              </Text>
            </View>
            <Switch
              value={deleteFromHistory}
              onValueChange={handleDeleteFromHistoryChange}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={deleteFromHistory ? '#fff' : Colors.surface}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  accountEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  accountFamily: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600', marginTop: 3 },
  accountFamilySolo: { fontSize: 12, color: Colors.textLight, marginTop: 3 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  signOutText: { color: Colors.error, fontWeight: '600', fontSize: 14 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.small,
  },
  sectionGap: {
    marginTop: Spacing.md,
  },
  seasonPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  pillText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resetHint: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  rowHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  countButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  countBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  countBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  countBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  countBtnTextActive: {
    color: '#fff',
  },
});
