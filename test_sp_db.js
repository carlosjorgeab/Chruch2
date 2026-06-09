const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const { data: uf } = await supabase.from('unidade_federacao').select('id, sigla').eq('sigla', 'SP').single();
  console.log("UF SP:", uf);
  if (uf) {
     const { data: spMuns, error } = await supabase.from('municipio').select('nome, populacao').eq('id_uf', uf.id);
     if (error) console.error("Error getting SP muns:", error.message);
     console.log(`SP has ${spMuns?.length} municipalities in DB.`);
  }
}
check();
