import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URLtUrl;
  }
} catch (e) {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

if (!supabaseKey) {
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const supabase = createClient(supabaseUrl, supabaseKey);



