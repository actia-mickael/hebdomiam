import { useState, useEffect } from 'react';
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
import { getAllRecipes, exportToJson, importFromJson } from '@/services/database';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import RecipeCard from '@/components/RecipeCard';
import FilterBar from '@/components/FilterBar';

interface Props {
  isActive: boolean;
}

export default function LivrePage({ isActive }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RecipeType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (isActive) loadRecipes();
  }, [isActive]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const all = await getAllRecipes();
      setRecipes(all);
      applyFilters(all, searchQuery, seasonFilter, typeFilter);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les recettes');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    all: Recipe[],
    search: string,
    season: Season | 'all',
    type: RecipeType | 'all'
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

    if (season !== 'all') {
      filtered = filtered.filter((r) => r.season === season || r.season === 'mixte');
    }

    if (type !== 'all') {
      filtered = filtered.filter((r) => r.type === type);
    }

    setFilteredRecipes(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(recipes, text, seasonFilter, typeFilter);
  };

  const handleSeasonFilter = (season: string) => {
    const s = season as Season | 'all';
    setSeasonFilter(s);
    applyFilters(recipes, searchQuery, s, typeFilter);
  };

  const handleTypeFilter = (type: string) => {
    const t = type as RecipeType | 'all';
    setTypeFilter(t);
    applyFilters(recipes, searchQuery, seasonFilter, t);
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
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <FilterBar
            label="Saison"
            options={[
              { value: 'all', label: 'Toutes' },
              { value: 'hiver', label: '❄️ Hiver' },
              { value: 'ete', label: '☀️ Été' },
              { value: 'mixte', label: '🍂 Mixte' },
            ]}
            selected={seasonFilter}
            onSelect={handleSeasonFilter}
          />
          <FilterBar
            label="Type"
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'entree', label: '🥗 Entrée' },
              { value: 'plat', label: '🍽️ Plat' },
              { value: 'dessert', label: '🍰 Dessert' },
            ]}
            selected={typeFilter}
            onSelect={handleTypeFilter}
          />
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