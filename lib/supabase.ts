import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://jiinngmxhezdwkxyxkyd.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaW5uZ214aGV6ZHdreHl4a3lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIyMTM2NCwiZXhwIjoyMDk1Nzk3MzY0fQ.DXXxtlTy9FGFClcsd9I27EdFzBr8YhTRPXgwn2KZTq8';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    supabaseUrl = defaultUrl;
  }
} catch (e) {
  supabaseUrl = defaultUrl;
}

if (!supabaseKey) {
  supabaseKey = defaultKey;
}

export const supabase = createClient(supabaseUrl, supabaseKey);
