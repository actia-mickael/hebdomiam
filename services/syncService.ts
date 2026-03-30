import { supabase, checkOnline } from '@/config/supabase';
import {
  getAllRecipes,
  createRecipe,
  updateRecipe,
  setRecipeCloudId,
  getUnsyncedRecipes,
  clearDirtyFlag,
  upsertRecipeFromCloud,
} from '@/services/database';

// ── Upload local → cloud ──────────────────────────────────────────────────

/**
 * Uploade toutes les recettes locales vers la famille cloud.
 * Appelé quand l'admin crée ou rejoint une famille.
 */
export async function uploadLocalRecipes(
  familyId: string,
  userId: string
): Promise<void> {
  const recipes = await getAllRecipes();
  for (const recipe of recipes) {
    // Vérifier si déjà uploadée (cloud_id présent)
    if ((recipe as any).cloudId) continue;

    const { data, error } = await supabase
      .from('family_recipes')
      .insert({
        family_id: familyId,
        local_id: recipe.id,
        name: recipe.name,
        season: recipe.season,
        type: recipe.type,
        frequency: recipe.frequency,
        main_ingredient: recipe.mainIngredient,
        ingredients: JSON.stringify(recipe.ingredients),
        comment: recipe.comment,
        recipe_link: recipe.recipeLink,
        times_used: recipe.timesUsed,
        last_selected: recipe.lastSelected,
        rating: recipe.rating,
        is_favorite: recipe.isFavorite,
        created_by: userId,
      })
      .select('id')
      .single();

    if (!error && data) {
      await setRecipeCloudId(recipe.id, data.id);
    }
  }
}

// ── Pull cloud → local ────────────────────────────────────────────────────

/**
 * Synchronise les recettes famille depuis le cloud vers le cache local.
 * Appelé au démarrage de l'app si l'utilisateur est dans une famille.
 */
export async function syncDown(familyId: string): Promise<void> {
  const online = await checkOnline();
  if (!online) return;

  const { data: cloudRecipes, error } = await supabase
    .from('family_recipes')
    .select('*')
    .eq('family_id', familyId);

  if (error || !cloudRecipes) return;

  for (const cr of cloudRecipes) {
    let ingredients: string[] = [];
    try { ingredients = JSON.parse(cr.ingredients ?? '[]'); } catch { }

    await upsertRecipeFromCloud({
      cloudId: cr.id,
      name: cr.name,
      season: cr.season,
      type: cr.type,
      frequency: cr.frequency,
      mainIngredient: cr.main_ingredient ?? '',
      ingredients,
      comment: cr.comment ?? '',
      recipeLink: cr.recipe_link ?? '',
      timesUsed: cr.times_used ?? 0,
      lastSelected: cr.last_selected ?? null,
      rating: cr.rating ?? null,
      isFavorite: cr.is_favorite ?? false,
    });
  }
}

// ── Push dirty → cloud (admin offline) ───────────────────────────────────

/**
 * Pousse les modifications locales de l'admin vers le cloud.
 * Appelé quand l'app revient en ligne.
 * Les changements admin sont prioritaires (écrasent le cloud).
 */
export async function syncDirty(familyId: string, userId: string): Promise<void> {
  const online = await checkOnline();
  if (!online) return;

  const dirtyRecipes = await getUnsyncedRecipes();

  for (const recipe of dirtyRecipes) {
    const payload = {
      name: recipe.name,
      season: recipe.season,
      type: recipe.type,
      frequency: recipe.frequency,
      main_ingredient: recipe.mainIngredient,
      ingredients: JSON.stringify(recipe.ingredients),
      comment: recipe.comment,
      recipe_link: recipe.recipeLink,
      times_used: recipe.timesUsed,
      last_selected: recipe.lastSelected,
      rating: recipe.rating,
      is_favorite: recipe.isFavorite,
      updated_at: new Date().toISOString(),
    };

    if ((recipe as any).cloudId) {
      // Mettre à jour (admin prioritaire — pas de check updated_at)
      await supabase
        .from('family_recipes')
        .update(payload)
        .eq('id', (recipe as any).cloudId);
    } else {
      // Nouvelle recette créée offline → insérer dans le cloud
      const { data, error } = await supabase
        .from('family_recipes')
        .insert({ ...payload, family_id: familyId, local_id: recipe.id, created_by: userId })
        .select('id')
        .single();

      if (!error && data) {
        await setRecipeCloudId(recipe.id, data.id);
      }
    }

    await clearDirtyFlag(recipe.id);
  }
}

// ── Sync sélections famille ───────────────────────────────────────────────

export async function syncSelectionsDown(familyId: string): Promise<void> {
  const online = await checkOnline();
  if (!online) return;

  // On tire les sélections des 30 derniers jours
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split('T')[0];

  const { data: selections, error } = await supabase
    .from('family_selections')
    .select('*, family_recipes(name, season, type, frequency, main_ingredient, ingredients, comment, recipe_link)')
    .eq('family_id', familyId)
    .gte('selected_at', sinceStr);

  if (error || !selections) return;
  // Les sélections sont disponibles via getAllRecipes() + getHistoryByWeek()
  // On stocke juste l'info dans selection_history local si pas déjà présente
  // (implémentation simplifiée : le pull recipes suffit pour l'affichage)
}

export async function pushSelection(
  familyId: string,
  recipeCloudId: string,
  selectedAt: string,
  userId: string
): Promise<void> {
  await supabase.from('family_selections').insert({
    family_id: familyId,
    recipe_id: recipeCloudId,
    selected_at: selectedAt,
    selected_by: userId,
  });
}
