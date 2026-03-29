import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Recipe, Season, RecipeType } from '@/types/recipe';
import { getAllRecipes, exportToJson, importFromJson, getSetting } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import FilterBar from '@/components/FilterBar';

interface Props {
  isActive: boolean;
  preload?: boolean;
}

export default function LivrePage({ isActive, preload }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season[]>([]);
  const [typeFilter, setTypeFilter] = useState<RecipeType[]>([]);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [persistFilters, setPersistFilters] = useState(false);
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (isActive) {
      loadRecipes();
      getSetting('persist_filters', 'false').then(v => setPersistFilters(v === 'true'));
    }
  }, [isActive]);

  useEffect(() => {
    if (preload && !hasPreloaded.current && !isActive) {
      hasPreloaded.current = true;
      loadRecipes();
      getSetting('persist_filters', 'false').then(v => setPersistFilters(v === 'true'));
    }
  }, [preload]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const all = await getAllRecipes();
      setRecipes(all);
      applyFilters(all, searchQuery, seasonFilter, typeFilter, ingredientFilter);

    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les recettes');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    all: Recipe[],
    search: string,
    seasons: Season[],
    types: RecipeType[],
    ingredient: string
  ) => {
    let filtered = all;

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.mainIngredient.toLowerCase().includes(query) ||
          r.ingredients.some((i) => i.toLowerCase().includes(query))
      );
    }

    if (seasons.length > 0) {
      filtered = filtered.filter((r) => seasons.includes(r.season) || r.season === 'mixte');
    }

    if (types.length > 0) {
      filtered = filtered.filter((r) => types.includes(r.type));
    }

    if (ingredient.trim()) {
      const ing = ingredient.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.mainIngredient.toLowerCase().includes(ing) ||
          r.ingredients.some((i) => i.toLowerCase().includes(ing))
      );
    }

    setFilteredRecipes(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(recipes, text, seasonFilter, typeFilter, ingredientFilter);
  };

  const toggleSeasonFilter = (season: string) => {
    const s = season as Season;
    const next = seasonFilter.includes(s)
      ? seasonFilter.filter(x => x !== s)
      : [...seasonFilter, s];
    setSeasonFilter(next);
    applyFilters(recipes, searchQuery, next, typeFilter, ingredientFilter);
  };

  const toggleTypeFilter = (type: string) => {
    const t = type as RecipeType;
    const next = typeFilter.includes(t)
      ? typeFilter.filter(x => x !== t)
      : [...typeFilter, t];
    setTypeFilter(next);
    applyFilters(recipes, searchQuery, seasonFilter, next, ingredientFilter);
  };

  const handleIngredientFilter = (text: string) => {
    setIngredientFilter(text);
    applyFilters(recipes, searchQuery, seasonFilter, typeFilter, text);
  };

  const handleExport = async () => {
    try {
      const json = await exportToJson();
      const path = `${FileSystem.cacheDirectory}recettes_export.json`;
      await FileSystem.writeAsStringAsync(path, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Exporter les recettes',
        });
      } else {
        Alert.alert('Export', 'Fichier sauvegardé dans le cache');
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'exporter les recettes");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled || !result.assets[0]) return;

      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const imported = await importFromJson(content);

      Alert.alert('✅ Import réussi', `${imported} nouvelle(s) recette(s) importée(s)`);
      loadRecipes();
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'importer le fichier");
    }
  };

  const handleAddRecipe = () => {
    router.push('/recette/new');
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push(`/recette/${recipe.id}`);
  };

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher une recette..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => {
            if (showFilters) {
              setIngredientFilter('');
              if (!persistFilters) {
                setSeasonFilter([]);
                setTypeFilter([]);
              }
              applyFilters(recipes, searchQuery, persistFilters ? seasonFilter : [], persistFilters ? typeFilter : [], '');
            }
            setShowFilters(!showFilters);
          }}
        >
          <Text style={styles.filterToggleText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <FilterBar
            label={`Saison${seasonFilter.length === 0 ? ' — toutes' : ''}`}
            options={[
              { value: 'hiver', label: '❄️ Hiver' },
              { value: 'ete', label: '☀️ Été' },
              { value: 'mixte', label: '🍂 Mixte' },
            ]}
            selectedValues={seasonFilter}
            onToggle={toggleSeasonFilter}
          />
          <FilterBar
            label={`Type${typeFilter.length === 0 ? ' — tous' : ''}`}
            options={[
              { value: 'entree', label: '🥗 Entrée' },
              { value: 'plat', label: '🍽️ Plat' },
              { value: 'dessert', label: '🍰 Dessert' },
            ]}
            selectedValues={typeFilter}
            onToggle={toggleTypeFilter}
          />
          <View style={styles.ingredientSection}>
            <Text style={styles.ingredientLabel}>Ingrédient</Text>
            <View style={styles.ingredientRow}>
              <TextInput
                style={styles.ingredientInput}
                value={ingredientFilter}
                onChangeText={handleIngredientFilter}
                placeholder="Ex : poulet, tomate..."
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                returnKeyType="done"
              />
              {ingredientFilter.length > 0 && (
                <TouchableOpacity
                  style={styles.ingredientClear}
                  onPress={() => handleIngredientFilter('')}
                >
                  <Text style={styles.ingredientClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleImport}>
          <Text style={styles.actionBtnText}>📥 Import</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>📤 Export</Text>
        </TouchableOpacity>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredRecipes.length} recette(s)</Text>
        </View>
      </View>

      {/* Liste */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadRecipes} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>
              {recipes.length === 0
                ? 'Aucune recette enregistrée'
                : 'Aucune recette ne correspond aux filtres'}
            </Text>
          </View>
        }
      />

      {/* Bouton ajouter */}
      <TouchableOpacity style={styles.fab} onPress={handleAddRecipe}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    ...Shadows.small,
  },
  filterToggle: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  filterToggleActive: {
    backgroundColor: Colors.primary,
  },
  filterToggleText: {
    fontSize: 20,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  ingredientSection: {
    marginBottom: Spacing.xs,
  },
  ingredientLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
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
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  actionBtn: {
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: 14,
    color: Colors.text,
  },
  countBadge: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.large,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: -2,
  },
});