/**
 * Import de fiches détaillées de recettes dans Supabase.
 *
 * Usage :
 *   node import-details.js <fichier.json>           — importe les fiches
 *   node import-details.js --list [book_id]         — liste les book_recipes avec leurs IDs
 *
 * Format JSON attendu (tableau) :
 * [
 *   {
 *     "book_recipe_id": 12,          ← ID entier de book_recipes (voir --list)
 *     "prep_time": 15,               ← minutes (ou null)
 *     "cook_time": 25,
 *     "rest_time": null,
 *     "servings": 4,
 *     "difficulty": "facile",        ← "facile" | "moyen" | "difficile"
 *     "ingredients": [
 *       { "qty": "500", "unit": "g", "label": "carottes", "group": "légumes" }
 *     ],
 *     "steps": [
 *       { "order": 1, "title": "Préparation", "text": "..." }
 *     ],
 *     "photos": ["nom-du-livre/nom-recette/main.jpg"],
 *     "tips": "Conseils facultatifs",
 *     "source_url": "https://...",
 *     "nutrition": { "calories": 95, "proteines": 2, "glucides": 15, "lipides": 4 }
 *   }
 * ]
 */

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Lecture du .env sans dépendance externe ───────────────────────────────
function readEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    const env = {};
    for (const line of lines) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
    return env;
  } catch { return {}; }
}

function getSupabase() {
  const env = readEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY     || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('❌  Manque EXPO_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_KEY dans .env');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Lister les book_recipes (pour trouver les IDs) ────────────────────────
async function listBookRecipes(bookId) {
  const supabase = getSupabase();

  let query = supabase
    .from('book_recipes')
    .select('id, book_id, name')
    .order('book_id')
    .order('name');

  if (bookId) query = query.eq('book_id', bookId);

  const { data, error } = await query;
  if (error) { console.error('❌', error.message); process.exit(1); }

  if (!data.length) {
    console.log('Aucune recette trouvée' + (bookId ? ` dans le livre "${bookId}"` : ''));
    return;
  }

  // Grouper par livre
  const byBook = {};
  for (const r of data) {
    if (!byBook[r.book_id]) byBook[r.book_id] = [];
    byBook[r.book_id].push(r);
  }

  for (const [book, recipes] of Object.entries(byBook)) {
    console.log(`\n📖  ${book}`);
    console.log('─'.repeat(60));
    for (const r of recipes) {
      console.log(`  ID ${String(r.id).padStart(4)}  ${r.name}`);
    }
  }
  console.log('\n✅ = fiche détaillée déjà présente\n');
}

// ── Import principal ──────────────────────────────────────────────────────
async function importDetails(jsonFile) {
  const supabase = getSupabase();

  let items;
  try {
    items = JSON.parse(fs.readFileSync(path.resolve(jsonFile), 'utf8'));
  } catch (e) {
    console.error(`❌  Impossible de lire le fichier : ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(items)) {
    console.error('❌  Le fichier doit contenir un tableau JSON : [{ book_recipe_id, ... }]');
    process.exit(1);
  }

  console.log(`\n📋  ${items.length} fiche(s) à importer\n`);

  let success = 0;
  let errors  = 0;

  for (const item of items) {
    if (!item.book_recipe_id) {
      console.warn(`⚠️   Entrée ignorée — book_recipe_id manquant : ${JSON.stringify(item).slice(0, 60)}`);
      errors++;
      continue;
    }

    // Vérifier que la book_recipe existe
    const { data: br } = await supabase
      .from('book_recipes')
      .select('id, name, book_id')
      .eq('id', item.book_recipe_id)
      .single();

    if (!br) {
      console.error(`❌  book_recipe_id ${item.book_recipe_id} introuvable dans book_recipes`);
      errors++;
      continue;
    }

    // Upsert direct dans recipe_details
    const { error: detailError } = await supabase
      .from('recipe_details')
      .upsert({
        book_recipe_id: item.book_recipe_id,
        prep_time:      item.prep_time      ?? null,
        cook_time:      item.cook_time      ?? null,
        rest_time:      item.rest_time      ?? null,
        servings:       item.servings       ?? null,
        difficulty:     item.difficulty     ?? null,
        ingredients:    item.ingredients    ?? [],
        steps:          item.steps          ?? [],
        photos:         item.photos         ?? [],
        tips:           item.tips           ?? null,
        source_url:     item.source_url     ?? null,
        nutrition:      item.nutrition      ?? null,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'book_recipe_id' });

    if (detailError) {
      console.error(`❌  [${br.book_id}] "${br.name}" → ${detailError.message}`);
      errors++;
      continue;
    }

    // Marquer has_detail = true dans book_recipes
    await supabase
      .from('book_recipes')
      .update({ has_detail: true })
      .eq('id', item.book_recipe_id);

    console.log(`   ✅  [${br.book_id}] ${br.name}`);
    success++;
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅  Importées  : ${success}`);
  if (errors > 0) console.log(`❌  Erreurs    : ${errors}`);
  console.log(`─────────────────────────────────────\n`);
}

// ── Point d'entrée ────────────────────────────────────────────────────────
const arg = process.argv[2];

if (!arg) {
  console.error('Usage :');
  console.error('  node import-details.js <fichier.json>      — importer des fiches');
  console.error('  node import-details.js --list              — lister tous les book_recipes');
  console.error('  node import-details.js --list au-quotidien — lister un livre précis');
  process.exit(1);
}

if (arg === '--list') {
  const bookId = process.argv[3] || null;
  listBookRecipes(bookId).catch(e => { console.error(e.message); process.exit(1); });
} else {
  importDetails(arg).catch(e => { console.error('Erreur inattendue :', e.message); process.exit(1); });
}
