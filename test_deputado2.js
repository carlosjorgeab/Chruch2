const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].replace(/['"]/g, ''), keyMatch[1].replace(/['"]/g, ''));

async function run() {
  const { data, error } = await supabase.from('deputados').select('nome, estado').limit(5);
  console.log(data, error);
}
run();
