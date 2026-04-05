import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import { UserProfile } from '@/types/recipe';

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isSolo: boolean;
  isEmailVerified: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  isMember: false,
  isSolo: true,
  isEmailVerified: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, families(name)')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile({
          id: data.id,
          displayName: data.display_name ?? '',
          familyId: data.family_id ?? null,
          familyName: (data.families as any)?.name ?? null,
          role: data.role ?? 'solo',
          createdAt: data.created_at,
        });
      } else if (error?.code === 'PGRST116') {
        // Profil absent (supprimé manuellement) — on le recrée
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const displayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Utilisateur';
          await supabase.from('profiles').upsert({
            id: userId,
            display_name: displayName,
            role: 'solo',
          });
          setProfile({
            id: userId,
            displayName: displayName,
            familyId: null,
            familyName: null,
            role: 'solo',
            createdAt: new Date().toISOString(),
          });
        }
      }
      // Autres erreurs (réseau, RLS) — on ignore sans écraser le profil existant
    } catch {
      // erreur réseau — on ignore
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Timeout de sécurité — si tout plante, on débloque après 8s
    const safetyTimeout = setTimeout(() => setIsLoading(false), 8000);

    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        });
      } else {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      }
    }).catch(() => {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
    });

    // Écouter les changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Rafraîchir la session quand l'app revient au premier plan
    // (utile pour détecter la vérification d'e-mail faite dans le navigateur)
    const appStateSub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          await fetchProfile(data.session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        isAdmin: profile?.role === 'admin',
        isMember: profile?.role === 'member',
        isSolo: !profile || profile.role === 'solo',
        isEmailVerified: !!(session?.user?.email_confirmed_at),
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
