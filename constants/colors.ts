// Palette bleu/cyan — Thème culinaire
export const Colors = {
  // Couleurs principales
  primary: '#29B6F6',        // Sky blue
  primaryDark: '#0277BD',    // Deep ocean blue
  primaryLight: '#B3E5FC',   // Ice blue
  primarySurface: '#E1F5FE', // Très léger pour backgrounds actifs

  // Arrière-plans
  background: '#EEF7FF',     // Blanc bleuté doux
  backgroundAlt: '#E4F1FB',  // Bleu pâle
  surface: '#FFFFFF',        // Blanc pur
  surfaceAlt: '#F7FBFF',     // Blanc légèrement bleuté

  // Textes
  text: '#1B3B6F',           // Bleu marine profond (lisible)
  textSecondary: '#4A6B8A',  // Bleu-gris medium
  textLight: '#8FA3B8',      // Gris bleuté discret

  // Accents
  accent: '#00BCD4',         // Turquoise
  accentLight: '#80DEEA',    // Turquoise clair

  // Saisons — plus saturées pour les accents visuels
  seasonHiver: '#64B5F6',    // Bleu vif
  seasonEte: '#FFB74D',      // Ambre chaud
  seasonMixte: '#66BB6A',    // Vert naturel

  // Fonds placeholder par type (plus riches)
  typeBgEntree: '#F3E8FF',   // Violet très pâle
  typeBgPlat: '#FFF0E8',     // Pêche très pâle
  typeBgDessert: '#FFF0F5',  // Rose très pâle

  // Types de plats
  typeEntree: '#CE93D8',     // Violet pastel
  typePlat: '#FFAB91',       // Corail pastel
  typeDessert: '#F48FB1',    // Rose pastel

  // Fréquences
  freqRare: '#FFCDD2',
  freqNormal: '#FFF9C4',
  freqFrequent: '#C8E6C9',

  // États
  success: '#43A047',        // Vert plus profond
  warning: '#FB8C00',        // Orange vif
  error: '#E53935',          // Rouge
  favorite: '#FF5722',       // Orange brûlé

  // Structure
  shadow: 'rgba(2, 119, 189, 0.12)',
  border: '#CBE4F5',
  divider: '#E4EFF9',

  // Étoiles
  starFilled: '#FFC107',
  starEmpty: '#D8E3ED',
};

// Ombres — plus profondes et réalistes
export const Shadows = {
  small: {
    shadowColor: '#1B3B6F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1B3B6F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#1B3B6F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    shadowColor: '#1B3B6F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
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
