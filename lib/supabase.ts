import { createClient } from '@supabase/supabase-js';

const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const defaultKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getValidUrl(url: string | undefined): string {
  if (!url) return defaultUrl;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {}
  return defaultUrl;
}

const validUrl = getValidUrl(supabaseUrl);
const validKey = supabaseKey || defaultKey;

export const supabase = createClient(validUrl, validKey);
