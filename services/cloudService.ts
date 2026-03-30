import { supabaseGet } from '@/config/supabase';
import { CloudBook, CloudBookRecipe } from '@/types/recipe';
import {
  getBookByCloudId,
  createBook,
  deleteBook,
  getRecipesByBook,
  createRecipe,
  getDb,
} from '@/services/database';

export async function fetchCloudCatalog(): Promise<CloudBook[]> {
  return supabaseGet<CloudBook>('books', 'order=name.asc');
}

export async function fetchCloudBookRecipes(bookId: string): Promise<CloudBookRecipe[]> {
  return supabaseGet<CloudBookRecipe>('book_recipes', `book_id=eq.${bookId}`);
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

    // Créer l'assignation
    await db.runAsync(
      'INSERT OR IGNORE INTO recipe_book_assignments (recipe_id, book_id) VALUES (?, ?)',
      [recipeId, bookId]
    );
  }

  return created;
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
