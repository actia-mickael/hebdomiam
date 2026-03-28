import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { RecipeStats, SeasonLabels, TypeLabels } from '@/types/recipe';
import { getRecipeStats } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';

const { width } = Dimensions.get('window');

interface Props {
  isActive: boolean;
}

export default function StatsPage({ isActive }: Props) {
  const [stats, setStats] = useState<RecipeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isActive) loadStats();
  }, [isActive]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await getRecipeStats();
      setStats(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  if (!stats) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  const maxSeason = Math.max(...Object.values(stats.bySeason), 1);
  const maxType = Math.max(...Object.values(stats.byType), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadStats} />
      }
    >
      {/* Vue d'ensemble */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.statValue}>{stats.totalRecipes}</Text>
            <Text style={styles.statLabel}>Recettes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.accentLight }]}>
            <Text style={styles.statValue}>{stats.totalSelections}</Text>
            <Text style={styles.statLabel}>Sélections</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.seasonEte }]}>
            <Text style={styles.statValue}>
              {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Note moy.</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.typeDessert }]}>
            <Text style={styles.statValue}>{stats.favorites.length}</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </View>
        </View>
      </View>

      {/* Répartition par saison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❄️☀️ Par saison</Text>
        {Object.entries(stats.bySeason).map(([season, count]) => (
          <View key={season} style={styles.barRow}>
            <Text style={styles.barLabel}>{SeasonLabels[season as keyof typeof SeasonLabels]}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${(count / maxSeason) * 100}%`,
                    backgroundColor:
                      season === 'hiver'
                        ? Colors.seasonHiver
                        : season === 'ete'
                        ? Colors.seasonEte
                        : Colors.seasonMixte,
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Répartition par type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ Par type</Text>
        {Object.entries(stats.byType).map(([type, count]) => (
          <View key={type} style={styles.barRow}>
            <Text style={styles.barLabel}>{TypeLabels[type as keyof typeof TypeLabels]}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${(count / maxType) * 100}%`,
                    backgroundColor:
                      type === 'entree'
                        ? Colors.typeEntree
                        : type === 'plat'
                        ? Colors.typePlat
                        : Colors.typeDessert,
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Top utilisées */}
      {stats.topUsed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Les plus utilisées</Text>
          {stats.topUsed.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              compact
              onPress={() => router.push(`/recette/${recipe.id}`)}
            />
          ))}
        </View>
      )}

      {/* Jamais utilisées */}
      {stats.neverUsed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💤 Jamais sélectionnées</Text>
          <Text style={styles.sectionSubtitle}>
            Ces recettes n'ont jamais été tirées au sort
          </Text>
          {stats.neverUsed.slice(0, 5).map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              compact
              onPress={() => router.push(`/recette/${recipe.id}`)}
            />
          ))}
          {stats.neverUsed.length > 5 && (
            <Text style={styles.moreText}>
              + {stats.neverUsed.length - 5} autre(s)
            </Text>
          )}
        </View>
      )}

      {/* Activité mensuelle */}
      {stats.selectionsByMonth.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Activité mensuelle</Text>
          <View style={styles.monthlyChart}>
            {stats.selectionsByMonth.map((item) => {
              const maxMonth = Math.max(...stats.selectionsByMonth.map((m) => m.count), 1);
              const height = (item.count / maxMonth) * 80;
              return (
                <View key={item.month} style={styles.monthBar}>
                  <View
                    style={[
                      styles.monthBarFill,
                      { height, backgroundColor: Colors.primary },
                    ]}
                  />
                  <Text style={styles.monthLabel}>
                    {item.month.split('-')[1]}
                  </Text>
                  <Text style={styles.monthValue}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Favoris */}
      {stats.favorites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❤️ Mes favoris</Text>
          {stats.favorites.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              compact
              onPress={() => router.push(`/recette/${recipe.id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: (width - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm * 3) / 4,
    minWidth: 70,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  barLabel: {
    width: 90,
    fontSize: 13,
    color: Colors.text,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  barValue: {
    width: 30,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  monthlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.md,
  },
  monthBar: {
    alignItems: 'center',
    width: 30,
  },
  monthBarFill: {
    width: 20,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.textLight,
  },
  monthValue: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  moreText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
});