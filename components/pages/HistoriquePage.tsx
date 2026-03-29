import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Recipe, WeekHistory } from '@/types/recipe';
import { getCurrentWeekRecipes, getHistoryByWeek, removeRecipeFromCurrentWeek, getSetting } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import CourseModal from '@/components/CourseModal';

interface Props {
  isActive: boolean;
  preload?: boolean;
}

export default function HistoriquePage({ isActive, preload }: Props) {
  const [currentWeek, setCurrentWeek] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<WeekHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showCourses, setShowCourses] = useState(false);
  const [deleteFromHistory, setDeleteFromHistory] = useState(false);
  // IDs retirés visuellement cette session (option OFF : sans toucher à la DB)
  const removedIds = useRef<Set<number>>(new Set());
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (isActive) loadData();
  }, [isActive]);

  useEffect(() => {
    if (preload && !hasPreloaded.current && !isActive) {
      hasPreloaded.current = true;
      loadData();
    }
  }, [preload]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [current, hist, deleteSetting] = await Promise.all([
        getCurrentWeekRecipes(),
        getHistoryByWeek(12),
        getSetting('delete_from_history', 'false'),
      ]);
      setCurrentWeek(current.filter(r => !removedIds.current.has(r.id)));
      setHistory(hist);
      setDeleteFromHistory(deleteSetting === 'true');
    } catch (error) {
      Alert.alert('Erreur', "Impossible de charger l'historique");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWeek = (weekStart: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart);
      } else {
        newSet.add(weekStart);
      }
      return newSet;
    });
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push(`/recette/${recipe.id}`);
  };

  const handleRemoveFromWeek = (recipe: Recipe) => {
    const message = deleteFromHistory
      ? `"${recipe.name}" sera retirée de cette semaine et de l'historique de la semaine en cours.`
      : `"${recipe.name}" sera retirée de cette semaine mais restera dans l'historique.`;

    Alert.alert('Retirer de la semaine ?', message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            if (deleteFromHistory) {
              // Supprime l'entrée de selection_history pour cette semaine
              await removeRecipeFromCurrentWeek(recipe.id);
              loadData();
            } else {
              // Retrait visuel uniquement — reste dans l'historique de cette semaine
              removedIds.current.add(recipe.id);
              setCurrentWeek(prev => prev.filter(r => r.id !== recipe.id));
            }
          } catch {
            Alert.alert('Erreur', 'Impossible de retirer la recette');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadData} />
      }
    >
      <CourseModal
        visible={showCourses}
        recipes={currentWeek}
        onClose={() => setShowCourses(false)}
      />

      {/* Semaine en cours */}
      <View style={styles.currentWeekSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>📅 Cette semaine</Text>
          {currentWeek.length > 0 && (
            <TouchableOpacity
              style={styles.coursesBtn}
              onPress={() => setShowCourses(true)}
            >
              <Text style={styles.coursesBtnText}>🛒 Courses</Text>
            </TouchableOpacity>
          )}
        </View>
        {currentWeek.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>
              Aucune recette sélectionnée cette semaine
            </Text>
            <Text style={styles.emptyHint}>
              Utilisez le générateur pour choisir vos repas
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.recipeCount}>
              {currentWeek.length} recette{currentWeek.length > 1 ? 's' : ''} prévue{currentWeek.length > 1 ? 's' : ''}
            </Text>
            {currentWeek.map((recipe) => (
              <View key={recipe.id} style={styles.recipeWrapper}>
                <RecipeCard
                  recipe={recipe}
                  onPress={() => handleRecipePress(recipe)}
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveFromWeek(recipe)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Historique */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>📚 Historique</Text>
        
        {history.length === 0 ? (
          <Text style={styles.noHistory}>Aucun historique disponible</Text>
        ) : (
          history.map((week) => {
            // Ne pas afficher la semaine courante dans l'historique
            const isCurrentWeek = week.weekStart === getCurrentWeekStart();
            if (isCurrentWeek) return null;
            
            const isExpanded = expandedWeeks.has(week.weekStart);
            
            return (
              <View key={week.weekStart} style={styles.weekCard}>
                <TouchableOpacity
                  style={styles.weekHeader}
                  onPress={() => toggleWeek(week.weekStart)}
                >
                  <View style={styles.weekInfo}>
                    <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                    <Text style={styles.weekCount}>
                      {week.recipes.length} recette{week.recipes.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {isExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.weekRecipes}>
                    {week.recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        compact
                        onPress={() => handleRecipePress(recipe)}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday.toISOString().split('T')[0];
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
  currentWeekSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadows.medium,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  coursesBtn: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  coursesBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  recipeCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  recipeWrapper: {
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  historySection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.small,
  },
  noHistory: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    padding: Spacing.lg,
  },
  weekCard: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  weekInfo: {
    flex: 1,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  weekCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  weekRecipes: {
    padding: Spacing.sm,
    paddingTop: 0,
  },
});