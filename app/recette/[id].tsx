import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import {
  Recipe,
  NewRecipe,
  Season,
  RecipeType,
  Frequency,
  SeasonLabels,
  TypeLabels,
  FrequencyLabels,
  RecipeBook,
} from '@/types/recipe';
import { getRecipeById, createRecipe, updateRecipe, deleteRecipe, getAllBooks, getBookIdsForRecipe, setRecipeBooks, getBookRecipeCloudId } from '@/services/database';
import { takePhoto, pickImage, deleteImage } from '@/services/imageService';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import StarRating from '@/components/StarRating';

const seasons: Season[] = ['hiver', 'ete', 'mixte'];
const types: RecipeType[] = ['entree', 'plat', 'dessert'];
const frequencies: Frequency[] = ['rare', 'normal', 'frequent'];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: '',
    season: 'mixte',
    type: 'plat',
    frequency: 'normal',
    mainIngredient: '',
    ingredients: ['', '', '', '', '', '', '', '', ''],
    comment: '',
    recipeLink: '',
    rating: null,
    isFavorite: false,
    imagePath: null,
  });
  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [books, setBooks] = useState<RecipeBook[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [bookRecipeCloudId, setBookRecipeCloudId] = useState<number | null>(null);

  useEffect(() => {
    getAllBooks().then(setBooks).catch(() => {});
    if (!isNew) {
      loadRecipe();
    }
  }, [id]);

  const loadRecipe = async () => {
    try {
      const [data, bookIds, cloudId] = await Promise.all([
        getRecipeById(Number(id)),
        getBookIdsForRecipe(Number(id)),
        getBookRecipeCloudId(Number(id)),
      ]);
      if (data) {
        const ingredients = [...(data.ingredients || [])];
        while (ingredients.length < 9) ingredients.push('');
        setRecipe({ ...data, ingredients });
        setSelectedBookIds(bookIds);
        setBookRecipeCloudId(cloudId);
      } else {
        Alert.alert('Erreur', 'Recette introuvable');
        router.back();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la recette');
      router.back();
    }
  };

  const handleSave = async () => {
    if (!recipe.name?.trim()) {
      Alert.alert('Erreur', 'Le nom de la recette est obligatoire');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const newRecipe: NewRecipe = {
          name: recipe.name!,
          season: recipe.season as Season,
          type: recipe.type as RecipeType,
          frequency: recipe.frequency as Frequency,
          mainIngredient: recipe.mainIngredient || '',
          ingredients: recipe.ingredients?.filter(i => i.trim()) || [],
          comment: recipe.comment || '',
          recipeLink: recipe.recipeLink || '',
          rating: recipe.rating || null,
          isFavorite: recipe.isFavorite || false,
          imagePath: recipe.imagePath || null,
        };
        const newId = await createRecipe(newRecipe);
        if (selectedBookIds.length > 0) {
          await setRecipeBooks(newId, selectedBookIds);
        }
        Alert.alert('✅ Succès', 'Recette créée !', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await updateRecipe(Number(id), {
          name: recipe.name,
          season: recipe.season as Season,
          type: recipe.type as RecipeType,
          frequency: recipe.frequency as Frequency,
          mainIngredient: recipe.mainIngredient,
          ingredients: recipe.ingredients?.filter(i => i.trim()),
          comment: recipe.comment,
          recipeLink: recipe.recipeLink,
          rating: recipe.rating,
          isFavorite: recipe.isFavorite,
          imagePath: recipe.imagePath,
        });
        await setRecipeBooks(Number(id), selectedBookIds);
        setIsEditing(false);
        Alert.alert('✅ Succès', 'Recette mise à jour !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Supprimer ?',
      `Voulez-vous vraiment supprimer "${recipe.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (recipe.imagePath) {
                await deleteImage(recipe.imagePath);
              }
              await deleteRecipe(Number(id));
              router.back();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la recette');
            }
          },
        },
      ]
    );
  };

  const handleImageAction = () => {
    Alert.alert(
      '📷 Image du plat',
      'Choisissez une option',
      [
        {
          text: '📸 Prendre une photo',
          onPress: async () => {
            try {
              const path = await takePhoto();
              if (path) {
                setRecipe({ ...recipe, imagePath: path });
              }
            } catch (error) {
              Alert.alert('Erreur', String(error));
            }
          },
        },
        {
          text: '🖼️ Galerie',
          onPress: async () => {
            try {
              const path = await pickImage();
              if (path) {
                setRecipe({ ...recipe, imagePath: path });
              }
            } catch (error) {
              Alert.alert('Erreur', String(error));
            }
          },
        },
        ...(recipe.imagePath
          ? [
              {
                text: '🗑️ Supprimer',
                style: 'destructive' as const,
                onPress: () => setRecipe({ ...recipe, imagePath: null }),
              },
            ]
          : []),
        { text: 'Annuler', style: 'cancel' as const },
      ]
    );
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...(recipe.ingredients || [])];
    newIngredients[index] = value;
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const renderSelector = <T extends string>(
    label: string,
    options: T[],
    labels: Record<T, string>,
    value: T,
    onChange: (v: T) => void,
    colorMap?: Record<T, string>
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.selectorBtn,
              value === opt && styles.selectorBtnActive,
              value === opt && colorMap && { backgroundColor: colorMap[opt] },
            ]}
            onPress={() => onChange(opt)}
            disabled={!isEditing}
          >
            <Text
              style={[
                styles.selectorBtnText,
                value === opt && styles.selectorBtnTextActive,
              ]}
            >
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Nouvelle recette' : recipe.name || 'Recette',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Image */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={isEditing
              ? handleImageAction
              : bookRecipeCloudId !== null
                ? () => router.push({ pathname: '/recette/fiche', params: { bookRecipeId: String(bookRecipeCloudId), name: recipe.name ?? '' } })
                : undefined}
            disabled={!isEditing && bookRecipeCloudId === null}
            activeOpacity={!isEditing && bookRecipeCloudId !== null ? 0.75 : 1}
          >
            {recipe.imagePath ? (
              <Image source={{ uri: recipe.imagePath }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderEmoji}>
                  {recipe.type === 'entree' ? '🥗' : recipe.type === 'dessert' ? '🍰' : '🍽️'}
                </Text>
                {isEditing && (
                  <Text style={styles.imagePlaceholderText}>Ajouter une photo</Text>
                )}
              </View>
            )}
            {isEditing && recipe.imagePath && (
              <View style={styles.imageEditBadge}>
                <Text style={styles.imageEditBadgeText}>📷</Text>
              </View>
            )}
            {!isEditing && bookRecipeCloudId !== null && (
              <View style={styles.ficheBadge}>
                <Text style={styles.ficheBadgeText}>📖 Recette détaillée</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Favori */}
          <TouchableOpacity
            style={styles.favoriteRow}
            onPress={async () => {
              const newVal = !recipe.isFavorite;
              setRecipe({ ...recipe, isFavorite: newVal });
              if (!isNew && !isEditing) {
                try { await updateRecipe(Number(id), { isFavorite: newVal }); } catch {}
              }
            }}
          >
            <Text style={styles.favoriteText}>
              {recipe.isFavorite ? '❤️ Favori' : '🤍 Ajouter aux favoris'}
            </Text>
          </TouchableOpacity>

          {/* Nom */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nom de la recette *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={recipe.name}
              onChangeText={(text) => setRecipe({ ...recipe, name: text })}
              placeholder="Ex: Gratin dauphinois"
              placeholderTextColor={Colors.textLight}
              editable={isEditing}
            />
          </View>

          {/* Saison */}
          {renderSelector(
            'Saison',
            seasons,
            SeasonLabels,
            recipe.season as Season,
            (v) => setRecipe({ ...recipe, season: v }),
            { hiver: Colors.seasonHiver, ete: Colors.seasonEte, mixte: Colors.seasonMixte }
          )}

          {/* Type */}
          {renderSelector(
            'Type de plat',
            types,
            TypeLabels,
            recipe.type as RecipeType,
            (v) => setRecipe({ ...recipe, type: v }),
            { entree: Colors.typeEntree, plat: Colors.typePlat, dessert: Colors.typeDessert }
          )}

          {/* Fréquence */}
          {renderSelector(
            'Fréquence',
            frequencies,
            FrequencyLabels,
            recipe.frequency as Frequency,
            (v) => setRecipe({ ...recipe, frequency: v }),
            { rare: Colors.freqRare, normal: Colors.freqNormal, frequent: Colors.freqFrequent }
          )}

          {/* Note */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note</Text>
            <StarRating
              rating={recipe.rating ?? null}
              size={32}
              readonly={!isEditing}
              onRate={(r) => setRecipe({ ...recipe, rating: r })}
            />
          </View>

          {/* Ingrédient principal */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Ingrédient principal</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={recipe.mainIngredient}
              onChangeText={(text) => setRecipe({ ...recipe, mainIngredient: text })}
              placeholder="Ex: Pommes de terre"
              placeholderTextColor={Colors.textLight}
              editable={isEditing}
            />
          </View>

          {/* Autres ingrédients */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Autres ingrédients</Text>
            {recipe.ingredients?.map((ing, idx) => (
              <TextInput
                key={idx}
                style={[styles.input, styles.inputSmall, !isEditing && styles.inputDisabled]}
                value={ing}
                onChangeText={(text) => updateIngredient(idx, text)}
                placeholder={`Ingrédient ${idx + 2}`}
                placeholderTextColor={Colors.textLight}
                editable={isEditing}
              />
            ))}
          </View>

          {/* Lien recette */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Lien vers la recette</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={recipe.recipeLink}
                onChangeText={(text) => setRecipe({ ...recipe, recipeLink: text })}
                placeholder="https://..."
                placeholderTextColor={Colors.textLight}
                keyboardType="url"
                autoCapitalize="none"
              />
            ) : recipe.recipeLink ? (
              <TouchableOpacity onPress={() => Linking.openURL(recipe.recipeLink!)}>
                <Text style={styles.link} numberOfLines={1}>{recipe.recipeLink}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.input, styles.inputDisabled]}>—</Text>
            )}
          </View>

          {/* Commentaire */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Commentaire</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, !isEditing && styles.inputDisabled]}
              value={recipe.comment}
              onChangeText={(text) => setRecipe({ ...recipe, comment: text })}
              placeholder="Notes personnelles..."
              placeholderTextColor={Colors.textLight}
              editable={isEditing}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Livres */}
          {books.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Livres de recettes</Text>
              <View style={styles.selectorRow}>
                {books.map(book => {
                  const selected = selectedBookIds.includes(book.id);
                  return (
                    <TouchableOpacity
                      key={book.id}
                      style={[
                        styles.selectorBtn,
                        selected && styles.selectorBtnActive,
                        selected && { backgroundColor: book.color + '33', borderColor: book.color },
                      ]}
                      onPress={() => {
                        if (!isEditing) return;
                        setSelectedBookIds(
                          selected
                            ? selectedBookIds.filter(id => id !== book.id)
                            : [...selectedBookIds, book.id]
                        );
                      }}
                      disabled={!isEditing}
                    >
                      <Text style={[styles.selectorBtnText, selected && styles.selectorBtnTextActive]}>
                        {book.icon} {book.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stats (lecture seule) */}
          {!isNew && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{recipe.timesUsed || 0}</Text>
                <Text style={styles.statLabel}>Utilisations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {recipe.lastSelected
                    ? new Date(recipe.lastSelected).toLocaleDateString('fr-FR')
                    : '-'}
                </Text>
                <Text style={styles.statLabel}>Dernière fois</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.btnPrimaryText}>
                    {isSaving ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
                  </Text>
                </TouchableOpacity>
                {!isNew && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={() => {
                      loadRecipe();
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.btnSecondaryText}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.btnPrimaryText}>✏️ Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={handleDelete}
                >
                  <Text style={styles.btnDangerText}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
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
  imageContainer: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderEmoji: {
    fontSize: 64,
  },
  imagePlaceholderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  imageEditBadgeText: {
    fontSize: 20,
  },
  ficheBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BorderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  ficheBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  favoriteText: {
    fontSize: 18,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputSmall: {
    marginBottom: Spacing.xs,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: Colors.backgroundAlt,
    color: Colors.textSecondary,
  },
  link: {
    color: Colors.primary,
    fontSize: 16,
    textDecorationLine: 'underline',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  selectorBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorBtnActive: {
    borderColor: Colors.primaryDark,
  },
  selectorBtnText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectorBtnTextActive: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: Spacing.sm,
  },
  btn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primaryDark,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    color: Colors.text,
    fontSize: 16,
  },
  btnDanger: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  btnDangerText: {
    color: Colors.error,
    fontSize: 16,
  },
});
