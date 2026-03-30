/**
 * Import d'un livre de recettes JSON dans Supabase.
 * Usage : node import-book.js <chemin-vers-le-fichier.json>
 *
 * Format JSON attendu :
 * {
 *   "bookName": "Je fais attention",
 *   "bookDescription": "...",
 *   "recipes": [
 *     { "name": "...", "season": "ete", "type": "entree", "frequency": "normal",
 *       "mainIngredient": "...", "ingredients": [...], "comment": "...", "recipeLink": "" }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Lecture du .env sans dépendance externe ───────────────────────────────
function readEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    const env = {};
    for (const line of lines) {
      const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

// ── Dériver l'ID du livre depuis son nom ──────────────────────────────────
function toBookId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Import principal ──────────────────────────────────────────────────────
async function importBook(jsonFile) {
  const env = readEnv();
  const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY     || process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Manque EXPO_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_KEY dans .env');
    process.exit(1);
  }

  // Créer le client avec la service_role key (bypass RLS)
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Lire le fichier JSON
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.resolve(jsonFile), 'utf8'));
  } catch (e) {
    console.error(`❌  Impossible de lire le fichier : ${e.message}`);
    process.exit(1);
  }

  if (!data.bookName || !Array.isArray(data.recipes)) {
    console.error('❌  Format JSON invalide. Attendu : { bookName, recipes: [...] }');
    process.exit(1);
  }

  const bookId = toBookId(data.bookName);
  console.log(`\n📖  Livre    : ${data.bookName}`);
  console.log(`🔑  Book ID  : ${bookId}`);
  console.log(`📋  Recettes : ${data.recipes.length}\n`);

  // Vérifier que le livre existe dans la table books
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, name')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    console.error(`❌  Livre "${bookId}" introuvable dans la table books.`);
    console.error(`    Vérifiez que l'INSERT du livre a bien été exécuté dans Supabase.`);
    process.exit(1);
  }

  console.log(`✅  Livre trouvé dans Supabase : "${book.name}"\n`);

  // Supprimer les recettes existantes pour éviter les doublons
  const { error: deleteError } = await supabase
    .from('book_recipes')
    .delete()
    .eq('book_id', bookId);

  if (deleteError) {
    console.warn(`⚠️   Nettoyage préalable échoué : ${deleteError.message}`);
  }

  // Insérer les recettes
  let success = 0;
  let errors = 0;

  for (const recipe of data.recipes) {
    if (!recipe.name || !recipe.season || !recipe.type) {
      console.warn(`⚠️   Recette ignorée (champs obligatoires manquants) : ${JSON.stringify(recipe).slice(0, 60)}`);
      errors++;
      continue;
    }

    const { error } = await supabase.from('book_recipes').insert({
      book_id:         bookId,
      name:            recipe.name,
      season:          recipe.season,
      type:            recipe.type,
      frequency:       recipe.frequency || 'normal',
      main_ingredient: recipe.mainIngredient || '',
      ingredients:     JSON.stringify(recipe.ingredients || []),
      comment:         recipe.comment || '',
      recipe_link:     recipe.recipeLink || '',
    });

    if (error) {
      console.error(`❌  "${recipe.name}" → ${error.message}`);
      errors++;
    } else {
      console.log(`   ✅  ${recipe.name}`);
      success++;
    }
  }

  // Mettre à jour recipe_count dans books
  await supabase
    .from('books')
    .update({ recipe_count: success })
    .eq('id', bookId);

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅  Importées  : ${success}`);
  if (errors > 0) console.log(`❌  Erreurs    : ${errors}`);
  console.log(`─────────────────────────────────────\n`);
}

// ── Point d'entrée ────────────────────────────────────────────────────────
const jsonFile = process.argv[2];
if (!jsonFile) {
  console.error('Usage : node import-book.js <chemin-vers-le-fichier.json>');
  console.error('Ex    : node import-book.js "je-fais-attention.json"');
  process.exit(1);
}

importBook(jsonFile).catch(e => {
  console.error('Erreur inattendue :', e.message);
  process.exit(1);
});
