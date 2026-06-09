const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const { data: uf } = await supabase.from('unidade_federacao').select('id').eq('sigla', 'SP').single();
  const { data: muns } = await supabase.from('municipio').select('*, unidade_federacao(sigla)').eq('id_uf', uf.id).limit(5);
  console.log("Municipios SP:", JSON.stringify(muns, null, 2));
}
check();
