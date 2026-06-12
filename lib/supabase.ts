import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid protocol');
  }
} catch (e) {
  supabaseUrl = 'https://zavwqwjjzqjksnpitnqz.supabase.co';
}
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
