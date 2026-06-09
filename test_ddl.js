const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://zavwqwjjzqjksnpitnqz.supabase.co", "sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2", {
    auth: {
        persistSession: false
    }
});

async function createMigration() {
    const { error } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE projetos ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;`
    });
    if(error) console.log("Missing execute_sql, running fallback...");
    
    // since I can't run DDL via REST if execute_sql is not defined... Wait, maybe I can just insert through a custom rest call? NO, I don't have the service key.
    console.log("We need to know if we can run raw sql.");
}
createMigration();
