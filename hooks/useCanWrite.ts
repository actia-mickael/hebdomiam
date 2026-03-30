import { useState, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { checkOnline } from '@/config/supabase';

/**
 * Retourne true si l'utilisateur peut effectuer des modifications :
 * - Admin : toujours (offline = modifications sauvegardées localement)
 * - Membre : uniquement en ligne
 * - Solo : toujours
 */
export function useCanWrite() {
  const { isAdmin, isMember } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isMember) return; // pas besoin de checker pour admin/solo

    checkOnline().then(setIsOnline);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkOnline().then(setIsOnline);
    });
    return () => sub.remove();
  }, [isMember]);

  const canWrite = !isMember || isOnline;

  /**
   * Exécute une action si l'écriture est autorisée.
   * Sinon affiche une alerte "Connexion requise".
   */
  const guardWrite = (action: () => void) => {
    if (canWrite) {
      action();
    } else {
      Alert.alert(
        '📡 Connexion requise',
        'Les membres ne peuvent modifier les données qu\'en ligne.\n\nVérifiez votre connexion internet.'
      );
    }
  };

  return { canWrite, isOnline, guardWrite };
}
