import { supabase } from '@/config/supabase';
import { Family, FamilyMember } from '@/types/recipe';

// ── Authentification ──────────────────────────────────────────────────────

const EMAIL_REDIRECT = 'recettes://auth/callback';

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: EMAIL_REDIRECT,
    },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Email not confirmed')) {
      throw new Error('E-mail non vérifié. Consultez votre boîte mail.');
    }
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('E-mail ou mot de passe incorrect.');
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: EMAIL_REDIRECT },
  });
  if (error) throw error;
}

// ── Famille ───────────────────────────────────────────────────────────────

export async function createFamily(name: string, userId: string): Promise<Family> {
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name, owner_id: userId })
    .select()
    .single();
  if (familyError) throw familyError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ family_id: family.id, role: 'admin' })
    .eq('id', userId);
  if (profileError) throw profileError;

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    ownerId: family.owner_id,
    createdAt: family.created_at,
  };
}

export async function joinFamily(inviteCode: string, userId: string): Promise<Family> {
  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('*')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (familyError || !family) {
    throw new Error('Code famille invalide. Vérifiez le code et réessayez.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ family_id: family.id, role: 'member' })
    .eq('id', userId);
  if (profileError) throw profileError;

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    ownerId: family.owner_id,
    createdAt: family.created_at,
  };
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  };
}

export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .eq('family_id', familyId);
  if (error) throw error;
  return data ?? [];
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ family_id: null, role: 'solo' })
    .eq('id', memberId);
  if (error) throw error;
}

export async function leaveFamily(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ family_id: null, role: 'solo' })
    .eq('id', userId);
  if (error) throw error;
}
