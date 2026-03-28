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

const seasonColors: Record<string, string> = {
  hiver: Colors.seasonHiver,
  ete: Colors.seasonEte,
  mixte: Colors.seasonMixte,
};

const typeColors: Record<string, string> = {
  entree: Colors.typeEntree,
  plat: Colors.typePlat,
  dessert: Colors.typeDessert,
};

export default function RecipeCard({ recipe, index, onPress, compact = false }: RecipeCardProps) {
  const hasImage = recipe.imagePath && recipe.imagePath.length > 0;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress}>
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>
            {recipe.name}
          </Text>
          <View style={styles.compactBadges}>
            <View style={[styles.badgeMini, { backgroundColor: seasonColors[recipe.season] }]}>
              <Text style={styles.badgeMiniText}>{recipe.season.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.badgeMini, { backgroundColor: typeColors[recipe.type] }]}>
              <Text style={styles.badgeMiniText}>{recipe.type.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>
        {recipe.isFavorite && <Text style={styles.favoriteIcon}>❤️</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image ou placeholder */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image source={{ uri: recipe.imagePath! }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>
              {recipe.type === 'entree' ? '🥗' : recipe.type === 'plat' ? '🍽️' : '🍰'}
            </Text>
          </View>
        )}
        {recipe.isFavorite && (
          <View style={styles.favoriteBadge}>
            <Text>❤️</Text>
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
        <Text style={styles.name} numberOfLines={2}>
          {recipe.name}
        </Text>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: seasonColors[recipe.season] }]}>
            <Text style={styles.badgeText}>{SeasonLabels[recipe.season]}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: typeColors[recipe.type] }]}>
            <Text style={styles.badgeText}>{TypeLabels[recipe.type]}</Text>
          </View>
        </View>

        {recipe.mainIngredient && (
          <Text style={styles.ingredient} numberOfLines={1}>
            🥄 {recipe.mainIngredient}
          </Text>
        )}

        <View style={styles.footer}>
          {recipe.rating && (
            <StarRating rating={recipe.rating} size={14} readonly />
          )}
          <Text style={styles.usageText}>
            📊 {recipe.timesUsed}x
          </Text>
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
  imageContainer: {
    width: 100,
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 36,
  },
  favoriteBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.full,
    padding: 4,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
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
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  compactBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badgeMini: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMiniText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text,
  },
  favoriteIcon: {
    marginLeft: Spacing.sm,
  },
});
