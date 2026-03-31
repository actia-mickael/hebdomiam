import * as SQLite from 'expo-sqlite';
import { Recipe, NewRecipe, UpdateRecipe, SelectionHistory, RecipeStats, Season, RecipeType, WeekHistory, RecipeBook, RecipeDetail } from '@/types/recipe';

export type { WeekHistory };

const DB_NAME = 'recettes.db';

let db: SQLite.SQLiteDatabase | null = null;

// Initialisation de la base de données
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      season TEXT CHECK(season IN ('hiver', 'ete', 'mixte')) NOT NULL,
      type TEXT CHECK(type IN ('entree', 'plat', 'dessert')) NOT NULL,
      frequency TEXT CHECK(frequency IN ('rare', 'normal', 'frequent')) DEFAULT 'normal',
      main_ingredient TEXT,
      ingredients TEXT,
      comment TEXT,
      recipe_link TEXT,
      times_used INTEGER DEFAULT 0,
      last_selected TEXT,
      rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
      is_favorite INTEGER DEFAULT 0,
      image_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS selection_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
      selected_at TEXT DEFAULT (date('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_recipes_season ON recipes(season);
    CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(type);
    CREATE INDEX IF NOT EXISTS idx_recipes_last_selected ON recipes(last_selected);
    CREATE INDEX IF NOT EXISTS idx_history_recipe ON selection_history(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_history_date ON selection_history(selected_at);

    CREATE TABLE IF NOT EXISTS recipe_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cloud_id TEXT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '📖',
      color TEXT DEFAULT '#6B8E6B',
      source TEXT DEFAULT 'local',
      cloud_version INTEGER,
      is_modified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      downloaded_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_book_assignments (
      recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES recipe_books(id) ON DELETE CASCADE,
      PRIMARY KEY (recipe_id, book_id)
    );

    CREATE INDEX IF NOT EXISTS idx_book_assign_recipe ON recipe_book_assignments(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_book_assign_book ON recipe_book_assignments(book_id);

    CREATE TABLE IF NOT EXISTS recipe_detail_cache (
      book_recipe_id INTEGER PRIMARY KEY,
      data           TEXT NOT NULL,
      cached_at      TEXT NOT NULL
    );
  `);

  // Migrations colonnes (safe sur installations existantes)
  const migrations = [
    'ALTER TABLE recipe_books ADD COLUMN is_active INTEGER DEFAULT 1',
    'ALTER TABLE recipes ADD COLUMN cloud_id TEXT',
    'ALTER TABLE recipes ADD COLUMN is_dirty INTEGER DEFAULT 0',
    'ALTER TABLE recipes ADD COLUMN book_recipe_cloud_id INTEGER',
  ];
  for (const sql of migrations) {
    try { await db.execAsync(sql); } catch { /* colonne déjà présente */ }
  }
}

// Obtenir l'instance de la DB
export function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// ============ CRUD Recettes ============

export async function getAllRecipes(): Promise<Recipe[]> {
  const rows = await getDb().getAllAsync<any>('SELECT * FROM recipes ORDER BY name');
  return rows.map(mapRowToRecipe);
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const row = await getDb().getFirstAsync<any>('SELECT * FROM recipes WHERE id = ?', [id]);
  return row ? mapRowToRecipe(row) : null;
}

export async function createRecipe(recipe: NewRecipe): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO recipes (name, season, type, frequency, main_ingredient, ingredients, comment, recipe_link, rating, is_favorite, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.name,
      recipe.season,
      recipe.type,
      recipe.frequency,
      recipe.mainIngredient,
      JSON.stringify(recipe.ingredients),
      recipe.comment,
      recipe.recipeLink,
      recipe.rating,
      recipe.isFavorite ? 1 : 0,
      recipe.imagePath,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateRecipe(id: number, updates: UpdateRecipe): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.season !== undefined) { fields.push('season = ?'); values.push(updates.season); }
  if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
  if (updates.frequency !== undefined) { fields.push('frequency = ?'); values.push(updates.frequency); }
  if (updates.mainIngredient !== undefined) { fields.push('main_ingredient = ?'); values.push(updates.mainIngredient); }
  if (updates.ingredients !== undefined) { fields.push('ingredients = ?'); values.push(JSON.stringify(updates.ingredients)); }
  if (updates.comment !== undefined) { fields.push('comment = ?'); values.push(updates.comment); }
  if (updates.recipeLink !== undefined) { fields.push('recipe_link = ?'); values.push(updates.recipeLink); }
  if (updates.timesUsed !== undefined) { fields.push('times_used = ?'); values.push(updates.timesUsed); }
  if (updates.lastSelected !== undefined) { fields.push('last_selected = ?'); values.push(updates.lastSelected); }
  if (updates.rating !== undefined) { fields.push('rating = ?'); values.push(updates.rating); }
  if (updates.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0); }
  if (updates.imagePath !== undefined) { fields.push('image_path = ?'); values.push(updates.imagePath); }
  
  fields.push("updated_at = datetime('now')");
  values.push(id);
  
  await getDb().runAsync(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteRecipe(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}

export async function removeRecipeFromCurrentWeek(recipeId: number): Promise<void> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split('T')[0];

  await getDb().runAsync(
    'DELETE FROM selection_history WHERE recipe_id = ? AND selected_at >= ?',
    [recipeId, mondayStr]
  );
}

export async function removeAllHistoryForRecipe(recipeId: number): Promise<void> {
  await getDb().runAsync(
    'DELETE FROM selection_history WHERE recipe_id = ?',
    [recipeId]
  );
}

export async function getUsedImagePaths(): Promise<string[]> {
  const rows = await getDb().getAllAsync<{ image_path: string }>(
    'SELECT image_path FROM recipes WHERE image_path IS NOT NULL'
  );
  return rows.map(r => r.image_path);
}

// ============ Génération aléatoire ============

export async function getRandomRecipes(
  count: number,
  seasons: Season[],
  types: RecipeType[],
  ingredient: string = ''
): Promise<Recipe[]> {
  const hasIngredientFilter = ingredient.trim().length > 0;

  // Vérifier si des livres actifs existent
  const activeCount = await getDb().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM recipe_books WHERE is_active = 1'
  );
  const hasActiveBooks = (activeCount?.count ?? 0) > 0;

  let query = `SELECT * FROM recipes WHERE 1=1`;
  const params: any[] = [];

  // Exclusion 2 semaines désactivée quand un filtre ingrédient est actif
  // (l'utilisateur veut voir TOUTES les recettes avec cet ingrédient)
  if (!hasIngredientFilter) {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const excludeDate = twoWeeksAgo.toISOString().split('T')[0];
    query += ` AND (last_selected IS NULL OR last_selected < ?)`;
    params.push(excludeDate);
  }

  // Filtrer par livres actifs si applicable
  if (hasActiveBooks) {
    query += `
      AND (
        NOT EXISTS (SELECT 1 FROM recipe_book_assignments a WHERE a.recipe_id = recipes.id)
        OR EXISTS (
          SELECT 1 FROM recipe_book_assignments a
          JOIN recipe_books b ON b.id = a.book_id
          WHERE a.recipe_id = recipes.id AND b.is_active = 1
        )
      )
    `;
  }

  if (seasons.length > 0) {
    const placeholders = seasons.map(() => '?').join(', ');
    query += ` AND (season IN (${placeholders}) OR season = 'mixte')`;
    params.push(...seasons);
  }

  if (types.length > 0) {
    const placeholders = types.map(() => '?').join(', ');
    query += ` AND type IN (${placeholders})`;
    params.push(...types);
  }

  if (hasIngredientFilter) {
    // Recherche dans main_ingredient ET dans chaque ingrédient du tableau JSON
    // LOWER() + LIKE pour insensibilité à la casse (ASCII)
    // On cherche aussi le nom de la recette pour couvrir les cas évidents
    const term = ingredient.trim().toLowerCase();
    const like = `%${term}%`;
    query += `
      AND (
        LOWER(main_ingredient) LIKE ?
        OR LOWER(ingredients) LIKE ?
        OR LOWER(name) LIKE ?
      )
    `;
    params.push(like, like, like);
  }

  query += `
    ORDER BY
      CASE frequency
        WHEN 'frequent' THEN RANDOM() * 3
        WHEN 'normal' THEN RANDOM() * 2
        WHEN 'rare' THEN RANDOM()
      END DESC
    LIMIT ?
  `;
  // Avec filtre ingrédient : afficher jusqu'à 30 résultats pour voir toutes les options
  params.push(hasIngredientFilter ? 30 : count);

  const rows = await getDb().getAllAsync<any>(query, params);
  return rows.map(mapRowToRecipe);
}

// Marquer des recettes comme sélectionnées
export async function markRecipesSelected(recipeIds: number[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();
  
  for (const id of recipeIds) {
    // Mise à jour recette
    await db.runAsync(
      `UPDATE recipes SET times_used = times_used + 1, last_selected = ?, updated_at = datetime('now') WHERE id = ?`,
      [today, id]
    );
    // Historique
    await db.runAsync(
      `INSERT INTO selection_history (recipe_id, selected_at) VALUES (?, ?)`,
      [id, today]
    );
  }
}

// ============ Statistiques ============

export async function getRecipeStats(): Promise<RecipeStats> {
  const db = getDb();
  
  // Total recettes
  const totalRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM recipes');
  const totalRecipes = totalRow?.count ?? 0;
  
  // Total sélections
  const selectionsRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM selection_history');
  const totalSelections = selectionsRow?.count ?? 0;
  
  // Par saison
  const seasonRows = await db.getAllAsync<{ season: Season; count: number }>(
    'SELECT season, COUNT(*) as count FROM recipes GROUP BY season'
  );
  const bySeason: Record<Season, number> = { hiver: 0, ete: 0, mixte: 0 };
  seasonRows.forEach(r => { bySeason[r.season] = r.count; });
  
  // Par type
  const typeRows = await db.getAllAsync<{ type: RecipeType; count: number }>(
    'SELECT type, COUNT(*) as count FROM recipes GROUP BY type'
  );
  const byType: Record<RecipeType, number> = { entree: 0, plat: 0, dessert: 0 };
  typeRows.forEach(r => { byType[r.type] = r.count; });
  
  // Top utilisées
  const topUsedRows = await db.getAllAsync<any>(
    'SELECT * FROM recipes ORDER BY times_used DESC LIMIT 5'
  );
  const topUsed = topUsedRows.map(mapRowToRecipe);
  
  // Récemment utilisées
  const recentRows = await db.getAllAsync<any>(
    'SELECT * FROM recipes WHERE last_selected IS NOT NULL ORDER BY last_selected DESC LIMIT 5'
  );
  const recentlyUsed = recentRows.map(mapRowToRecipe);
  
  // Jamais utilisées
  const neverRows = await db.getAllAsync<any>(
    'SELECT * FROM recipes WHERE times_used = 0 ORDER BY name LIMIT 10'
  );
  const neverUsed = neverRows.map(mapRowToRecipe);
  
  // Favoris
  const favRows = await db.getAllAsync<any>(
    'SELECT * FROM recipes WHERE is_favorite = 1 ORDER BY name'
  );
  const favorites = favRows.map(mapRowToRecipe);
  
  // Moyenne des notes
  const avgRow = await db.getFirstAsync<{ avg: number }>(
    'SELECT AVG(rating) as avg FROM recipes WHERE rating IS NOT NULL'
  );
  const averageRating = avgRow?.avg ?? 0;
  
  // Sélections par mois (12 derniers mois)
  const monthRows = await db.getAllAsync<{ month: string; count: number }>(`
    SELECT strftime('%Y-%m', selected_at) as month, COUNT(*) as count 
    FROM selection_history 
    WHERE selected_at >= date('now', '-12 months')
    GROUP BY month 
    ORDER BY month
  `);
  const selectionsByMonth = monthRows.map(r => ({ month: r.month, count: r.count }));
  
  return {
    totalRecipes,
    totalSelections,
    bySeason,
    byType,
    topUsed,
    recentlyUsed,
    neverUsed,
    favorites,
    averageRating,
    selectionsByMonth,
  };
}

// ============ Export / Import ============

export async function exportToJson(): Promise<string> {
  const recipes = await getAllRecipes();
  const history = await getDb().getAllAsync<SelectionHistory>('SELECT * FROM selection_history');
  return JSON.stringify({ recipes, history, exportedAt: new Date().toISOString() }, null, 2);
}

export async function importFromJson(jsonData: string): Promise<number> {
  const data = JSON.parse(jsonData);
  const recipes: Recipe[] = data.recipes || [];
  
  let imported = 0;
  for (const recipe of recipes) {
    // Vérifier si la recette existe déjà (par nom)
    const existing = await getDb().getFirstAsync<{ id: number }>(
      'SELECT id FROM recipes WHERE name = ?',
      [recipe.name]
    );
    
    if (!existing) {
      await createRecipe({
        name: recipe.name,
        season: recipe.season,
        type: recipe.type,
        frequency: recipe.frequency,
        mainIngredient: recipe.mainIngredient,
        ingredients: recipe.ingredients,
        comment: recipe.comment,
        recipeLink: recipe.recipeLink,
        rating: recipe.rating,
        isFavorite: recipe.isFavorite,
        imagePath: recipe.imagePath,
      });
      imported++;
    }
  }
  
  return imported;
}

// ============ Utilitaires ============

function mapRowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    season: row.season,
    type: row.type,
    frequency: row.frequency,
    mainIngredient: row.main_ingredient || '',
    ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
    comment: row.comment || '',
    recipeLink: row.recipe_link || '',
    timesUsed: row.times_used || 0,
    lastSelected: row.last_selected,
    rating: row.rating,
    isFavorite: row.is_favorite === 1,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
// ============ Paramètres ============

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const row = await getDb().getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', [key]
  );
  return row?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDb().runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ============ Livres de recettes ============

function mapRowToBook(row: any): RecipeBook {
  return {
    id: row.id,
    cloudId: row.cloud_id ?? null,
    name: row.name,
    description: row.description ?? '',
    icon: row.icon ?? '📖',
    color: row.color ?? '#6B8E6B',
    source: row.source ?? 'local',
    cloudVersion: row.cloud_version ?? null,
    isModified: row.is_modified === 1,
    isActive: row.is_active !== 0,
    downloadedAt: row.downloaded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllBooks(): Promise<RecipeBook[]> {
  const rows = await getDb().getAllAsync<any>('SELECT * FROM recipe_books ORDER BY name');
  return rows.map(mapRowToBook);
}

export async function getBookByCloudId(cloudId: string): Promise<RecipeBook | null> {
  const row = await getDb().getFirstAsync<any>(
    'SELECT * FROM recipe_books WHERE cloud_id = ?',
    [cloudId]
  );
  return row ? mapRowToBook(row) : null;
}

export async function createBook(data: Omit<RecipeBook, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO recipe_books (cloud_id, name, description, icon, color, source, cloud_version, is_modified, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.cloudId,
      data.name,
      data.description,
      data.icon,
      data.color,
      data.source,
      data.cloudVersion,
      data.isModified ? 1 : 0,
      data.downloadedAt,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteBook(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM recipe_books WHERE id = ?', [id]);
}

export async function markBookModified(id: number): Promise<void> {
  await getDb().runAsync(
    `UPDATE recipe_books SET is_modified = 1, updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

export async function toggleBookActive(id: number, active: boolean): Promise<void> {
  await getDb().runAsync(
    `UPDATE recipe_books SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    [active ? 1 : 0, id]
  );
}

/**
 * Retourne les recettes à afficher/utiliser en tenant compte des livres actifs.
 * - Si au moins un livre est actif : retourne les recettes dans ces livres
 *   + les recettes qui ne sont dans aucun livre.
 * - Si aucun livre actif (ou aucun livre téléchargé) : retourne toutes les recettes.
 */
export async function getDisplayRecipes(): Promise<Recipe[]> {
  const db = getDb();
  const activeCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM recipe_books WHERE is_active = 1'
  );
  if (!activeCount || activeCount.count === 0) {
    return getAllRecipes();
  }
  const rows = await db.getAllAsync<any>(`
    SELECT DISTINCT r.* FROM recipes r
    WHERE
      NOT EXISTS (SELECT 1 FROM recipe_book_assignments a WHERE a.recipe_id = r.id)
      OR EXISTS (
        SELECT 1 FROM recipe_book_assignments a
        JOIN recipe_books b ON b.id = a.book_id
        WHERE a.recipe_id = r.id AND b.is_active = 1
      )
    ORDER BY r.name
  `);
  return rows.map(mapRowToRecipe);
}

// ── Assignations recette ↔ livre ──────────────────────────────────────────

export async function getBookIdsForRecipe(recipeId: number): Promise<number[]> {
  const rows = await getDb().getAllAsync<{ book_id: number }>(
    'SELECT book_id FROM recipe_book_assignments WHERE recipe_id = ?',
    [recipeId]
  );
  return rows.map(r => r.book_id);
}

export async function setRecipeBooks(recipeId: number, bookIds: number[]): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM recipe_book_assignments WHERE recipe_id = ?', [recipeId]);
  for (const bookId of bookIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO recipe_book_assignments (recipe_id, book_id) VALUES (?, ?)',
      [recipeId, bookId]
    );
    await db.runAsync(
      `UPDATE recipe_books SET is_modified = 1, updated_at = datetime('now') WHERE id = ?`,
      [bookId]
    );
  }
}

export async function getRecipesByBook(bookId: number): Promise<Recipe[]> {
  const rows = await getDb().getAllAsync<any>(
    `SELECT r.* FROM recipes r
     JOIN recipe_book_assignments a ON a.recipe_id = r.id
     WHERE a.book_id = ?
     ORDER BY r.name`,
    [bookId]
  );
  return rows.map(mapRowToRecipe);
}

// ── Sync cloud ────────────────────────────────────────────────────────────

export async function setRecipeCloudId(localId: number, cloudId: string): Promise<void> {
  await getDb().runAsync(
    'UPDATE recipes SET cloud_id = ?, is_dirty = 0 WHERE id = ?',
    [cloudId, localId]
  );
}

export async function clearDirtyFlag(localId: number): Promise<void> {
  await getDb().runAsync('UPDATE recipes SET is_dirty = 0 WHERE id = ?', [localId]);
}

export async function getUnsyncedRecipes(): Promise<Recipe[]> {
  const rows = await getDb().getAllAsync<any>(
    'SELECT * FROM recipes WHERE is_dirty = 1'
  );
  return rows.map(r => ({ ...mapRowToRecipe(r), cloudId: r.cloud_id } as any));
}

/** Crée ou met à jour une recette locale à partir d'une recette cloud. */
export async function upsertRecipeFromCloud(data: {
  cloudId: string;
  name: string;
  season: Season;
  type: RecipeType;
  frequency: Frequency;
  mainIngredient: string;
  ingredients: string[];
  comment: string;
  recipeLink: string;
  timesUsed: number;
  lastSelected: string | null;
  rating: number | null;
  isFavorite: boolean;
}): Promise<void> {
  const db = getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM recipes WHERE cloud_id = ?',
    [data.cloudId]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE recipes SET
        name=?, season=?, type=?, frequency=?, main_ingredient=?, ingredients=?,
        comment=?, recipe_link=?, times_used=?, last_selected=?, rating=?,
        is_favorite=?, is_dirty=0, updated_at=datetime('now')
       WHERE cloud_id=?`,
      [
        data.name, data.season, data.type, data.frequency, data.mainIngredient,
        JSON.stringify(data.ingredients), data.comment, data.recipeLink,
        data.timesUsed, data.lastSelected, data.rating,
        data.isFavorite ? 1 : 0, data.cloudId,
      ]
    );
  } else {
    const result = await db.runAsync(
      `INSERT INTO recipes
        (name, season, type, frequency, main_ingredient, ingredients, comment,
         recipe_link, times_used, last_selected, rating, is_favorite, cloud_id, is_dirty)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      [
        data.name, data.season, data.type, data.frequency, data.mainIngredient,
        JSON.stringify(data.ingredients), data.comment, data.recipeLink,
        data.timesUsed, data.lastSelected, data.rating,
        data.isFavorite ? 1 : 0, data.cloudId,
      ]
    );
    // Associer aux livres si nécessaire — géré par le catalogue
    void result;
  }
}

/** Marque une recette comme modifiée offline (admin). */
export async function markRecipeDirty(localId: number): Promise<void> {
  await getDb().runAsync('UPDATE recipes SET is_dirty = 1 WHERE id = ?', [localId]);
}

// ── Export livre personnalisé ─────────────────────────────────────────────

export async function exportBookToJson(bookId: number): Promise<string> {
  const bookRow = await getDb().getFirstAsync<any>(
    'SELECT * FROM recipe_books WHERE id = ?',
    [bookId]
  );
  if (!bookRow) throw new Error('Livre introuvable');
  const book = mapRowToBook(bookRow);
  const recipes = await getRecipesByBook(bookId);
  return JSON.stringify(
    {
      book: {
        name: book.name,
        description: book.description,
        icon: book.icon,
        color: book.color,
        source: book.source,
        cloudId: book.cloudId,
        exportedAt: new Date().toISOString(),
      },
      recipes,
    },
    null,
    2
  );
}

// ============ Historique par semaine ============

export async function getHistoryByWeek(weeksCount: number = 12): Promise<WeekHistory[]> {
  const db = getDb();
  
  // Récupérer toutes les sélections des X dernières semaines
  const rows = await db.getAllAsync<{ recipe_id: number; selected_at: string }>(`
    SELECT recipe_id, selected_at 
    FROM selection_history 
    WHERE selected_at >= date('now', '-${weeksCount * 7} days')
    ORDER BY selected_at DESC
  `);
  
  // Grouper par semaine
  const weekMap = new Map<string, { start: string; end: string; recipeIds: Set<number> }>();
  
  for (const row of rows) {
    const date = new Date(row.selected_at);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
        recipeIds: new Set(),
      });
    }
    weekMap.get(weekKey)!.recipeIds.add(row.recipe_id);
  }
  
  // Récupérer les recettes pour chaque semaine
  const result: WeekHistory[] = [];
  
  for (const [weekKey, weekData] of weekMap) {
    const ids = Array.from(weekData.recipeIds);
    if (ids.length === 0) continue;
    
    const placeholders = ids.map(() => '?').join(',');
    const recipes = await db.getAllAsync<any>(
      `SELECT * FROM recipes WHERE id IN (${placeholders})`,
      ids
    );
    
    const startDate = new Date(weekData.start);
    const endDate = new Date(weekData.end);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    
    result.push({
      weekStart: weekData.start,
      weekEnd: weekData.end,
      weekLabel: `${startDate.toLocaleDateString('fr-FR', options)} - ${endDate.toLocaleDateString('fr-FR', options)}`,
      recipes: recipes.map(mapRowToRecipe),
    });
  }
  
  // Trier par date décroissante
  result.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  
  return result;
}

export async function getCurrentWeekRecipes(): Promise<Recipe[]> {
  const db = getDb();
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split('T')[0];
  
  const rows = await db.getAllAsync<{ recipe_id: number }>(`
    SELECT DISTINCT recipe_id 
    FROM selection_history 
    WHERE selected_at >= ?
  `, [mondayStr]);
  
  if (rows.length === 0) return [];
  
  const ids = rows.map(r => r.recipe_id);
  const placeholders = ids.map(() => '?').join(',');
  const recipes = await db.getAllAsync<any>(
    `SELECT * FROM recipes WHERE id IN (${placeholders})`,
    ids
  );
  
  return recipes.map(mapRowToRecipe);
}

// ── Fiche détaillée — cache local ─────────────────────────────────────────

export async function getBookRecipeCloudId(recipeId: number): Promise<number | null> {
  const row = await getDb().getFirstAsync<{ book_recipe_cloud_id: number | null }>(
    'SELECT book_recipe_cloud_id FROM recipes WHERE id = ?',
    [recipeId]
  );
  return row?.book_recipe_cloud_id ?? null;
}

export async function getCachedRecipeDetail(
  bookRecipeId: number
): Promise<{ data: string; cached_at: string } | null> {
  const row = await getDb().getFirstAsync<{ data: string; cached_at: string }>(
    'SELECT data, cached_at FROM recipe_detail_cache WHERE book_recipe_id = ?',
    [bookRecipeId]
  );
  return row ?? null;
}

export async function setCachedRecipeDetail(
  bookRecipeId: number,
  detail: RecipeDetail
): Promise<void> {
  await getDb().runAsync(
    'INSERT OR REPLACE INTO recipe_detail_cache (book_recipe_id, data, cached_at) VALUES (?, ?, ?)',
    [bookRecipeId, JSON.stringify(detail), new Date().toISOString()]
  );
}