import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid protocol');
  }
} catch (e) {
  supabaseUrl = 'https://jiinngmxhezdwkxyxkyd.supabase.co';
}
//const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Z6bmOgV6Hmacwm7i6YKaUQ_-XAvnimn';
//const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaW5uZ214aGV6ZHdreHl4a3lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIyMTM2NCwiZXhwIjoyMDk1Nzk3MzY0fQ.DXXxtlTy9FGFClcsd9I27EdFzBr8YhTRPXgwn2KZTq8'
//export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

