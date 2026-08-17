import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

const fallbackUrl = 'https://jiinngmxhezdwkxyxkyd.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaW5uZ214aGV6ZHdreHl4a3lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIyMTM2NCwiZXhwIjoyMDk1Nzk3MzY0fQ.DXXxtlTy9FGFClcsd9I27EdFzBr8YhTRPXgwn2KZTq8';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getValidUrl(url: string | undefined): string {
  if (!url) return fallbackUrl;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {}
  return fallbackUrl;
}

const validUrl = getValidUrl(envUrl);
const validKey = envKey || fallbackKey;

export const supabase = createClient(validUrl, validKey);
