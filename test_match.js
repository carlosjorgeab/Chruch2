const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const { data: orcs } = await supabase.from('orcamentos').select('municipio').limit(10);
  
  const { data: uf } = await supabase.from('unidade_federacao').select('id').eq('sigla', 'RS').single();
  const { data: muns } = await supabase.from('municipio').select('*, unidade_federacao(sigla)').eq('id_uf', uf.id).limit(10);
  
  orcs.forEach(o => {
     let matched = muns.some(m => `${m.nome} - ${m.unidade_federacao.sigla}` === o.municipio);
     console.log(`Orcamento: '${o.municipio}' -> Matched in top 10? ${matched}`);
     const matchFull = muns.find(m => o.municipio && o.municipio.startsWith(m.nome));
     if(matchFull) console.log(`  Close match: '${matchFull.nome} - ${matchFull.unidade_federacao.sigla}'`);
  });
}
check();
