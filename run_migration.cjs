const supabaseUrl = 'https://jiinngmxhezdwkxyxkyd.supabase.co';
const anonKey = 'sb_publishable_Z6bmOgV6Hmacwm7i6YKaUQ_-XAvnimn';

const migrationSql = `
ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS assinatura_vigencia DATE;
`;

async function main() {
  console.log("Running migration on real database:", supabaseUrl);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`
      },
      body: JSON.stringify({ sql: migrationSql })
    });
    const status = res.status;
    console.log("Response status:", status);
    const json = await res.json();
    console.log("Response body:", json);
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}
main();
