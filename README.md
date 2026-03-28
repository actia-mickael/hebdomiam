# 🍽️ HebdoMiam

Application mobile de planification de repas hebdomadaire, développée avec **Expo** (React Native + TypeScript).

## Fonctionnalités

### 🎲 Générateur
- Tirage aléatoire de recettes pondéré par fréquence (rare / normal / fréquent)
- Filtres multi-sélection par saison et par type de plat
- Filtre par ingrédient (recherche textuelle)
- Exclusion automatique des recettes utilisées dans les 14 derniers jours
- Validation de la sélection pour enregistrer les recettes de la semaine

### 📅 Cette semaine
- Affichage des recettes sélectionnées pour la semaine en cours
- Suppression d'une recette de la semaine (avec ou sans impact sur l'historique, configurable)
- Liste de courses générée automatiquement à partir des ingrédients
  - Tri alphabétique, déduplication, compteur d'occurrences
  - Cases à cocher interactives
  - Export PDF partageable

### 📖 Livre de recettes
- Liste complète avec recherche textuelle et filtres
- Fiche recette : nom, saison, type, fréquence, ingrédients, lien web cliquable, commentaire, note (1–5 étoiles), photo
- Création, modification et suppression de recettes
- Import / export JSON

### 📊 Statistiques
- Vue d'ensemble : nombre de recettes, sélections, note moyenne, favoris
- Répartition par saison et par type (graphiques à barres)
- Top 5 des recettes les plus utilisées
- Recettes jamais sélectionnées
- Activité mensuelle (12 derniers mois)

### ⚙️ Paramètres
- Nombre de recettes à générer par défaut (1–5)
- Saison(s) pré-sélectionnée(s) au démarrage du générateur
- Comportement de suppression semaine : conserver ou effacer l'entrée historique

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Expo SDK 54 + Expo Router 6 |
| Langage | TypeScript 5.9, React 19, React Native 0.81 |
| Navigation | Expo Router (Stack) + PagerView (onglets) |
| Base de données | expo-sqlite 16 (WAL mode, on-device) |
| Images | expo-image-picker, expo-file-system |
| PDF | expo-print + expo-sharing |
| Build | EAS Build (profils dev / preview / production) |

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/actia-mickael/hebdomiam.git
cd hebdomiam

# Installer les dépendances
npm install --legacy-peer-deps

# Démarrer le serveur de développement
npx expo start --tunnel
```

Scanner le QR code avec **Expo Go** (Android / iOS).

## Build Android

```bash
# APK de test
npm run build:preview

# AAB production (Google Play)
npm run build:android
```

## Structure du projet

```
app/
  _layout.tsx          # Layout racine + init DB
  index.tsx            # Écran principal (PagerView 4 onglets)
  recette/[id].tsx     # Fiche recette (création / édition / lecture)
  parametres.tsx       # Écran paramètres
components/
  pages/
    GeneratorPage.tsx  # Onglet générateur
    HistoriquePage.tsx # Onglet semaine & historique
    LivrePage.tsx      # Onglet livre de recettes
    StatsPage.tsx      # Onglet statistiques
  CourseModal.tsx      # Modal liste de courses
  FilterBar.tsx        # Barre de filtres (simple / multi-sélection)
  RecipeCard.tsx       # Carte recette
  StarRating.tsx       # Widget notation
  TabBar.tsx           # Barre d'onglets personnalisée
services/
  database.ts          # Toutes les requêtes SQLite
  imageService.ts      # Gestion des photos
types/
  recipe.ts            # Interfaces et types partagés
constants/
  colors.ts            # Design tokens (couleurs, espacements, ombres)
```

## Licence

Projet personnel — tous droits réservés.
