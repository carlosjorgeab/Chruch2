const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/membros?limit=1`;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await res.json();
    console.log('Sample row columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in table');
    console.log('Sample row content:', data[0]);
  } catch (err) {
    console.error('Error fetching columns:', err);
  }
}
run();
