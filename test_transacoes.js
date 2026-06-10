const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2");
supabase.from('transacoes').select('*').limit(1).then(res => console.log(JSON.stringify(res)));
