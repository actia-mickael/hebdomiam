import { supabase } from '@/config/supabase';
import { CloudBook, CloudBookRecipe, RecipeDetail } from '@/types/recipe';
import {
  getBookByCloudId,
  createBook,
  deleteBook,
  getRecipesByBook,
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
  const { data, error } = await supabase.from('book_recipes').select('*').eq('book_id', bookId);
  if (error) throw error;
  return data ?? [];
}

/**
 * Télécharge un livre cloud : importe ses recettes localement et crée les assignations.
 * Retourne le nombre de nouvelles recettes créées.
 */
export async function downloadBook(cloudBook: CloudBook): Promise<number> {
  const db = getDb();
  const cloudRecipes = await fetchCloudBookRecipes(cloudBook.id);

  // Créer l'entrée du livre local
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

    // Vérifier si la recette existe déjà par nom
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM recipes WHERE name = ?',
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

    // Stocker l'ID Supabase de la book_recipe pour accéder à la fiche détaillée
    await db.runAsync(
      'UPDATE recipes SET book_recipe_cloud_id = ? WHERE id = ?',
      [cr.id, recipeId]
    );

    // Créer l'assignation
    await db.runAsync(
      'INSERT OR IGNORE INTO recipe_book_assignments (recipe_id, book_id) VALUES (?, ?)',
      [recipeId, bookId]
    );
  }

  return created;
}

/**
 * Répare book_recipe_cloud_id pour les recettes téléchargées avant l'ajout de cette feature.
 * S'exécute en arrière-plan au démarrage.
 */
export async function repairBookRecipeCloudIds(): Promise<void> {
  const db = getDb();

  // Recettes sans cloud_id mais liées à un livre cloud
  const rows = await db.getAllAsync<{ id: number; name: string; book_cloud_id: string }>(
    `SELECT r.id, r.name, rb.cloud_id as book_cloud_id
     FROM recipes r
     JOIN recipe_book_assignments rba ON rba.recipe_id = r.id
     JOIN recipe_books rb ON rb.id = rba.book_id
     WHERE r.book_recipe_cloud_id IS NULL AND rb.cloud_id IS NOT NULL`
  );

  if (rows.length === 0) return;

  // Récupérer tous les book_recipes concernés en un seul appel
  const bookCloudIds = [...new Set(rows.map(r => r.book_cloud_id))];
  const names = rows.map(r => r.name);

  const { data: cloudRows } = await supabase
    .from('book_recipes')
    .select('id, name, book_id')
    .in('book_id', bookCloudIds)
    .in('name', names);

  if (!cloudRows?.length) return;

  const cloudMap = new Map(cloudRows.map(cr => [`${cr.book_id}||${cr.name}`, cr.id] as [string, number]));

  for (const row of rows) {
    const cloudId = cloudMap.get(`${row.book_cloud_id}||${row.name}`);
    if (cloudId) {
      await db.runAsync(
        'UPDATE recipes SET book_recipe_cloud_id = ? WHERE id = ?',
        [cloudId, row.id]
      );
    }
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
