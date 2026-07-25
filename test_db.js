import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('patrimonio_movimentacoes').select('*').limit(1);
  console.log('patrimonio_movimentacoes', error ? 'Error: ' + error.message : 'Success');
  
  const { data: d2, error: e2 } = await supabase.from('movimentacao_patrimonio').select('*').limit(1);
  console.log('movimentacao_patrimonio', e2 ? 'Error: ' + e2.message : 'Success');
}
run();
