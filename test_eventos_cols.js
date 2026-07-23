const urlEventos = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/eventos?limit=1`;
const urlAgendas = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agendas?limit=1`;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  try {
    const resE = await fetch(urlEventos, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const dataE = await resE.json();
    console.log('Eventos columns:', dataE.length > 0 ? Object.keys(dataE[0]) : 'No data or empty');
    console.log('Eventos sample:', dataE[0]);

    const resA = await fetch(urlAgendas, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const dataA = await resA.json();
    console.log('Agendas columns:', dataA.length > 0 ? Object.keys(dataA[0]) : 'No data or empty');
    console.log('Agendas sample:', dataA[0]);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
