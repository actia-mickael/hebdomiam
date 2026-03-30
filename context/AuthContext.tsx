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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile({
          id: data.id,
          displayName: data.display_name ?? '',
          familyId: data.family_id ?? null,
          role: data.role ?? 'solo',
          createdAt: data.created_at,
        });
      }
    } catch {
      // profil pas encore créé ou erreur réseau — on ignore
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
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
