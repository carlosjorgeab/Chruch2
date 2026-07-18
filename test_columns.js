const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const paths = Object.keys(data.paths || {});
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  console.log('Available RPCs:', rpcs);
  
  // Also check if execute_sql or anything exists under a different name
  const matches = rpcs.filter(r => r.includes('sql') || r.includes('exec') || r.includes('run') || r.includes('query') || r.includes('migrate'));
  console.log('Matching RPCs:', matches);
}
run();
