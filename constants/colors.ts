// Palette pastel bleu/cyan - Thème culinaire
export const Colors = {
  // Couleurs principales
  primary: '#4FC3F7',        // Cyan clair
  primaryDark: '#0288D1',    // Cyan foncé
  primaryLight: '#B3E5FC',   // Cyan très clair
  
  // Arrière-plans
  background: '#E3F2FD',     // Bleu pastel très clair
  backgroundAlt: '#E1F5FE',  // Bleu glacier
  surface: '#FFFFFF',        // Blanc
  surfaceAlt: '#F5FBFF',     // Blanc bleuté
  
  // Textes
  text: '#1A237E',           // Bleu marine foncé
  textSecondary: '#5C6BC0',  // Bleu indigo
  textLight: '#90A4AE',      // Gris bleuté
  
  // Accents
  accent: '#00BCD4',         // Turquoise
  accentLight: '#80DEEA',    // Turquoise clair
  
  // Saisons
  seasonHiver: '#81D4FA',    // Bleu glacier
  seasonEte: '#FFCC80',      // Orange pastel
  seasonMixte: '#A5D6A7',    // Vert pastel
  
  // Types de plats
  typeEntree: '#CE93D8',     // Violet pastel
  typePlat: '#FFAB91',       // Corail pastel
  typeDessert: '#F48FB1',    // Rose pastel
  
  // Fréquences
  freqRare: '#FFCDD2',       // Rouge pastel
  freqNormal: '#FFF9C4',     // Jaune pastel
  freqFrequent: '#C8E6C9',   // Vert pastel
  
  // États
  success: '#66BB6A',        // Vert
  warning: '#FFA726',        // Orange
  error: '#EF5350',          // Rouge
  favorite: '#FF7043',       // Orange corail
  
  // Ombres et bordures
  shadow: 'rgba(33, 150, 243, 0.15)',
  border: '#B3E5FC',
  divider: '#E1F5FE',
  
  // Étoiles rating
  starFilled: '#FFD54F',     // Jaune doré
  starEmpty: '#E0E0E0',      // Gris clair
};

// Ombres prédéfinies
export const Shadows = {
  small: {
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Espacements
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Rayons de bordure
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
