import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Recipe, SeasonLabels, TypeLabels } from '@/types/recipe';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import StarRating from './StarRating';

interface RecipeCardProps {
  recipe: Recipe;
  index?: number;
  onPress: () => void;
  compact?: boolean;
}

const seasonAccent: Record<string, string> = {
  hiver: Colors.seasonHiver,
  ete: Colors.seasonEte,
  mixte: Colors.seasonMixte,
};

const typePlaceholderBg: Record<string, string> = {
  entree: Colors.typeBgEntree,
  plat: Colors.typeBgPlat,
  dessert: Colors.typeBgDessert,
};

const typeEmoji: Record<string, string> = {
  entree: '🥗',
  plat: '🍽️',
  dessert: '🍰',
};

export default function RecipeCard({ recipe, index, onPress, compact = false }: RecipeCardProps) {
  const hasImage = recipe.imagePath && recipe.imagePath.length > 0;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.compactAccent, { backgroundColor: seasonAccent[recipe.season] }]} />
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{recipe.name}</Text>
          <View style={[styles.compactBadge, { backgroundColor: typePlaceholderBg[recipe.type] }]}>
            <Text style={styles.compactBadgeText}>{TypeLabels[recipe.type]}</Text>
          </View>
        </View>
        {recipe.isFavorite && <Text style={styles.compactFav}>❤️</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Barre d'accent saison */}
      <View style={[styles.accentBar, { backgroundColor: seasonAccent[recipe.season] }]} />

      {/* Zone image */}
      <View style={[styles.imageContainer, { backgroundColor: typePlaceholderBg[recipe.type] }]}>
        {hasImage ? (
          <Image source={{ uri: recipe.imagePath! }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderEmoji}>{typeEmoji[recipe.type]}</Text>
        )}
        {recipe.isFavorite && (
          <View style={styles.favoriteBadge}>
            <Text style={styles.favoriteText}>❤️</Text>
          </View>
        )}
        {typeof index === 'number' && (
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>#{index + 1}</Text>
          </View>
        )}
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{recipe.name}</Text>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: typePlaceholderBg[recipe.type] }]}>
            <Text style={styles.badgeText}>{TypeLabels[recipe.type]}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: seasonAccent[recipe.season] + '40' }]}>
            <Text style={styles.badgeText}>{SeasonLabels[recipe.season]}</Text>
          </View>
        </View>

        {recipe.mainIngredient ? (
          <Text style={styles.ingredient} numberOfLines={1}>🥄 {recipe.mainIngredient}</Text>
        ) : null}

        <View style={styles.footer}>
          {recipe.rating ? (
            <StarRating rating={recipe.rating} size={13} readonly />
          ) : (
            <View />
          )}
          <Text style={styles.usageText}>{recipe.timesUsed}× utilisée</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  imageContainer: {
    width: 96,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderEmoji: {
    fontSize: 38,
  },
  favoriteBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: BorderRadius.full,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteText: {
    fontSize: 12,
  },
  indexBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  indexText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  ingredient: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  // Compact
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.small,
  },
  compactAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  compactBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  compactBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  compactFav: {
    marginRight: Spacing.sm,
    fontSize: 14,
  },
});
