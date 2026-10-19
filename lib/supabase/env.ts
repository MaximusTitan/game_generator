export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/** False until .env.local is filled in (see .env.example). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
