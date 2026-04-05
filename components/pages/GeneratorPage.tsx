import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Recipe, Season, RecipeType, SeasonLabels, TypeLabels } from '@/types/recipe';
import { getRandomRecipes, markRecipesSelected, updateRecipesStats, getAllRecipes, getRecipesCloudIds } from '@/services/database';
import { useAuth } from '@/context/AuthContext';
import { pushSelection } from '@/services/syncService';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import FilterBar from '@/components/FilterBar';

interface Props {
  count: number;
}

export default function GeneratorPage({ count }: Props) {
  const { session, profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const resultsY = useRef(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<RecipeType[]>([]);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
      // Charger les saisons par défaut depuis les paramètres
      import('@/services/database').then(({ getSetting }) => {
        getSetting('default_seasons', '').then(v => {
          const saved = v ? (v.split(',') as Season[]) : [];
          setSelectedSeasons(saved);
        });
      });
    }, [])
  );

  useEffect(() => {
    if (hasGenerated && generatedRecipes.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: resultsY.current, animated: true });
      }, 150);
    }
  }, [generatedRecipes]);

  const loadRecipes = async () => {
    try {
      const allRecipes = await getAllRecipes();
      setRecipes(allRecipes);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les recettes');
    }
  };

  const handleGenerate = async () => {
    if (recipes.length === 0) {
      Alert.alert('Aucune recette', 'Ajoutez des recettes dans le Livre avant de générer.');
      return;
    }

    setIsLoading(true);
    try {
      const selected = await getRandomRecipes(count, selectedSeasons, selectedTypes, ingredientFilter);
      
      if (selected.length === 0) {
        Alert.alert(
          'Aucune recette disponible',
          'Toutes les recettes correspondantes ont été utilisées récemment. Essayez d\'autres filtres ou attendez quelques jours.'
        );
      } else {
        setGeneratedRecipes(selected);
        // Toutes les recettes sont cochées par défaut
        setSelectedIds(new Set(selected.map(r => r.id)));
        setHasGenerated(true);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer les recettes');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecipeSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleValidate = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Aucune sélection', 'Cochez au moins une recette à valider.');
      return;
    }

    try {
      const ids = Array.from(selectedIds);
      const today = new Date().toISOString().split('T')[0];

      // 1. Cloud en premier (famille)
      if (profile?.familyId && session?.user?.id) {
        const cloudIds = await getRecipesCloudIds(ids);
        await Promise.all([...cloudIds.values()].map(cloudId =>
          pushSelection(profile.familyId!, cloudId, today, session.user.id).catch(() => {})
        ));
      }

      // 2. Local ensuite (cache immédiat)
      if (profile?.familyId) {
        await updateRecipesStats(ids).catch(() => {});
      } else {
        await markRecipesSelected(ids);
      }
      
      setGeneratedRecipes([]);
      setSelectedIds(new Set());
      setHasGenerated(false);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(toastAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de valider les recettes');
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push(`/recette/${recipe.id}`);
  };

  return (
    <View style={styles.container}>
    <Animated.View style={[styles.toast, { opacity: toastAnim }]} pointerEvents="none">
      <Text style={styles.toastText}>🎉  C'est noté, bon appétit !</Text>
    </Animated.View>
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadRecipes} />
      }
    >
      {/* En-tête décoratif */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🍳🥘🍲🥗🍰</Text>
        <Text style={styles.headerTitle}>Qu'est-ce qu'on mange ?</Text>
        <Text style={styles.headerSubtitle}>
          {recipes.length} recette{recipes.length > 1 ? 's' : ''} disponible{recipes.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filtres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Filtres</Text>
        
        <FilterBar
          label={`Saison${selectedSeasons.length === 0 ? ' — toutes' : ''}`}
          options={[
            { value: 'hiver', label: SeasonLabels.hiver },
            { value: 'ete', label: SeasonLabels.ete },
            { value: 'mixte', label: SeasonLabels.mixte },
          ]}
          selectedValues={selectedSeasons}
          onToggle={(v) => {
            const s = v as Season;
            setSelectedSeasons(prev =>
              prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
            );
          }}
        />

        <FilterBar
          label={`Type${selectedTypes.length === 0 ? ' — tous' : ''}`}
          options={[
            { value: 'entree', label: TypeLabels.entree },
            { value: 'plat', label: TypeLabels.plat },
            { value: 'dessert', label: TypeLabels.dessert },
          ]}
          selectedValues={selectedTypes}
          onToggle={(v) => {
            const t = v as RecipeType;
            setSelectedTypes(prev =>
              prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
            );
          }}
        />

        <View style={styles.ingredientSection}>
          <Text style={styles.countLabel}>Ingrédient :</Text>
          <View style={styles.ingredientRow}>
            <TextInput
              style={styles.ingredientInput}
              value={ingredientFilter}
              onChangeText={setIngredientFilter}
              placeholder="Ex : poulet, tomate..."
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              returnKeyType="done"
            />
            {ingredientFilter.length > 0 && (
              <TouchableOpacity
                style={styles.ingredientClear}
                onPress={() => setIngredientFilter('')}
              >
                <Text style={styles.ingredientClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>

      {/* Bouton générer */}
      <TouchableOpacity
        style={[styles.generateBtn, isLoading && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={isLoading}
      >
        <Text style={styles.generateBtnText}>
          {isLoading ? '⏳ Génération...' : '🎲   Chef, une idée ?'}
        </Text>
      </TouchableOpacity>

      {/* Résultats */}
      {hasGenerated && (
        <View
          style={styles.resultsSection}
          onLayout={e => { resultsY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>
            {ingredientFilter.trim()
              ? `🔍 ${generatedRecipes.length} recette(s) avec "${ingredientFilter.trim()}"`
              : `🎩 Tada ! ${count} idée${count > 1 ? 's' : ''} rien que pour vous !`}
          </Text>
          {selectedIds.size === 0 && (
            <Text style={styles.selectionHint}>👆 Touchez les recettes qui vous inspirent !</Text>
          )}

          {generatedRecipes.length === 0 ? (
            <Text style={styles.noResults}>Aucune recette trouvée avec ces critères</Text>
          ) : (
            <>
              {generatedRecipes.map((recipe, index) => (
                <View key={recipe.id} style={styles.recipeRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      selectedIds.has(recipe.id) && styles.checkboxChecked
                    ]}
                    onPress={() => toggleRecipeSelection(recipe.id)}
                  >
                    {selectedIds.has(recipe.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.recipeCardWrapper}>
                    <RecipeCard
                      recipe={recipe}
                      index={index}
                      onPress={() => handleRecipePress(recipe)}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity 
                style={[
                  styles.validateBtn,
                  selectedIds.size === 0 && styles.validateBtnDisabled
                ]} 
                onPress={handleValidate}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.validateBtnText}>
                  🙏     Je valide !
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Footer décoratif */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {ingredientFilter.trim()
            ? '🔍 Toutes les recettes avec cet ingrédient sont affichées'
            : '🍴 Les recettes utilisées récemment (2 semaines) sont exclues'}
        </Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 20,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.xl,
    ...Shadows.large,
    overflow: 'hidden',
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
    letterSpacing: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  ingredientInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
  },
  ingredientClear: {
    padding: Spacing.xs,
  },
  ingredientClearText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '600',
  },
  countSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  countLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  countValue: {
    fontWeight: 'bold',
    color: Colors.primaryDark,
  },
  countHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  generateBtnDisabled: {
    opacity: 0.55,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resultsSection: {
    marginBottom: Spacing.lg,
  },
  selectionHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  noResults: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    padding: Spacing.lg,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recipeCardWrapper: {
    flex: 1,
  },
  validateBtn: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  validateBtnDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  validateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: 0,
    alignItems: 'center',
    marginBottom: -Spacing.sm,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});