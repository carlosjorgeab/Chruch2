import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid protocol');
  }
} catch (e) {
  supabaseUrl = 'https://jiinngmxhezdwkxyxkyd.supabase.co';
}
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Z6bmOgV6Hmacwm7i6YKaUQ_-XAvnimn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
