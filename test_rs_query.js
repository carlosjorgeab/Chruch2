const { createClient } = require('@supabase/supabase-js');

const sbUrl = "https://zavwqwjjzqjksnpitnqz.supabase.co";
const sbKey = "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2";
const supabase = createClient(sbUrl, sbKey);

async function testQuery() {
  const { data: pop, error: popErr } = await supabase
    .from('municipio')
    .select('nome, populacao, unidade_federacao!inner(sigla)')
    .eq('unidade_federacao.sigla', 'RS');
    
  if (popErr) console.error(popErr);
  else console.log(`Got ${pop?.length} RS municipalities with populations.`);
  
  let qOrc = supabase.from('orcamentos').select('municipio, valor').like('municipio', '%- RS');
  const { data: orc, error: eOrc } = await qOrc;
  if(eOrc) console.error(eOrc);
  else console.log(`Got ${orc?.length} orcamentos for RS`);

  let qProj = supabase.from('projetos').select('municipio, valor_projeto').like('municipio', '%- RS');
  const { data: proj, error: eProj } = await qProj;
  if(eProj) console.error(eProj);
  else console.log(`Got ${proj?.length} projetos for RS`);
}
testQuery();
