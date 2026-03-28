// Types pour l'application de recettes

export type Season = 'hiver' | 'ete' | 'mixte';
export type RecipeType = 'entree' | 'plat' | 'dessert';
export type Frequency = 'rare' | 'normal' | 'frequent';

export interface Recipe {
  id: number;
  name: string;
  season: Season;
  type: RecipeType;
  frequency: Frequency;
  mainIngredient: string;
  ingredients: string[];  // Array de 9 ingrédients supplémentaires
  comment: string;
  recipeLink: string;
  
  // Statistiques
  timesUsed: number;
  lastSelected: string | null;  // Date ISO
  rating: number | null;        // 1-5
  isFavorite: boolean;
  
  // Image
  imagePath: string | null;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
}

export interface SelectionHistory {
  id: number;
  recipeId: number;
  selectedAt: string;  // Date ISO
}

// Type pour la création (sans id ni dates auto)
export type NewRecipe = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed' | 'lastSelected'>;

// Type pour la mise à jour
export type UpdateRecipe = Partial<Omit<Recipe, 'id' | 'createdAt'>>;

// Filtres pour la génération
export interface GeneratorFilters {
  season: Season | 'all';
  type: RecipeType | 'all';
  count: number;  // 1-5
}

// Stats agrégées
export interface RecipeStats {
  totalRecipes: number;
  totalSelections: number;
  bySeason: Record<Season, number>;
  byType: Record<RecipeType, number>;
  topUsed: Recipe[];
  recentlyUsed: Recipe[];
  neverUsed: Recipe[];
  favorites: Recipe[];
  averageRating: number;
  selectionsByMonth: { month: string; count: number }[];
}

// Labels français
export const SeasonLabels: Record<Season, string> = {
  hiver: '❄️ Hiver',
  ete: '☀️ Été',
  mixte: '🍂 Mixte',
};

export const TypeLabels: Record<RecipeType, string> = {
  entree: '🥗 Entrée',
  plat: '🍽️ Plat',
  dessert: '🍰 Dessert',
};

export const FrequencyLabels: Record<Frequency, string> = {
  rare: '🔸 Rare',
  normal: '🔹 Normal',
  frequent: '🔷 Fréquent',
};

export interface WeekHistory {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  recipes: Recipe[];
}
