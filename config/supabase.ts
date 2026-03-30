const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function supabaseGet<T>(table: string, query: string = ''): Promise<T[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configuré. Vérifiez vos variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env');
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${query ? '&' + query : ''}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur Supabase (${response.status}): ${text}`);
  }
  return response.json() as Promise<T[]>;
}
