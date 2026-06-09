const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const sbUrl = "https://zavwqwjjzqjksnpitnqz.supabase.co";
const sbKey = "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2"; // as in lib/supabase.ts
const supabase = createClient(sbUrl, sbKey);

async function check() {
  const { data: projs } = await supabase.from('projetos').select('municipio, valor_projeto').limit(10);
  console.log("Projetos originais: ", projs);

  const { data: emendas } = await supabase.from('orcamentos').select('municipio, valor').limit(10);
  console.log("Emendas originais: ", emendas);

  const { data: muns } = await supabase.from('municipio').select('nome, populacao').eq('id_uf', 'b18d2d46-a4da-443b-bd98-db62ce9d0bde').limit(5); 
  // Wait, I dont know uf ID for RS. Let's get RS UF id.
  const { data: uf } = await supabase.from('unidade_federacao').select('id').eq('sigla', 'RS').single();
  
  if (uf) {
     const { data: rsMuns } = await supabase.from('municipio').select('nome, populacao').eq('id_uf', uf.id).limit(5);
     console.log("Municipios RS originais: ", rsMuns);
  }
}
check();
