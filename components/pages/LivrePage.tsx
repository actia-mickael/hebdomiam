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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Recipe, Season, RecipeType, RecipeBook } from '@/types/recipe';
import { getAllRecipes, getDisplayRecipes, exportToJson, importFromJson, getSetting, getAllBooks, getRecipesByBook, markRecipesSelected, updateRecipesStats, getRecipesCloudIds } from '@/services/database';
import { useAuth } from '@/context/AuthContext';
import { pushSelection } from '@/services/syncService';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import FilterBar from '@/components/FilterBar';

interface Props {
  isActive: boolean;
  preload?: boolean;
  refreshKey?: number;
}

export default function LivrePage({ isActive, preload, refreshKey }: Props) {
  const { session, profile } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season[]>([]);
  const [typeFilter, setTypeFilter] = useState<RecipeType[]>([]);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [bookFilter, setBookFilter] = useState<number | null>(null);
  const [books, setBooks] = useState<RecipeBook[]>([]);
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

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) loadRecipes();
  }, [refreshKey]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const [all, allBooks] = await Promise.all([getDisplayRecipes(), getAllBooks()]);
      setRecipes(all);
      setBooks(allBooks);
      applyFilters(all, searchQuery, seasonFilter, typeFilter, ingredientFilter, bookFilter);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les recettes');
    } finally {
      setIsLoading(false);
    }
  };

  const normalize = (s: string) =>
    (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').toLowerCase();

  const applyFilters = async (
    all: Recipe[],
    search: string,
    seasons: Season[],
    types: RecipeType[],
    ingredient: string,
    bookId: number | null
  ) => {
    let filtered = all;

    if (bookId !== null) {
      const bookRecipes = await getRecipesByBook(bookId);
      const bookIds = new Set(bookRecipes.map(r => r.id));
      filtered = filtered.filter(r => bookIds.has(r.id));
    }

    if (search.trim()) {
      const query = normalize(search);
      filtered = filtered.filter(
        (r) =>
          normalize(r.name).includes(query) ||
          normalize(r.mainIngredient).includes(query) ||
          r.ingredients.some((i) => normalize(i).includes(query))
      );
    }

    if (seasons.length > 0) {
      filtered = filtered.filter((r) => seasons.includes(r.season) || r.season === 'mixte');
    }

    if (types.length > 0) {
      filtered = filtered.filter((r) => types.includes(r.type));
    }

    if (ingredient.trim()) {
      const ing = normalize(ingredient);
      filtered = filtered.filter(
        (r) =>
          normalize(r.mainIngredient).includes(ing) ||
          r.ingredients.some((i) => normalize(i).includes(ing))
      );
    }

    setFilteredRecipes(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(recipes, text, seasonFilter, typeFilter, ingredientFilter, bookFilter);
  };

  const toggleSeasonFilter = (season: string) => {
    const s = season as Season;
    const next = seasonFilter.includes(s)
      ? seasonFilter.filter(x => x !== s)
      : [...seasonFilter, s];
    setSeasonFilter(next);
    applyFilters(recipes, searchQuery, next, typeFilter, ingredientFilter, bookFilter);
  };

  const toggleTypeFilter = (type: string) => {
    const t = type as RecipeType;
    const next = typeFilter.includes(t)
      ? typeFilter.filter(x => x !== t)
      : [...typeFilter, t];
    setTypeFilter(next);
    applyFilters(recipes, searchQuery, seasonFilter, next, ingredientFilter, bookFilter);
  };

  const handleIngredientFilter = (text: string) => {
    setIngredientFilter(text);
    applyFilters(recipes, searchQuery, seasonFilter, typeFilter, text, bookFilter);
  };

  const toggleBookFilter = (id: number) => {
    const next = bookFilter === id ? null : id;
    setBookFilter(next);
    applyFilters(recipes, searchQuery, seasonFilter, typeFilter, ingredientFilter, next);
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

  const handleRecipeLongPress = (recipe: Recipe) => {
    Alert.alert(
      '📅 Ajouter à la semaine ?',
      `Ajouter "${recipe.name}" à la semaine en cours ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];

              // 1. Cloud en premier (famille)
              if (profile?.familyId && session?.user?.id) {
                const cloudIds = await getRecipesCloudIds([recipe.id]);
                await Promise.all([...cloudIds.values()].map(cloudId =>
                  pushSelection(profile.familyId!, cloudId, today, session.user.id).catch(() => {})
                ));
              }

              // 2. Local ensuite (cache immédiat)
              if (profile?.familyId) {
                await updateRecipesStats([recipe.id]).catch(() => {});
              } else {
                await markRecipesSelected([recipe.id]);
              }
              Alert.alert('✅ Ajouté', `"${recipe.name}" ajoutée à la semaine en cours.`);
            } catch {
              Alert.alert('Erreur', "Impossible d'ajouter la recette à la semaine.");
            }
          },
        },
      ]
    );
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
              applyFilters(recipes, searchQuery, persistFilters ? seasonFilter : [], persistFilters ? typeFilter : [], '', bookFilter);
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

      {/* Filtre par livre */}
      {books.length > 0 && (
        <View style={styles.booksFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksFilterScroll}>
            <TouchableOpacity
              style={[styles.bookChip, bookFilter === null && styles.bookChipActive]}
              onPress={() => { setBookFilter(null); applyFilters(recipes, searchQuery, seasonFilter, typeFilter, ingredientFilter, null); }}
            >
              <Text style={[styles.bookChipText, bookFilter === null && styles.bookChipTextActive]}>
                📚 Tous
              </Text>
            </TouchableOpacity>
            {books.map(book => (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookChip, bookFilter === book.id && styles.bookChipActive, { borderColor: book.color }]}
                onPress={() => toggleBookFilter(book.id)}
              >
                <Text style={[styles.bookChipText, bookFilter === book.id && styles.bookChipTextActive]}>
                  {book.icon} {book.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/catalogue')}>
          <Text style={styles.actionBtnText}>📚 Catalogue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleImport}>
          <Text style={styles.actionBtnText}>📥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>📤</Text>
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
          <RecipeCard
            recipe={item}
            onPress={() => handleRecipePress(item)}
            onLongPress={() => handleRecipeLongPress(item)}
          />
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
  booksFilterContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  booksFilterScroll: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  bookChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  bookChipActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  bookChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bookChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
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