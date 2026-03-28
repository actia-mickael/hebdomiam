import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}recipe-images/`;

// Initialiser le dossier d'images
export async function initImageDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

// Demander les permissions caméra
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

// Demander les permissions galerie
export async function requestMediaPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

// Prendre une photo avec la caméra
export async function takePhoto(): Promise<string | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    throw new Error('Permission caméra refusée');
  }
  
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  
  return await saveImage(result.assets[0].uri);
}

// Sélectionner une image depuis la galerie
export async function pickImage(): Promise<string | null> {
  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) {
    throw new Error('Permission galerie refusée');
  }
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  
  return await saveImage(result.assets[0].uri);
}

// Sauvegarder l'image dans le dossier de l'app
async function saveImage(uri: string): Promise<string> {
  await initImageDirectory();
  
  const filename = `recipe_${Date.now()}.jpg`;
  const destination = `${IMAGES_DIR}${filename}`;
  
  await FileSystem.copyAsync({
    from: uri,
    to: destination,
  });
  
  return destination;
}

// Supprimer une image
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(imagePath);
    if (info.exists) {
      await FileSystem.deleteAsync(imagePath);
    }
  } catch (error) {
    console.warn('Erreur suppression image:', error);
  }
}

// Vérifier si une image existe
export async function imageExists(imagePath: string | null): Promise<boolean> {
  if (!imagePath) return false;
  try {
    const info = await FileSystem.getInfoAsync(imagePath);
    return info.exists;
  } catch {
    return false;
  }
}

// Obtenir toutes les images du dossier
export async function getAllImages(): Promise<string[]> {
  try {
    await initImageDirectory();
    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    return files.map(f => `${IMAGES_DIR}${f}`);
  } catch {
    return [];
  }
}

// Nettoyer les images orphelines (non liées à une recette)
export async function cleanOrphanImages(usedPaths: string[]): Promise<number> {
  const allImages = await getAllImages();
  let deleted = 0;
  
  for (const imagePath of allImages) {
    if (!usedPaths.includes(imagePath)) {
      await deleteImage(imagePath);
      deleted++;
    }
  }
  
  return deleted;
}
