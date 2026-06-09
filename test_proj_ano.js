const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const res = await supabase.from('projetos').select('ano').limit(1);
  console.log("Projetos fields ano:", JSON.stringify(res));
}
check();
