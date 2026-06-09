const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");

async function check() {
  const { data: dep } = await supabase.from('deputado').select('id, nome, estado').limit(5);
  console.log("Deputados:", dep);
}
check();
