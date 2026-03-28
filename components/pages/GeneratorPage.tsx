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
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Recipe, Season, RecipeType, SeasonLabels, TypeLabels } from '@/types/recipe';
import { getRandomRecipes, markRecipesSelected, getAllRecipes } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import FilterBar from '@/components/FilterBar';

interface Props {
  count: number;
}

export default function GeneratorPage({ count }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const resultsY = useRef(0);

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
      await markRecipesSelected(ids);
      
      Alert.alert(
        '✅ Validé !',
        `${ids.length} recette(s) enregistrée(s) pour cette semaine.`,
        [{ text: 'OK', onPress: () => {
          setGeneratedRecipes([]);
          setSelectedIds(new Set());
          setHasGenerated(false);
        }}]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de valider les recettes');
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push(`/recette/${recipe.id}`);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
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

        <View style={styles.countSection}>
          <Text style={styles.countLabel}>
            Nombre de recettes : <Text style={styles.countValue}>{count}</Text>
          </Text>
          <Text style={styles.countHint}>Modifiable dans les paramètres ⚙️</Text>
        </View>
      </View>

      {/* Bouton générer */}
      <TouchableOpacity
        style={[styles.generateBtn, isLoading && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={isLoading}
      >
        <Text style={styles.generateBtnText}>
          {isLoading ? '⏳ Génération...' : '🎲 Générer les recettes'}
        </Text>
      </TouchableOpacity>

      {/* Résultats */}
      {hasGenerated && (
        <View
          style={styles.resultsSection}
          onLayout={e => { resultsY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>
            🍽️ Recettes proposées ({generatedRecipes.length})
          </Text>
          <Text style={styles.selectionHint}>
            Cochez les recettes à valider ({selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''})
          </Text>

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
                  ✅ Valider la sélection ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Footer décoratif */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🍴 Les recettes utilisées récemment (2 semaines) sont exclues
        </Text>
      </View>
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  headerEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
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
    backgroundColor: Colors.primaryDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.small,
  },
  validateBtnDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  validateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});