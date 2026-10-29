import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase client is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.');
  }

  // Always return to the canonical store URL: Supabase only honours redirect URLs on its
  // allow list, and Vercel preview/alias hosts aren't on it.
  const origin =
    process.env.NEXT_PUBLIC_STORE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://razorpay-retufoods.vercel.app');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin.replace(/\/$/, '')}/store/account/login`,
    },
  });

  if (error) throw error;
  return data;
}
