import { supabase } from '@/config/supabase';
import { CloudBook, CloudBookRecipe, RecipeDetail } from '@/types/recipe';
import {
  getBookByCloudId,
  createBook,
  deleteBook,
  createRecipe,
  getDb,
  getCachedRecipeDetail,
  setCachedRecipeDetail,
} from '@/services/database';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export async function fetchCloudCatalog(): Promise<CloudBook[]> {
  const { data, error } = await supabase.from('books').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchCloudBookRecipes(bookId: string): Promise<CloudBookRecipe[]> {
  const { data, error } = await supabase
    .from('book_recipe')
    .select('recipes(*)')
    .eq('book_id', bookId);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.recipes as CloudBookRecipe);
}

/**
 * Télécharge un livre cloud : importe ses recettes localement et crée les assignations.
 * Retourne le nombre de nouvelles recettes créées.
 */
export async function downloadBook(cloudBook: CloudBook): Promise<number> {
  const db = getDb();
  const cloudRecipes = await fetchCloudBookRecipes(cloudBook.id);
  const bookId = await createBook({
    cloudId: cloudBook.id,
    name: cloudBook.name,
    description: cloudBook.description,
    icon: cloudBook.icon,
    color: cloudBook.color,
    source: 'cloud',
    cloudVersion: cloudBook.version,
    isModified: false,
    downloadedAt: new Date().toISOString(),
  });

  let created = 0;

  for (const cr of cloudRecipes) {
    let recipeId: number;

    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM recipes WHERE lower(replace(replace(name, 'œ', 'oe'), 'æ', 'ae')) = lower(replace(replace(?, 'œ', 'oe'), 'æ', 'ae'))",
      [cr.name]
    );

    if (existing) {
      recipeId = existing.id;
    } else {
      let ingredients: string[] = [];
      try {
        ingredients = JSON.parse(cr.ingredients);
      } catch {
        ingredients = cr.ingredients ? [cr.ingredients] : [];
      }

      recipeId = await createRecipe({
        name: cr.name,
        season: cr.season,
        type: cr.type,
        frequency: cr.frequency,
        mainIngredient: cr.main_ingredient ?? '',
        ingredients,
        comment: cr.comment ?? '',
        recipeLink: cr.recipe_link ?? '',
        rating: null,
        isFavorite: false,
        imagePath: null,
      });
      created++;
    }

    // cr.id est maintenant l'ID unique de la table recipes (plus de doublons)
    await db.runAsync(
      'UPDATE recipes SET book_recipe_cloud_id = ? WHERE id = ?',
      [cr.id, recipeId]
    );

    await db.runAsync(
      'INSERT OR IGNORE INTO recipe_book_assignments (recipe_id, book_id) VALUES (?, ?)',
      [recipeId, bookId]
    );
  }

  return created;
}

/**
 * Synchronise les assignations book_recipe vers Supabase depuis le SQLite local.
 * Répare aussi les book_recipe_cloud_id locaux en cas de désalignement.
 * S'exécute en arrière-plan au démarrage.
 */
export async function syncBookRecipeAssignments(): Promise<void> {
  const db = getDb();

  const rows = await db.getAllAsync<{
    recipe_name: string;
    book_cloud_id: string;
    current_cloud_id: number | null;
  }>(
    `SELECT r.name as recipe_name, rb.cloud_id as book_cloud_id, r.book_recipe_cloud_id as current_cloud_id
     FROM recipes r
     JOIN recipe_book_assignments rba ON rba.recipe_id = r.id
     JOIN recipe_books rb ON rb.id = rba.book_id
     WHERE rb.cloud_id IS NOT NULL`
  );

  if (rows.length === 0) return;

  // La table recipes est maintenant unique par nom — récupérer les IDs en une seule requête
  const names = [...new Set(rows.map(r => r.recipe_name))];
  const { data: cloudRecipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('name', names);

  if (!cloudRecipes?.length) return;

  const nameToId = new Map(cloudRecipes.map(r => [r.name, r.id] as [string, number]));

  // Corriger les book_recipe_cloud_id locaux si désalignés (recettes avec livre)
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.recipe_name)) continue;
    seen.add(row.recipe_name);
    const cloudId = nameToId.get(row.recipe_name);
    if (cloudId && cloudId !== row.current_cloud_id) {
      await db.runAsync(
        'UPDATE recipes SET book_recipe_cloud_id = ? WHERE name = ?',
        [cloudId, row.recipe_name]
      );
    }
  }

  // Aussi corriger les recettes locales sans book_recipe_cloud_id
  const unlinked = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM recipes WHERE book_recipe_cloud_id IS NULL`
  );
  if (unlinked.length > 0) {
    const unlinkedNames = unlinked.map(r => r.name);
    const { data: cloudUnlinked } = await supabase
      .from('recipes')
      .select('id, name')
      .in('name', unlinkedNames);
    if (cloudUnlinked?.length) {
      const cloudNameMap = new Map(cloudUnlinked.map(r => [r.name.toLowerCase(), r.id] as [string, number]));
      for (const r of unlinked) {
        const cloudId = cloudNameMap.get(r.name.toLowerCase());
        if (cloudId) {
          await db.runAsync(
            'UPDATE recipes SET book_recipe_cloud_id = ? WHERE id = ?',
            [cloudId, r.id]
          );
        }
      }
    }
  }

  // Peupler/synchroniser la table book_recipe dans Supabase
  const assignments = rows
    .map(row => {
      const recipeId = nameToId.get(row.recipe_name);
      if (!recipeId) return null;
      return { book_id: row.book_cloud_id, recipe_id: recipeId };
    })
    .filter(Boolean) as { book_id: string; recipe_id: number }[];

  if (assignments.length > 0) {
    await supabase
      .from('book_recipe')
      .upsert(assignments, { onConflict: 'book_id,recipe_id', ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) console.warn('[syncBookRecipeAssignments] upsert error:', error.message);
      });
  }
}

// ── Fiche détaillée ───────────────────────────────────────────────────────

export async function fetchRecipeDetail(bookRecipeId: number): Promise<RecipeDetail | null> {
  const { data, error } = await supabase
    .from('recipe_details')
    .select('*')
    .eq('book_recipe_id', bookRecipeId)
    .single();
  if (error || !data) return null;
  return data as RecipeDetail;
}

export async function getRecipeDetailWithCache(bookRecipeId: number): Promise<RecipeDetail | null> {
  const cached = await getCachedRecipeDetail(bookRecipeId);
  if (cached) {
    const ageMs = Date.now() - new Date(cached.cached_at).getTime();
    if (ageMs < CACHE_TTL_MS) {
      return JSON.parse(cached.data) as RecipeDetail;
    }
  }
  const detail = await fetchRecipeDetail(bookRecipeId);
  if (detail) await setCachedRecipeDetail(bookRecipeId, detail);
  return detail;
}

/**
 * Supprime la copie locale d'un livre cloud (les recettes restent dans la bibliothèque).
 */
export async function deleteLocalBook(cloudId: string): Promise<void> {
  const book = await getBookByCloudId(cloudId);
  if (book) {
    await deleteBook(book.id);
  }
}

/**
 * Exporte un livre local en JSON prêt à partager.
 */
export { exportBookToJson } from '@/services/database';
