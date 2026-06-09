const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const { data: muns, error } = await supabase
        .from('municipio')
        .select('*, unidade_federacao!inner(sigla)')
        .eq('unidade_federacao.sigla', 'SP');
  console.log("Count fetched SP:", muns?.length, "Error:", error);
}
check();
