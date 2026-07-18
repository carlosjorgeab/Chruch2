import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS juros NUMERIC(15, 2) DEFAULT 0;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS acrescimos NUMERIC(15, 2) DEFAULT 0;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(15, 2) DEFAULT 0;
    
    -- Update existing rows if valor_pago is null/0 to default to valor
    UPDATE transacoes SET juros = 0 WHERE juros IS NULL;
    UPDATE transacoes SET acrescimos = 0 WHERE acrescimos IS NULL;
    UPDATE transacoes SET valor_pago = valor WHERE valor_pago IS NULL OR valor_pago = 0;
  `;

  console.log('Attempting to execute migration SQL...');
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.log('execute_sql with "sql_query" failed, trying with "query" or "sql" parameter...', error);
    
    // Let's try key "sql" as in test_ddl.js
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { query: sql });
    if (error2) {
      const { data: data3, error: error3 } = await supabase.rpc('execute_sql', { sql: sql });
      if (error3) {
        console.error('Migration failed. "execute_sql" RPC is likely not available or has different parameters:', error3);
      } else {
        console.log('Migration succeeded using "sql" parameter!', data3);
      }
    } else {
      console.log('Migration succeeded using "query" parameter!', data2);
    }
  } else {
    console.log('Migration succeeded using "sql_query" parameter!', data);
  }
}

run();
