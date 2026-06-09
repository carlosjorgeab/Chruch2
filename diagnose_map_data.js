const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function diagnose() {
  const { data: deps } = await supabase.from('deputado').select('id, nome').limit(5);
  console.log("Available deputados:", deps.map(d => ({id: d.id, nome: d.nome})));
  
  if (deps.length === 0) return;
  const targetId = deps[0].id;
  console.log("Testing stats for deputado:", deps[0].nome);

  // Check Orcamentos (Emendas)
  const orcRes = await supabase
    .from('orcamentos')
    .select('municipio, valor, data, created_at')
    .eq('id_deputado', targetId);
  
  console.log("Orcamentos fetch status:", orcRes.error ? "ERROR: " + orcRes.error.message : "SUCCESS");
  if (orcRes.data) {
    console.log("Orcamentos count:", orcRes.data.length);
    if (orcRes.data.length > 0) {
      console.log("First orcamento sample:", orcRes.data[0]);
    }
  }

  // Check Projetos
  const projRes = await supabase
    .from('projetos')
    .select('municipio, valor_projeto, data, created_at')
    .eq('id_deputado', targetId);
    
  console.log("Projetos fetch status:", projRes.error ? "ERROR: " + projRes.error.message : "SUCCESS");
  if (projRes.data) {
    console.log("Projetos count:", projRes.data.length);
    if (projRes.data.length > 0) {
      console.log("First projeto sample:", projRes.data[0]);
    }
  }

  // Check years
  const years = new Set();
  orcRes.data?.forEach(e => {
    const d = e.data || e.created_at;
    if (d) years.add(new Date(d).getFullYear());
  });
  projRes.data?.forEach(p => {
    const d = p.data || p.created_at;
    if (d) years.add(new Date(d).getFullYear());
  });
  console.log("Computed available years:", Array.from(years));
}

diagnose();
