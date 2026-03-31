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

// ── Compte utilisateur & famille ───────────────────────────────────────────

export type UserRole = 'solo' | 'admin' | 'member';

export interface UserProfile {
  id: string;
  displayName: string;
  familyId: string | null;
  role: UserRole;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

// ── Livres de recettes ──────────────────────────────────────────────────────

/** Livre stocké localement (copie d'un livre cloud ou créé par l'utilisateur) */
export interface RecipeBook {
  id: number;
  cloudId: string | null;       // ID du livre source sur Supabase (null si local pur)
  name: string;
  description: string;
  icon: string;
  color: string;
  source: 'local' | 'cloud';   // Origine du livre
  cloudVersion: number | null;  // Version au moment du téléchargement
  isModified: boolean;          // Vrai si l'utilisateur a modifié la copie
  isActive: boolean;            // Si coché : utilisé pour la génération et la recherche
  downloadedAt: string | null;  // Date de téléchargement ISO
  createdAt: string;
  updatedAt: string;
}

/** Livre disponible sur Supabase (catalogue cloud) */
export interface CloudBook {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: number;
  author: string;
  recipe_count: number;
  created_at: string;
}

/** Recette telle que stockée dans Supabase (book_recipes) */
export interface CloudBookRecipe {
  id: number;
  book_id: string;
  name: string;
  season: Season;
  type: RecipeType;
  frequency: Frequency;
  main_ingredient: string;
  ingredients: string;   // JSON string
  comment: string;
  recipe_link: string;
  has_detail: boolean;
}

// ── Fiche détaillée recette (cloud) ────────────────────────────────────────

export interface RecipeDetailIngredient {
  qty: string;
  unit: string;
  label: string;
  group?: string;
}

export interface RecipeDetailStep {
  order: number;
  title?: string;
  text: string;
}

export interface RecipeDetail {
  id: string;
  book_recipe_id: number;
  prep_time: number | null;
  cook_time: number | null;
  rest_time: number | null;
  servings: number | null;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  ingredients: RecipeDetailIngredient[];
  steps: RecipeDetailStep[];
  photos: string[];
  tips: string | null;
  source_url: string | null;
  nutrition: {
    calories?: number;
    proteines?: number;
    glucides?: number;
    lipides?: number;
  } | null;
  updated_at: string;
}
